export const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

export function getIstMidnight(dateStr: Date | string | null): Date | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const shifted = new Date(d.getTime() + IST_OFFSET_MS);
  return new Date(Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()));
}

export function formatIstDate(dateStr: Date | string | null): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const shifted = new Date(d.getTime() + IST_OFFSET_MS);
  const yyyy = shifted.getUTCFullYear();
  const mm = String(shifted.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(shifted.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
