/** Upload/download game saves and configs between sessions. */
export interface SaveStorage {
  /**
   * Download previously stored objects for `gameId` into the runtime working tree.
   * Paths are relative (as declared by `GameAdapter.savePaths()`).
   */
  download(gameId: string, relativePaths: readonly string[]): Promise<void>;

  /**
   * Upload current objects for `gameId` from the runtime working tree.
   * Paths are relative (as declared by `GameAdapter.savePaths()`).
   */
  upload(gameId: string, relativePaths: readonly string[]): Promise<void>;
}
