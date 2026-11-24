// Format the integer part without rounding or changing the decimal representation.
export function formatNumber(value: number | string): string {
  const text = String(value);
  const [integer, ...fraction] = text.split(".");
  return integer.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + (fraction.length ? `.${fraction.join(".")}` : "");
}
