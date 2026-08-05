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
- Endereço de conexão no `/status` via **IP** (e porta)

### Depois do MVP

Itens que permanecem na visão de produto, mas fora da primeira entrega:

- Auto-stop por inatividade
- `/config idle` (ADR-008)
- DNS canônico automatizado (`DnsProvider` / Route 53; ADR-007, ADR-014)

### Ideias futuras

Explorações possíveis — sem compromisso de escopo ou prazo:

- Backup e restore automático (além do save no ciclo start/stop)
- Possibilidade de rodar múltiplos Game Servers simultaneamente

## Decisões pendentes

Itens para discutir e pendentes de resolução.

- [ ] Reconsiderar o nível de acesso do comando `/start`, para permitir que usuários comuns possam iniciar o servidor. Uma opção é que cada jogo tenha uma role associada, que irá permitir que esse usuário inicie o servidor. Os comandos de /stop e /config ainda permanecem restritos.

## Trabalho por etapa

### 1 — Esqueleto do repositório

- [ ] Estrutura de packages (`core`, `adapters/*`, `apps/control-plane`, `infra` com CDK)
- [ ] TypeScript strict, lint/format
- [ ] Popular `.gitignore` para Node/AWS/secrets
- [ ] Fakes in-memory dos ports
- [ ] Testes de domínio da máquina de estados (sem AWS)

### 2 — Vertical slice

- [ ] `StateStore` (DynamoDB) + máquina de estados
- [ ] Discord bot com deferred reply / follow-up + ACL por role
- [ ] `ServerProvider` mínimo (EC2 RunInstances / TerminateInstances)
- [ ] Minecraft adapter (start/stop/health + paths de save; RCON)
- [ ] `SaveStorage` no start/stop
- [ ] `/start`, `/stop`, `/status` operacionais ponta a ponta

### 3 — Operação

- [ ] IaC da conta (AWS CDK, ADR-018)
- [ ] Runbook de deploy (imagem ECR + serviço Fargate)
- [ ] Alarmes / alertas Discord (R-005, ADR-015)
- [ ] Smoke test documentado
