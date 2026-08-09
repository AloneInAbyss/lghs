import type { SaveStorage } from "../ports/save-storage.js";

/** In-memory `SaveStorage` keyed by gameId + relative path. */
export class InMemorySaveStorage implements SaveStorage {
  private readonly objects = new Map<string, Uint8Array>();

  async download(gameId: string, relativePaths: readonly string[]): Promise<void> {
    for (const path of relativePaths) {
      const key = this.key(gameId, path);
      if (!this.objects.has(key)) {
        // First session: nothing to restore.
        continue;
      }
    }
  }

  async upload(gameId: string, relativePaths: readonly string[]): Promise<void> {
    for (const path of relativePaths) {
      this.objects.set(this.key(gameId, path), new TextEncoder().encode(`save:${gameId}:${path}`));
    }
  }

  has(gameId: string, relativePath: string): boolean {
    return this.objects.has(this.key(gameId, relativePath));
  }

  clear(): void {
    this.objects.clear();
  }

  private key(gameId: string, relativePath: string): string {
    return `${gameId}::${relativePath}`;
  }
}
