import type { BootstrapPlan, RuntimeInfo, ServerProvider } from "../ports/server-provider.js";

interface StoredRuntime {
  info: RuntimeInfo;
  plan: BootstrapPlan;
}

/** In-memory `ServerProvider` that simulates RunInstances / TerminateInstances. */
export class InMemoryServerProvider implements ServerProvider {
  private readonly runtimes = new Map<string, StoredRuntime>();
  private sequence = 0;
  private nextPublicIp = "203.0.113.10";

  async start(plan: BootstrapPlan): Promise<RuntimeInfo> {
    this.sequence += 1;
    const runtimeId = `i-fake${String(this.sequence).padStart(8, "0")}`;
    const info: RuntimeInfo = {
      runtimeId,
      publicIp: this.nextPublicIp,
      status: "running",
    };
    this.runtimes.set(runtimeId, { info, plan });
    return { ...info };
  }

  async terminate(runtimeId: string): Promise<void> {
    const existing = this.runtimes.get(runtimeId);
    if (existing === undefined) {
      return;
    }
    existing.info = {
      runtimeId,
      status: "terminated",
    };
  }

  async describe(runtimeId: string): Promise<RuntimeInfo> {
    const existing = this.runtimes.get(runtimeId);
    if (existing === undefined) {
      return { runtimeId, status: "unknown" };
    }
    return { ...existing.info };
  }

  /** Test helper: override the next public IP assigned on `start`. */
  setNextPublicIp(ip: string): void {
    this.nextPublicIp = ip;
  }

  getPlan(runtimeId: string): BootstrapPlan | undefined {
    return this.runtimes.get(runtimeId)?.plan;
  }
}
