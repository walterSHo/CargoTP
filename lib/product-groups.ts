export function normalizeProductGroup(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[ії]/g, 'и')
    .replace(/\s+/g, ' ');
}

export function isTireGroup(value: string) {
  const normalized = normalizeProductGroup(value);
  return normalized.includes('шина') || normalized.includes('шины') || normalized.includes('шин') || normalized.includes('tyre') || normalized.includes('tire');
}
