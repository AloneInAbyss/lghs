#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";

import { LghsStack } from "../src/lghs-stack.js";

function contextString(app: cdk.App, key: string): string | undefined {
  const value = app.node.tryGetContext(key) as unknown;
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function contextFlag(app: cdk.App, key: string): boolean {
  const value = app.node.tryGetContext(key) as unknown;
  return value === true || value === "true" || value === "1";
}

const app = new cdk.App();

const minecraftJarUrl = contextString(app, "minecraftJarUrl");
if (!minecraftJarUrl) {
  throw new Error(
    'Missing required context "minecraftJarUrl". Example: cdk deploy -c minecraftJarUrl=https://...',
  );
}

const amiId = contextString(app, "amiId");
const ec2InstanceType = contextString(app, "ec2InstanceType");
const imageTag = contextString(app, "imageTag");
const discordClientId = contextString(app, "discordClientId");
const discordGuildId = contextString(app, "discordGuildId");
const discordAdminRoleId = contextString(app, "discordAdminRoleId");

if (!discordClientId || !discordAdminRoleId) {
  throw new Error('Missing required context "discordClientId" and/or "discordAdminRoleId".');
}

const account = process.env.CDK_DEFAULT_ACCOUNT;
const region = process.env.CDK_DEFAULT_REGION;

new LghsStack(app, "LghsStack", {
  ...(account && region ? { env: { account, region } } : {}),
  minecraftJarUrl,
  discordClientId,
  discordGuildId: discordGuildId ?? "",
  discordAdminRoleId,
  ...(ec2InstanceType ? { ec2InstanceType } : {}),
  ...(amiId ? { amiId } : {}),
  ...(imageTag ? { imageTag } : {}),
  ...(contextFlag(app, "dangerDeleteData") ? { dangerDeleteData: true } : {}),
});

app.synth();
