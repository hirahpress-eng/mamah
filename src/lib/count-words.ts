/**
 * Count words in a text string by splitting on whitespace.
 */
export function countWords(text: string): number {
  return text.split(/\s+/).filter((w) => w.length > 0).length;
}