// Seeded random based on peak id/name for consistent icon per peak
function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function getPeakColor(elevationMoh: number, isChecked: boolean = false): string {
  if (isChecked) return "#10B981"; // success
  if (elevationMoh >= 1000) return "#8B5CF6"; // very high - violet
  if (elevationMoh >= 650) return "#F59E0B"; // high - amber
  if (elevationMoh >= 300) return "#3B82F6"; // medium - blue
  return "#9CA3AF"; // low - gray
}

export function getPeakBgColor(elevationMoh: number, isChecked: boolean = false): string {
  if (isChecked) return "rgba(16, 185, 129, 0.2)"; // success/20
  if (elevationMoh >= 1000) return "rgba(139, 92, 246, 0.15)";
  if (elevationMoh >= 650) return "rgba(245, 158, 11, 0.15)";
  if (elevationMoh >= 300) return "rgba(59, 130, 246, 0.15)";
  return "rgba(156, 163, 175, 0.15)";
}