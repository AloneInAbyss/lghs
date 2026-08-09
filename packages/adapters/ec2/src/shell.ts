/** Single-quote a value for safe inclusion in a bash script. */
export function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}
