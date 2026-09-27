export function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

// Часы с точностью до получаса — так их и показываем.
export function roundHours(minutes: number): number {
  return Math.round((minutes / 60) * 2) / 2;
}

export function hours(minutes: number): string {
  if (minutes < 60) return `~${minutes} мин`;
  return `~${String(roundHours(minutes)).replace('.', ',')} ч`;
}

// Подход — 30–40 минут. Считаем от показанных часов, чтобы цифры рядом сходились: 2 ч — 3–4 подхода.
export function sessionRange(minutes: number): [number, number] {
  const shown = roundHours(minutes) * 60;
  return [Math.max(1, Math.round(shown / 40)), Math.max(1, Math.round(shown / 30))];
}

export function daysSince(ts: number | null, now = Date.now()): number {
  return ts ? Math.floor((now - ts) / 86_400_000) : Infinity;
}
