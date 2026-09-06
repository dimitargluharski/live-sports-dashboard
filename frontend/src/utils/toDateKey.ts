export function toDateKey(value: Date): string {
  return [value.getFullYear(), value.getMonth() + 1, value.getDate()]
    .map((part) => String(part).padStart(2, '0'))
    .join('-');
}
