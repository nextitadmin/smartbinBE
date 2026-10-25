/**
 * True when at least two name tokens from the provider's name also appear in
 * the actor's name (case-insensitive). Same rule as KycService.assertNameFuzzyMatch.
 */
export function namesMatch(actorNames: string, providerNames: string): boolean {
  const tokens = (name: string) =>
    new Set(
      name
        .toLowerCase()
        .split(' ')
        .map((token) => token.trim())
        .filter(Boolean),
    );

  const actor = tokens(actorNames);

  let matches = 0;
  for (const token of tokens(providerNames)) {
    if (actor.has(token)) matches++;
    if (matches >= 2) return true;
  }

  return false;
}
