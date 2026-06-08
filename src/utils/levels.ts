export const LEVEL_THRESHOLDS: number[] = (() => {
  const t = [0];
  let gap = 20;
  for (let i = 0; i < 29; i++) {
    t.push(t[t.length - 1] + Math.round(gap));
    gap *= 1.5;
  }
  return t;
})();

export function getLevelInfo(totalMiles: number) {
  let idx = 0;
  while (idx + 1 < LEVEL_THRESHOLDS.length && totalMiles >= LEVEL_THRESHOLDS[idx + 1]) {
    idx++;
  }
  const level = idx + 1;
  const from = LEVEL_THRESHOLDS[idx];
  const to = LEVEL_THRESHOLDS[idx + 1] ?? from + 9999;
  const progress = to > from ? Math.min((totalMiles - from) / (to - from), 1) : 1;
  const milesLeft = Math.max(to - totalMiles, 0);
  return { level, progress, from, to, milesLeft };
}
