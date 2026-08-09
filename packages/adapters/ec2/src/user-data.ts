import type { BootstrapPlan } from "@lghs/core";

import { shellQuote } from "./shell.js";

export interface SerializeBootstrapPlanOptions {
  saveBucket: string;
}

/**
 * Serialize a BootstrapPlan into a cloud-init user-data bash script.
 * Kept free of AWS SDK calls so unit tests can assert script contents.
 */
export function serializeBootstrapPlanToUserData(
  plan: BootstrapPlan,
  options: SerializeBootstrapPlanOptions,
): string {
  const lines: string[] = [
    "#!/bin/bash",
    "set -euo pipefail",
    "",
    `WORKDIR=${shellQuote(plan.workingDirectory)}`,
    'mkdir -p "$WORKDIR"',
    'cd "$WORKDIR"',
    "",
  ];

  for (const [key, value] of Object.entries(plan.env)) {
    lines.push(`export ${key}=${shellQuote(value)}`);
  }
  if (Object.keys(plan.env).length > 0) {
    lines.push("");
  }

  for (const command of plan.setupCommands) {
    lines.push(command);
  }
  if (plan.setupCommands.length > 0) {
    lines.push("");
  }

  for (const artifact of plan.artifacts) {
    const dest = shellQuote(artifact.destinationPath);
    lines.push(`mkdir -p "$(dirname -- ${dest})"`);
    if (artifact.source.type === "url") {
      lines.push(`curl -fsSL -o ${dest} ${shellQuote(artifact.source.url)}`);
    } else {
      const s3Uri = `s3://${artifact.source.bucket}/${artifact.source.key}`;
      lines.push(`aws s3 cp ${shellQuote(s3Uri)} ${dest}`);
    }
  }
  if (plan.artifacts.length > 0) {
    lines.push("");
  }

  if (plan.restoreSave) {
    const gameId = plan.env.LGHS_GAME_ID;
    if (gameId === undefined || gameId === "") {
      throw new Error("restoreSave requires plan.env.LGHS_GAME_ID");
    }
    const syncUri = `s3://${options.saveBucket}/saves/${gameId}/`;
    lines.push(`aws s3 sync ${shellQuote(syncUri)} "$WORKDIR/"`);
    lines.push("");
  }

  // Quoted heredoc keeps multi-line startCommand intact; process inherits exports above via nohup.
  lines.push("cat > \"$WORKDIR/.lghs-start.sh\" <<'LGHS_START_EOF'");
  lines.push("#!/bin/bash");
  lines.push("set -euo pipefail");
  lines.push(`cd ${shellQuote(plan.workingDirectory)}`);
  for (const [key, value] of Object.entries(plan.env)) {
    lines.push(`export ${key}=${shellQuote(value)}`);
  }
  lines.push(plan.startCommand);
  lines.push("LGHS_START_EOF");
  lines.push('chmod +x "$WORKDIR/.lghs-start.sh"');
  lines.push('nohup "$WORKDIR/.lghs-start.sh" > "$WORKDIR/lghs-server.log" 2>&1 &');
  lines.push("");

  return lines.join("\n");
}
