import { execFileSync } from 'node:child_process';
import 'dotenv/config';

function git(args: string[]) {
  return execFileSync('git', args, { stdio: 'pipe', encoding: 'utf8' }).trim();
}

const status = git(['status', '--short', 'data/raw', 'data/processed']);
if (!status) {
  console.log('No data changes to commit.');
  process.exit(0);
}

git(['add', 'data/raw', 'data/processed']);
git(['commit', '-m', `chore(data): daily dashboard update ${new Date().toISOString().slice(0, 10)}`]);

const repo = process.env.GITHUB_REPO;
const token = process.env.GITHUB_TOKEN;
const branch = process.env.DEFAULT_BRANCH ?? 'main';
if (!repo || !token) throw new Error('GITHUB_REPO and GITHUB_TOKEN are required for push.');

git(['push', `https://x-access-token:${token}@github.com/${repo}.git`, `HEAD:${branch}`]);
console.log(`Pushed data update to ${repo}:${branch}`);
