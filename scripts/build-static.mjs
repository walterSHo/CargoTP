import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const distDir = path.join(root, 'dist');
const processedDir = path.join(root, 'data', 'processed');

async function copyFileIntoDist(sourceRelativePath) {
  const sourcePath = path.join(root, sourceRelativePath);
  const targetPath = path.join(distDir, sourceRelativePath);
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.copyFile(sourcePath, targetPath);
}

async function copyDirectory(sourcePath, targetPath) {
  await fs.mkdir(targetPath, { recursive: true });
  const entries = await fs.readdir(sourcePath, { withFileTypes: true });
  for (const entry of entries) {
    const sourceEntryPath = path.join(sourcePath, entry.name);
    const targetEntryPath = path.join(targetPath, entry.name);
    if (entry.isDirectory()) {
      await copyDirectory(sourceEntryPath, targetEntryPath);
      continue;
    }
    await fs.copyFile(sourceEntryPath, targetEntryPath);
  }
}

await fs.rm(distDir, { recursive: true, force: true });
await copyFileIntoDist('index.html');
await copyFileIntoDist('upload.html');
await copyDirectory(processedDir, path.join(distDir, 'data', 'processed'));

console.log(`Static Pages bundle created in ${path.relative(root, distDir)}`);
