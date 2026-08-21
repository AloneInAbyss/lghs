# CHECKLIST — LGHS

Registro de progresso e pendências do projeto.

## Escopo do MVP

### Na primeira entrega

Itens essenciais para a versão inicial:

- Comandos: `/start`, `/stop`, `/status`
- Jogo: Minecraft Java vanilla
- Subir e derrubar o runtime
- Restore e upload de saves/configs
- Health check via adapter (RCON)
- Endereço de conexão no `/status` via **IP** (e porta)

### Depois do MVP

Itens que permanecem na visão de produto, mas fora da primeira entrega:

- Auto-stop por inatividade
- `/config idle`
- DNS canônico automatizado (`DnsProvider` / Route 53)

### Ideias futuras

Explorações possíveis — sem compromisso de escopo ou prazo:

- Backup e restore automático (além do save no ciclo start/stop)
- Possibilidade de rodar múltiplos Game Servers simultaneamente

## Decisões pendentes

Itens para discutir e pendentes de resolução.

- [ ] Reconsiderar o nível de acesso do comando `/start`, para permitir que usuários comuns possam iniciar o servidor. Uma opção é que cada jogo tenha uma role associada, que irá permitir que esse usuário inicie o servidor. Os comandos de /stop e /config ainda permanecem restritos.

## Trabalho por etapa

### 1 — Esqueleto do repositório

Monorepo e domínio testável sem AWS/Discord.

**Packages e domínio**

- [x] Estrutura de packages (`apps/control-plane`, `packages/core`, `packages/adapters/*`, `infra`)
- [x] Ports + fakes in-memory
- [x] Máquina de estados do ciclo de vida + testes de domínio (sem AWS)

**Tooling do monorepo**

- [x] pnpm workspaces (`pnpm-workspace.yaml`, `packageManager`, `engines`)
- [x] TypeScript strict (`tsconfig.base.json` + configs por package; `types: ["node"]` onde necessário)
- [x] ESLint + Prettier (incl. ignores coerentes com docs/lockfile)
- [x] `.gitignore` para Node/AWS/secrets/coverage/build
- [x] Scripts raiz: `build`, `test`, `test:coverage`, `lint`, `format`, `typecheck`
- [x] Cobertura Vitest (`@vitest/coverage-v8`) no core — sem thresholds de CI por enquanto
- [x] Dependências alinhadas a um conjunto **compatível** (não apenas “latest” do registry; ex.: TypeScript dentro do peer do `typescript-eslint`)

**DX / editor**

- [x] `.vscode/extensions.json` (recomendações do workspace)
- [x] `.vscode/settings.json` (format on save / formatter do time)
- [x] `.vscode/launch.json` + `tasks.json` (debug Vitest e control-plane)

### 2 — Vertical slice

Comandos operacionais ponta a ponta (ainda podendo desenvolver use cases com fakes antes dos adapters AWS).

- [x] Use cases de `/start`, `/stop`, `/status` no núcleo (orquestração + pré-condições)
- [x] `StateStore` em DynamoDB
- [x] Discord bot (discord.js) com deferred reply / follow-up + ACL por role
- [x] `ServerProvider` mínimo (EC2 RunInstances / TerminateInstances)
- [x] Minecraft adapter (start/stop/health + paths de save; RCON)
- [x] `SaveStorage` (S3) no ciclo start/stop
- [x] `/start`, `/stop`, `/status` operacionais ponta a ponta (wiring do control-plane + `.env.example`)
- [x] Cobertura nos packages com implementação real (além do core), ainda sem gate rígido de CI

### 3 — Operação

- [x] IaC da conta (AWS CDK em `infra/`)
- [x] Runbook de deploy (imagem ECR + serviço Fargate) — [`docs/deploy.md`](docs/deploy.md)
- [x] Alarmes / alertas Discord (CloudWatch → SNS → Lambda → webhook)
- [x] Smoke test documentado — [`docs/smoke-test.md`](docs/smoke-test.md)
