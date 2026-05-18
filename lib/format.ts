export function money(value: number) {
  return new Intl.NumberFormat('uk-UA', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
}

export function percent(value: number) {
  return `${value.toFixed(1)}%`;
}
