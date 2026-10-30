/*===== Bidirectional Text =====*/

/**
 * Wraps text in Unicode first-strong isolates (FSI … PDI), for a name or title put into a sentence of the other
 * direction: a Persian name ending in digits («سارا 18726») inside an English sentence would otherwise be reordered
 * with the words around it. The text equivalent of `<bdi>`, for message inputs, which are plain strings.
 */
export function isolate(text: string): string {
  return `⁨${text}⁩`;
}
