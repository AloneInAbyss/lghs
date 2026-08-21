# Deploy e operação — LGHS

Runbook para publicar a infraestrutura (AWS CDK) e a imagem do Control Plane (ECR + Fargate).

## Pré-requisitos

- Conta AWS com permissões de administrador (ou equivalentes para CDK/ECS/EC2/IAM)
- Node.js 24+ e pnpm (ver `packageManager` na raiz)
- Docker
- AWS CLI configurada (`aws configure` ou variáveis de credencial)
- Aplicação Discord criada (token, client id, guild id, role id de admin)
- URL do jar do Minecraft Java (vanilla) estável

## 1. Bootstrap do CDK (uma vez por conta/região)

```bash
pnpm install
pnpm --filter @lghs/infra exec cdk bootstrap aws://ACCOUNT_ID/REGION
```

## 2. Deploy da stack

```bash
pnpm --filter @lghs/infra run deploy -- \
  -c minecraftJarUrl='https://piston-data.mojang.com/v1/objects/.../server.jar' \
  -c discordClientId='...' \
  -c discordGuildId='...' \
  -c discordAdminRoleId='...' \
  -c ec2InstanceType=t3.medium \
  -c imageTag=latest
```

Contextos opcionais:

| Context | Efeito |
| --- | --- |
| `amiId` | Fixa a AMI do Game Server (senão Amazon Linux 2023 via lookup) |
| `dangerDeleteData=true` | Permite destruir tabela/bucket/logs no `cdk destroy` (não use em produção) |

Anote os **Outputs** do CloudFormation (tabela, bucket, subnet, SG, instance profile, URI do ECR, ARNs dos secrets).

## 3. Secrets (obrigatório após o primeiro deploy)

```bash
aws secretsmanager put-secret-value \
  --secret-id /lghs/discord-token \
  --secret-string 'SEU_TOKEN_DISCORD'

aws secretsmanager put-secret-value \
  --secret-id /lghs/discord-alarm-webhook \
  --secret-string 'https://discord.com/api/webhooks/...'
```

A senha RCON em `/lghs/minecraft-rcon-password` é gerada pela stack (campo JSON `password`). O Fargate injeta só esse campo em `LGHS_MINECRAFT_RCON_PASSWORD`.

## 4. Build e push da imagem do Control Plane

```bash
ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
REGION=${AWS_REGION:-us-east-1}
ECR_URI="$ACCOUNT.dkr.ecr.$REGION.amazonaws.com/lghs-control-plane"

aws ecr get-login-password --region "$REGION" \
  | docker login --username AWS --password-stdin "$ACCOUNT.dkr.ecr.$REGION.amazonaws.com"

docker build -t lghs-control-plane:latest -f Dockerfile .
docker tag lghs-control-plane:latest "$ECR_URI:latest"
docker push "$ECR_URI:latest"
```

Force um novo deployment do serviço para puxar a imagem:

```bash
aws ecs update-service \
  --cluster lghs \
  --service lghs-control-plane \
  --force-new-deployment
```

## 5. Verificar

```bash
aws ecs describe-services --cluster lghs --services lghs-control-plane \
  --query 'services[0].{running:runningCount,desired:desiredCount,events:events[0].message}'
```

Logs:

```bash
aws logs tail /aws/ecs/…   # use o log group criado pela stack (prefixo control-plane)
# ou pelo console CloudWatch → Log groups
```

No Discord: `/status` deve responder (bot online).

## 6. Desenvolvimento local (opcional)

Copie outputs da stack para `.env` (veja [`.env.example`](../.env.example)), busque a senha RCON se necessário, e rode:

```bash
pnpm --filter @lghs/control-plane build
pnpm --filter @lghs/control-plane start
```

## Alarmes

Se o Control Plane ficar com `RunningTaskCount < 1`, o alarme dispara SNS → Lambda → webhook Discord (`/lghs/discord-alarm-webhook`).
