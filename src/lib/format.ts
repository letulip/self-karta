export function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

export function hours(minutes: number): string {
  if (minutes < 60) return `~${minutes} мин`;
  const h = Math.round((minutes / 60) * 2) / 2;
  return `~${String(h).replace('.', ',')} ч`;
}

export function daysSince(ts: number | null, now = Date.now()): number {
  return ts ? Math.floor((now - ts) / 86_400_000) : Infinity;
}
