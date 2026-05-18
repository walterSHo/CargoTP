import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { Bot } from 'grammy';
import 'dotenv/config';
import type { FileType } from '../lib/types';

const token = process.env.TELEGRAM_BOT_TOKEN;
const allowedUserId = process.env.ALLOWED_TELEGRAM_USER_ID;
if (!token) throw new Error('TELEGRAM_BOT_TOKEN is required.');
if (!allowedUserId) throw new Error('ALLOWED_TELEGRAM_USER_ID is required.');

const bot = new Bot(token);
const rawDir = path.join(process.cwd(), 'data/raw');
const sessions = new Map<number, Partial<Record<FileType, string>>>();

function detectFileType(fileName: string): FileType | null {
  const normalized = fileName.toLowerCase();
  if (normalized.includes('sales') || normalized.includes('продаж')) return 'sales';
  if (normalized.includes('group') || normalized.includes('plan') || normalized.includes('груп')) return 'groupPlan';
  if (normalized.includes('receivable') || normalized.includes('debt') || normalized.includes('дебитор')) return 'receivables';
  return null;
}

function run(cmd: string, args: string[]) {
  execFileSync(cmd, args, { stdio: 'inherit' });
}

bot.command('start', async (ctx) => {
  if (String(ctx.from?.id) !== allowedUserId) return ctx.reply('Access denied.');
  sessions.set(ctx.from!.id, {});
  await ctx.reply('Загрузите 3 Excel-файла: sales, group-plan, receivables. Тип определяется по имени файла.');
});

bot.on('message:document', async (ctx) => {
  if (String(ctx.from?.id) !== allowedUserId) return ctx.reply('Access denied.');
  const document = ctx.message.document;
  const fileName = document.file_name ?? '';
  const fileType = detectFileType(fileName);
  if (!fileType) return ctx.reply('Не понял тип файла. Добавьте в имя sales/group-plan/receivables.');

  fs.mkdirSync(rawDir, { recursive: true });
  const file = await bot.api.getFile(document.file_id);
  if (!file.file_path) throw new Error('Telegram did not return file_path.');
  const response = await fetch(`https://api.telegram.org/file/bot${token}/${file.file_path}`);
  if (!response.ok) throw new Error(`Cannot download Telegram file: ${response.status}`);
  const date = new Date().toISOString().slice(0, 10);
  const targetName = `${fileType === 'groupPlan' ? 'group-plan' : fileType}-${date}-${fileName}`;
  const targetPath = path.join(rawDir, targetName);
  fs.writeFileSync(targetPath, Buffer.from(await response.arrayBuffer()));

  const session = sessions.get(ctx.from!.id) ?? {};
  session[fileType] = targetPath;
  sessions.set(ctx.from!.id, session);
  const received = Object.keys(session).length;
  await ctx.reply(`Получен ${fileType}. Файлов: ${received}/3.`);

  if (session.sales && session.groupPlan && session.receivables) {
    await ctx.reply('Все файлы получены. Запускаю обработку и push в GitHub.');
    run('npm', ['run', 'process:data']);
    run('npm', ['run', 'commit:data']);
    sessions.delete(ctx.from!.id);
    await ctx.reply('Готово: данные обработаны и отправлены в GitHub.');
  }
});

bot.start();
