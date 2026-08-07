/**
 * Reads the Pro flag out of Clerk publicMetadata.
 *
 * The webhooks write a real boolean, but publicMetadata is also hand-editable
 * in the Clerk dashboard, where it is very easy to save `true` as the string
 * "true". A strict `=== true` then fails while the client's truthiness check
 * passes — the UI shows the user as Pro and the server refuses them, which is
 * precisely the confusing state this helper exists to prevent.
 *
 * Client and server must both go through this so they can never disagree.
 */
export function readIsPro(metadata: unknown): boolean {
  const value = (metadata as { isPro?: unknown } | null | undefined)?.isPro;
  return value === true || value === "true" || value === 1 || value === "1";
}
