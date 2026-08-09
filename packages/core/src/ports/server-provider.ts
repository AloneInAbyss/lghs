/** Artifact the Game Server should materialize during bootstrap. */
export type BootstrapArtifactSource =
  { type: "url"; url: string } | { type: "s3"; bucket: string; key: string };

export interface BootstrapArtifact {
  source: BootstrapArtifactSource;
  destinationPath: string;
}

/**
 * Typed plan produced by `GameAdapter` and serialized into EC2 user-data by `ServerProvider`.
 * The core never builds vendor-specific scripts by hand.
 */
export interface BootstrapPlan {
  workingDirectory: string;
  setupCommands: string[];
  artifacts: BootstrapArtifact[];
  restoreSave: boolean;
  startCommand: string;
  env: Record<string, string>;
}

export type RuntimeStatus = "pending" | "running" | "stopping" | "terminated" | "unknown";

export interface RuntimeInfo {
  runtimeId: string;
  publicIp?: string;
  status: RuntimeStatus;
}

/** Provision and tear down the Game Server compute runtime. */
export interface ServerProvider {
  start(plan: BootstrapPlan): Promise<RuntimeInfo>;
  terminate(runtimeId: string): Promise<void>;
  describe(runtimeId: string): Promise<RuntimeInfo>;
}
