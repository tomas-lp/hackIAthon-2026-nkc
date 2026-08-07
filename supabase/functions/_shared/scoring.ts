export function calculateTrustScore(
  hasPhoto: boolean,
  hasLocation: boolean
): number {
  let score = 50; // base score
  if (hasPhoto) score += 30;
  if (hasLocation) score += 20;
  return score;
}
