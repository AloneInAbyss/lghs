/** Injectable clock so lifecycle timestamps stay deterministic in tests. */
export interface Clock {
  now(): string;
}

export const systemClock: Clock = {
  now(): string {
    return new Date().toISOString();
  },
};
