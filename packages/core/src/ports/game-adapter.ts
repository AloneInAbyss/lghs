import type { BootstrapPlan } from "./server-provider.js";

/** Handle to a live runtime used to open a supervision session. */
export interface RuntimeHandle {
  runtimeId: string;
  publicIp: string;
}

/** Supervision channel for an already-running Game Server process. */
export interface GameSession {
  waitUntilHealthy(timeoutMs?: number): Promise<void>;
  flush(): Promise<void>;
  shutdown(): Promise<void>;
  playerCount(): Promise<number>;
}

/**
 * Per-game contract. The core orchestrates lifecycle only through this port.
 */
export interface GameAdapter {
  readonly id: string;
  readonly connectionPort: number;
  savePaths(): readonly string[];
  bootstrapPlan(options?: { restoreSave?: boolean }): BootstrapPlan;
  connect(runtime: RuntimeHandle): Promise<GameSession>;
}
