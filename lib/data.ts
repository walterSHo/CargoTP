import fs from 'node:fs';
import path from 'node:path';
import type { ProcessedData } from './types';

const dataPath = path.join(process.cwd(), 'data/processed/dashboard.json');

export function readDashboardData(): ProcessedData {
  const raw = fs.readFileSync(dataPath, 'utf8');
  return JSON.parse(raw) as ProcessedData;
}
