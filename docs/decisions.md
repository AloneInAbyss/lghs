# Decisões

Registro de decisões de arquitetura (ADR). Novas decisões relevantes devem ser acrescentadas aqui.

## ADR-001 — LGHS é um sistema self-host, não um SaaS

- **Status:** Aceita
- **Decisão:** LGHS é ferramenta self-host; uso primário para uma comunidade/Discord.
- **Consequências:** Sem isolamento multi-tenant, billing por cliente ou painel SaaS. Permite que outros repliquem a instalação de forma independente.

## ADR-002 — Distribuição open source sob licença MIT

- **Status:** Aceita
- **Decisão:** Código público sob licença **MIT** (`LICENSE` na raiz); terceiros podem fazer self-host, modificar e redistribuir nos termos da MIT.
- **Consequências:** Nunca deixar secrets no repo/logs; documentação de setup necessária; atribuição do copyright conforme a licença.

## ADR-003 — Catálogo fechado de jogos

- **Status:** Aceita
- **Contexto:** Hospedar “qualquer jogo” explode o escopo.
- **Decisão:** Catálogo fechado; novos jogos entram como GameAdapters independentes.
- **Consequências:** Detalhes individuais fica para implementação do adapter; o núcleo só conhece o contrato do port.

## ADR-004 — Mutex global: um Game Server ativo por vez

- **Status:** Aceita
- **Contexto:** Para um servidor pequeno inicialmente não há necessidade de hospedar múltiplos jogos.
- **Decisão:** No máximo uma instância de jogo ligada por instalação.
- **Consequências:** Troca de jogo através de `/start [game]` (com o servidor parado); custo e complexidade menores; `/start` falha com mensagem clara se já houver servidor ativo.

## ADR-005 — Interface no Discord através de slash commands

- **Status:** Aceita
- **Contexto:** A interface deve ser de fácil acesso e uso para todos os potenciais usuários.
- **Decisão:** Uso de slash command em servidor do Discord com autorização através das roles do próprio Discord. Biblioteca: ADR-021.
- **Consequências:** Operações longas precisam de feedback assíncrono no Discord (mensagens de progresso/resultado).

## ADR-006 — Permissões de admin vs usuário

- **Status:** Aceita
- **Decisão:** Admins no Discord controlam tudo e liberam acesso a outros usuários através de roles.
- **Consequências:** Pouca granularidade no ACL; acesso atrelado diretamente à configuração do servidor no Discord.

## ADR-007 — Conexão por domínio

- **Status:** Adiada (fora da primeira entrega)
- **Contexto:** IP público muda a cada start; um hostname estável facilita a conexão dos jogadores.
- **Decisão:** O endereço canônico de conexão é um hostname gerenciado. No `/start`, após o Game Server ficar saudável, o Control Plane atualiza o registro DNS para o IP atual.
- **Consequências:** Jogadores e `/status` usam o hostname; o IP continua existindo no runtime, mas não é a fonte da verdade da UX. Requer port `DnsProvider` (ADR-014).

## ADR-008 — Auto-stop por inatividade configurável

- **Status:** Adiada (fora da primeira entrega)
- **Decisão:** Timeout configurável via Discord (`/config idle`), persistido. Ao atingir o limite, o fluxo de stop inicia. Valor `0` desativa o auto-stop.
- **Consequências:** Control Plane precisa supervisionar o Game Server enquanto ele estiver up.

## ADR-009 — Control Plane e Game Server em recursos separados

- **Status:** Aceita
- **Decisão:** Mesma conta/região no provedor cloud; processos/recursos distintos. Forma concreta: Control Plane em Fargate (ADR-019), Game Server em EC2 (ADR-017).
- **Consequências:** Game Server pode morrer/ser destruído sem derrubar o bot; scaling de custo fica no jogo.

## ADR-010 — Estado em DynamoDB via port `StateStore`

- **Status:** Aceita
- **Contexto:** Control Plane pode ser efêmero/recriado; estado não deve viver só em disco local.
- **Decisão:** DynamoDB atrás de `StateStore`.
- **Consequências:** No caso de mudanças futuras será necessário migrar o conteúdo já existente no DynamoDB.

## ADR-011 — Saves e configs em S3 via port `SaveStorage`

- **Status:** Aceita
- **Decisão:** `SaveStorage` persiste saves e configs do jogo entre sessões. O upload ocorre antes de destruir/parar o runtime.
- **Consequências:** GameAdapter deve coordenar flush/save seguro antes da cópia/upload.

## ADR-012 — Providers desacoplados através de Ports & Adapters

- **Status:** Aceita
- **Decisão:** Port `ServerProvider` na versão inicial com adapter AWS; posteriormente podendo ser adaptado para outros fornecedores. Forma inicial do runtime: ADR-017.
- **Consequências:** Núcleo não pode depender de SDK AWS para regras de negócio; arquitetura hexagonal nas fronteiras.

## ADR-013 — Stack TypeScript + Node

- **Status:** Aceita
- **Decisão:** Control Plane em TypeScript/Node.
- **Consequências:** Ecossistema Discord e AWS maduros; tipagem ajuda nos contratos dos ports.

## ADR-014 — DNS via Route 53 e port `DnsProvider`

- **Status:** Adiada (fora da primeira entrega)
- **Contexto:** O hostname de conexão precisa apontar para o IP do Game Server a cada start, sem acoplar DNS ao compute.
- **Decisão:** Port `DnsProvider` com adapter Route 53; o Control Plane atualiza o registro após o health check do start.
- **Consequências:** `ServerProvider` permanece focado em runtime; trocar de provedor DNS no futuro não exige reescrever o provider de compute.

## ADR-015 — Observabilidade com CloudWatch e alertas no Discord

- **Status:** Aceita
- **Contexto:** Se o Control Plane cair, o Game Server pode continuar ligado (R-005).
- **Decisão:** CloudWatch Logs + CloudWatch Alarms; notificações exclusivamente no **Discord**. Para alarmes com Control Plane indisponível, um caminho mínimo (Lambda → webhook) posta no Discord.
- **Consequências:** Operação permanece na AWS + Discord; self-hosters configuram canal/webhook de alerta na instalação.

## ADR-016 — Primeiro Adapter - Minecraft Java Vanilla

- **Status:** Aceita
- **Contexto:** O catálogo é fechado (ADR-003); o primeiro adapter precisa de defaults claros para implementação e supervisão.
- **Decisão:** Minecraft **Java Vanilla**, versão mais recente estável; `online-mode=false`; sem whitelist; sem senha; porta `25565`; mundo na pasta do `level-name` (padrão `world/` na raiz do servidor). Supervisão via **polling RCON** (health, presença de jogadores, flush/save). Outros jogos podem usar outro canal no próprio adapter.
- **Consequências:** R-001 fica conscientemente aceito neste adapter inicial; endurecer auth fica para depois. O núcleo continua agnóstico ao RCON — só o Minecraft adapter conhece o protocolo.

## ADR-017 — Runtime do Game Server em EC2 On-Demand

- **Status:** Aceita
- **Contexto:** O `ServerProvider` precisa materializar um único Game Server sob demanda (ADR-004, ADR-012), com IP público, disco efêmero, restore/upload via `SaveStorage` e supervisão RCON (ADR-016). Alternativas (Spot, ECS, Fargate, Lightsail) foram descartadas para o MVP: Spot pode interromper a sessão; containers acrescentam complexidade sem benefício com mutex = 1.
- **Decisão:** Adapter AWS do `ServerProvider` usa **EC2 On-Demand**. Ciclo de vida: **`RunInstances` no start** e **`TerminateInstances` no stop** (após flush e upload do save). Bootstrap da instância via **user-data** (Java, jar, restore do S3, start do processo). Canal operacional na VM via **SSM** (sem SSH público). Security group: porta do jogo acessível aos jogadores; RCON restrito ao Control Plane.
- **Consequências:** Cold start na ordem de minutos (Discord deferred/follow-up). IP muda a cada create; `/status` e a resposta do `/start` expõem o IP atual. Compute parado zera com terminate; verdade do mundo permanece no S3. Stop/Start com EBS ou Spot ficam como otimizações futuras, não como contrato do MVP.
- **Nota (jogos pesados):** O ciclo terminate + disco efêmero implica bootstrap a cada start. Para jogos pequenos o user-data basta. Em adapters com install grande (dezenas de GB), preferir **AMI** com os binários pré-instalados e manter no S3 sobretudo saves/configs — ou Stop/Start com EBS — em vez de baixar o jogo inteiro a cada `RunInstances`.

## ADR-018 — Infraestrutura como código com AWS CDK (TypeScript)

- **Status:** Aceita
- **Contexto:** A conta AWS precisa ser reproduzível para self-host (DynamoDB, S3, IAM, security groups, EC2 do Game Server, Control Plane, alarmes). O Control Plane já é TypeScript/Node (ADR-013) com ECS Fargate (ADR-019); o runtime do jogo é EC2 (ADR-017). Terraform seria sólido, mas introduz HCL e fluxo de state à parte.
- **Decisão:** Usar **AWS CDK em TypeScript** para declarar e publicar a infraestrutura (sintetiza CloudFormation). App de infra versionada no repositório (ex.: `infra/` ou equivalente). Secrets fora do código (Parameter Store / Secrets Manager).
- **Consequências:** Um único ecossistema de linguagem no repo; onboarding de deploy = Node + credenciais AWS + CDK CLI. A escolha é AWS-first (alinhada ao produto); troca de cloud no futuro exigiria outra camada de IaC, sem invalidar ports/adapters do núcleo.

## ADR-019 — Control Plane em ECS Fargate

- **Status:** Aceita
- **Contexto:** O Control Plane precisa estar sempre ligado (comandos Discord, orquestração, supervisão RCON), separado do Game Server (ADR-009), com custo fixo baixo e restart automático (R-005). Lambda não serve bem a um bot/supervisor de longa duração; EC2 dedicada funciona, mas acrescenta operação de SO sem necessidade.
- **Decisão:** Rodar o Control Plane como **serviço ECS em Fargate** com **uma task** (`desiredCount = 1`), imagem container do app Node, mesma VPC/região do Game Server. Sem load balancer público no MVP (tráfego Discord é outbound). Logs em CloudWatch; secrets em Parameter Store / Secrets Manager. Security group da task é a origem permitida na porta RCON da EC2 do jogo (ADR-017).
- **Consequências:** Custo fixo 24/7 da task (esperado); pico de custo continua na EC2 do jogo. CDK modela cluster, task definition, service e ECR (ADR-018). Alarmes de task/serviço caídas alimentam o caminho Discord (ADR-015). Tamanho da task (CPU/memória) e pipeline de build/push da imagem são detalhes de implementação/operação.

## ADR-020 — Contrato mínimo do `GameAdapter`

- **Status:** Aceita
- **Contexto:** O núcleo orquestra o ciclo de vida sem conhecer detalhes de cada jogo (ADR-003). É preciso um contrato fino o bastante para start/stop/status e largo o bastante para o Minecraft (ADR-016) e futuros adapters, sem empurrar lógica de jogo para o `ServerProvider` nem transformar cada adapter num mini Control Plane.
- **Decisão:** O port `GameAdapter` expõe, no mínimo:
  - `id` — identificador no catálogo
  - `connectionPort` — porta canônica dos jogadores
  - `savePaths()` — paths relativos a sincronizar via `SaveStorage`
  - `bootstrapPlan(...)` — plano tipado que o `ServerProvider` serializa no user-data (install, binário, restore, start do processo)
  - `connect(runtime)` → `GameSession` com `waitUntilHealthy`, `flush`, `shutdown` e `playerCount`
- **Consequências:** No caminho feliz, o processo do jogo sobe pelo bootstrap (ADR-017); o Control Plane não exige `startProcess()` remoto genérico. Health/flush/shutdown/players usam o canal do adapter (RCON no Minecraft). Novos jogos = nova implementação do mesmo contrato. Forma do `BootstrapPlan` e do item de estado: ver [`architecture.md`](architecture.md).

## ADR-021 — Interface Discord com discord.js

- **Status:** Aceita
- **Contexto:** O Control Plane em TypeScript/Node (ADR-013) precisa registrar e tratar slash commands com deferred reply / follow-up (ADR-005). Alternativas (Discordeno, Oceanic, REST puro) existem, mas para um bot de um guild com orquestração longa o ecossistema e a documentação do **discord.js** reduzem atrito.
- **Decisão:** Usar **discord.js** no adapter de interface (`packages/adapters/discord`). O núcleo continua sem importar a biblioteca — apenas ports/handlers de aplicação.
- **Consequências:** Tipagem e guias maduros para interactions. Versão major pinada no manifesto do package; upgrades major tratados como mudança consciente. Gateway outbound a partir do Fargate (ADR-019), sem ALB para o bot.
