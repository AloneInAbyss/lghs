/** Minimal RCON surface used by MinecraftRconSession (real client or test fake). */
export interface RconLike {
  send(command: string): Promise<string>;
  end(): void | Promise<void>;
}

export type CreateRcon = (host: string, port: number, password: string) => Promise<RconLike>;
