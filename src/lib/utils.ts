export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('id-ID').format(num);
}
