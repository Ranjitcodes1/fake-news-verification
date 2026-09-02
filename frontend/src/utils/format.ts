export function predictionLabel(value: string): string {
  return value.replace(/_/g, " ");
}

export function predictionTone(value: string): string {
  if (value === "LIKELY_FAKE") return "bg-rose-100 text-rose-800 border-rose-200";
  if (value === "LIKELY_REAL") return "bg-emerald-100 text-emerald-800 border-emerald-200";
  return "bg-amber-100 text-amber-900 border-amber-200";
}

export function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}
