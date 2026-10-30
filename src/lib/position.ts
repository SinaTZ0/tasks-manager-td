import { generateKeyBetween } from "fractional-indexing";

/*===== Position Keys =====*/
// Cards within a column and columns within a project are ordered by fractional keys (`fractional-indexing`): a move
// writes one row, whatever the list's length. Keys compare byte-wise, as JavaScript compares strings and as the
// database's `C` collation does. Browser-safe: the board computes a key for its optimistic move, the server checks it.

/** Whether a value is a key this library made; anything else (a hand-made string) is refused. */
export function isPositionKey(value: string): boolean {
  try {
    generateKeyBetween(value, null);
    return true;
  } catch {
    return false;
  }
}

/** The key between two neighbours; `null` is the start or end of the list. */
export function positionBetween(before: string | null, after: string | null): string {
  return generateKeyBetween(before, after);
}

/**
 * The key to store when a move asks for `wanted`. If another item already has it (two people dropped into the same gap
 * at once), the move takes a fresh key just after it instead, so no two items ever share a key.
 *
 * @param taken The other items' keys in the same list.
 */
export function resolvePosition({ wanted, taken }: { wanted: string; taken: readonly string[] }): string {
  if (!taken.includes(wanted)) return wanted;
  const next = taken.filter((key) => key > wanted).toSorted()[0] ?? null;
  return generateKeyBetween(wanted, next);
}
