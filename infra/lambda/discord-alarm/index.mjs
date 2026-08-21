import { GetSecretValueCommand, SecretsManagerClient } from "@aws-sdk/client-secrets-manager";

const secrets = new SecretsManagerClient({});

/**
 * SNS → Discord webhook for Control Plane alarms (ADR-015).
 * Expects WEBHOOK_SECRET_ARN in the environment.
 */
export async function handler(event) {
  const secretArn = process.env.WEBHOOK_SECRET_ARN;
  if (!secretArn) {
    throw new Error("WEBHOOK_SECRET_ARN is not set");
  }

  const secret = await secrets.send(new GetSecretValueCommand({ SecretId: secretArn }));
  const webhookUrl = secret.SecretString;
  if (!webhookUrl || webhookUrl === "REPLACE_ME") {
    throw new Error("Discord alarm webhook secret is missing or still REPLACE_ME");
  }

  const records = Array.isArray(event?.Records) ? event.Records : [];
  const lines = [];
  for (const record of records) {
    const raw = record?.Sns?.Message ?? JSON.stringify(record);
    try {
      const parsed = JSON.parse(raw);
      const name = parsed.AlarmName ?? "Alarm";
      const state = parsed.NewStateValue ?? "ALARM";
      const reason = parsed.NewStateReason ?? raw;
      lines.push(`**${name}** → ${state}\n${reason}`);
    } catch {
      lines.push(String(raw));
    }
  }

  const description = (lines.join("\n\n") || "LGHS CloudWatch alarm").slice(0, 4000);

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      embeds: [
        {
          title: "LGHS alarm",
          description,
          color: 0xc0392b,
        },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Discord webhook failed: ${response.status} ${body}`);
  }

  return { ok: true };
}
