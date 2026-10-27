export const MAX_ATTEMPTS = 5;
/** 10s, 20s, 40s, 80s ... capped at 10 minutes. */
export const backoffMs = (attempts) => Math.min(5_000 * 2 ** attempts, 10 * 60_000);
