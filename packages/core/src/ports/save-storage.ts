/** Where game saves live on the runtime (used for remote sync on stop/start). */
export interface SaveSyncContext {
  runtimeId: string;
  workingDirectory: string;
}

/** Upload/download game saves and configs between sessions. */
export interface SaveStorage {
  /**
   * Restore objects for `gameId` onto the runtime.
   * EC2 bootstrap may also restore via user-data; this remains for explicit sync providers.
   */
  download(
    gameId: string,
    relativePaths: readonly string[],
    context: SaveSyncContext,
  ): Promise<void>;

  /**
   * Persist objects for `gameId` from the runtime (e.g. SSM + S3 after flush).
   */
  upload(gameId: string, relativePaths: readonly string[], context: SaveSyncContext): Promise<void>;
}
