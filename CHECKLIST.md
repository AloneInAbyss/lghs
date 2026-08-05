# CHECKLIST — LGHS

Registro de progresso e pendências do projeto.

## Escopo do MVP

### Na primeira entrega

Itens essenciais para a versão inicial:

- Comandos: `/start`, `/stop`, `/status`
- Jogo: Minecraft Java vanilla (ADR-016 em [`docs/decisions.md`](docs/decisions.md))
- Subir e derrubar o runtime
- Restore e upload de saves/configs
- Health check via adapter (RCON)
- DNS canônico na arquitetura alvo (pode vir depois do caminho feliz básico no vertical slice)

### Depois do MVP

Itens que permanecem na visão de produto, mas fora da primeira entrega:

- Auto-stop por inatividade
- `/config idle` (ADR-008)

### Ideias futuras

Explorações possíveis — sem compromisso de escopo ou prazo:

- Backup e restore automático (além do save no ciclo start/stop)
- Possibilidade de rodar múltiplos Game Servers simultaneamente

## Decisões pendentes

Itens para discutir e pendentes de resolução.

- [ ] Contrato mínimo do `GameAdapter`
- [ ] Estratégia de locking no `StateStore`
- [ ] Demais cortes de escopo do MVP (ex.: ordem do DNS no vertical slice); idle já registrado em Escopo do MVP
- [ ] Reconsiderar o nível de acesso do comando `/start`, para permitir que usuários comuns possam iniciar o servidor

## Trabalho por etapa

### 1 — Esqueleto do repositório

- [ ] Estrutura de packages (`core`, `adapters/*`, `apps/control-plane`, `infra` com CDK)
- [ ] TypeScript strict, lint/format
- [ ] Popular `.gitignore` para Node/AWS/secrets
- [ ] Fakes in-memory dos ports
- [ ] Testes de domínio da máquina de estados e mutex (sem AWS)

### 2 — Vertical slice

- [ ] `StateStore` (DynamoDB) + máquina de estados
- [ ] Discord bot com deferred reply / follow-up + ACL por role
- [ ] `ServerProvider` mínimo (EC2 RunInstances / TerminateInstances)
- [ ] Minecraft adapter (start/stop/health + paths de save; RCON)
- [ ] `SaveStorage` no start/stop
- [ ] `DnsProvider` (após o caminho feliz básico, se cortado no escopo do MVP)
- [ ] `/start`, `/stop`, `/status` operacionais ponta a ponta

### 3 — Operação

- [ ] IaC da conta (AWS CDK, ADR-018)
- [ ] Runbook de deploy (imagem ECR + serviço Fargate)
- [ ] Alarmes / alertas Discord (R-005, ADR-015)
- [ ] Smoke test documentado
- [ ] Auto-stop e `/config idle` (pós-MVP)
