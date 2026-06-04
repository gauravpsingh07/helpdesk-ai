/** Exponential backoff (seconds) for a failed job's next attempt, capped at 5 min. */
export function backoffSeconds(attempts: number): number {
  return Math.min(300, 2 ** attempts * 5);
}
