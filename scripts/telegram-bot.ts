import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { Bot } from 'grammy';
import 'dotenv/config';

const token = process.env.TELEGRAM_BOT_TOKEN;
const allowedUserId = process.env.ALLOWED_TELEGRAM_USER_ID;
if (!token) throw new Error('TELEGRAM_BOT_TOKEN is required. Put it into .env, never commit it.');
if (!allowedUserId) throw new Error('ALLOWED_TELEGRAM_USER_ID is required.');

const bot = new Bot(token);
const root = process.cwd();
const rawDir = path.join(root, 'data/raw');
const canonicalRawPath = path.join(rawDir, 'Олексієнко.xlsx');

function ensureAllowed(userId?: number) {
  return String(userId ?? '') === allowedUserId;
}

function run(command: string, args: string[]) {
  return execFileSync(command, args, { cwd: root, encoding: 'utf8', stdio: 'pipe' });
}

function processedSummary() {
  const metaPath = path.join(root, 'data/processed/meta.json');
  if (!fs.existsSync(metaPath)) return 'meta.json пока не создан.';
  const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8')) as {
    sourceFiles?: string[];
    counts?: { sales: number; groupPlans: number; receivables: number };
    dateRange?: { from: string; to: string } | null;
    months?: string[];
  };
  return [
    `Источник: ${meta.sourceFiles?.join(', ') || 'не указан'}`,
    `Период: ${meta.dateRange ? `${meta.dateRange.from} — ${meta.dateRange.to}` : 'не найден'}`,
    `Месяцы: ${meta.months?.join(', ') || 'не найдены'}`,
    `Строки: sales=${meta.counts?.sales ?? 0}, groupPlan=${meta.counts?.groupPlans ?? 0}, receivables=${meta.counts?.receivables ?? 0}`
  ].join('\n');
}

async function downloadTelegramFile(fileId: string, targetPath: string) {
  const file = await bot.api.getFile(fileId);
  if (!file.file_path) throw new Error('Telegram did not return file_path.');
  const response = await fetch(`https://api.telegram.org/file/bot${token}/${file.file_path}`);
  if (!response.ok) throw new Error(`Cannot download Telegram file: ${response.status}`);
  fs.writeFileSync(targetPath, Buffer.from(await response.arrayBuffer()));
}

bot.command('start', async (ctx) => {
  if (!ensureAllowed(ctx.from?.id)) return ctx.reply('⛔ Access denied.');
  await ctx.reply([
    'Готов принимать Excel-файл.',
    'Что я сделаю:',
    '1) сохраню файл как data/raw/Олексієнко.xlsx',
    '2) сконвертирую Excel → data/processed/*.json',
    '3) переименую raw-файл по периоду, например Олексієнко_01.05-18.05.xlsx',
    '4) если настроены GITHUB_TOKEN/GITHUB_REPO — закоммичу и запушу обновление.'
  ].join('\n'));
});

bot.on('message:document', async (ctx) => {
  if (!ensureAllowed(ctx.from?.id)) return ctx.reply('⛔ Access denied.');
  const document = ctx.message.document;
  const fileName = document.file_name ?? 'upload.xlsx';
  if (!/\.xlsx?$/i.test(fileName)) return ctx.reply('Пришлите Excel-файл .xlsx или .xls.');

  try {
    fs.mkdirSync(rawDir, { recursive: true });
    await ctx.reply(`📥 Принял файл: ${fileName}\nСохраняю как data/raw/Олексієнко.xlsx...`);
    await downloadTelegramFile(document.file_id, canonicalRawPath);

    await ctx.reply('⚙️ Файл сохранён. Конвертирую Excel → JSON...');
    run('npm', ['run', 'process:data']);
    run('npm', ['run', 'audit:data']);
    await ctx.reply(`✅ Конвертация готова.\n${processedSummary()}`);

    if (process.env.GITHUB_TOKEN && process.env.GITHUB_REPO) {
      await ctx.reply('🚀 Делаю commit/push в GitHub...');
      run('npm', ['run', 'commit:data']);
      await ctx.reply('✅ GitHub обновлён. GitHub Pages подтянет свежий dashboard.');
    } else {
      await ctx.reply('ℹ️ GITHUB_TOKEN/GITHUB_REPO не заданы — JSON обновлён локально, push пропущен.');
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await ctx.reply(`❌ Ошибка обработки файла:\n${message}`);
  }
});

bot.start();
