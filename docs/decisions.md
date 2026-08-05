# Decisões

Registro de decisões de arquitetura (ADR). Novas decisões relevantes devem ser acrescentadas aqui.

## ADR-001 — LGHS é um sistema self-host, não um SaaS

- **Status:** Aceita
- **Decisão:** LGHS é ferramenta self-host; uso primário para uma comunidade/Discord.
- **Consequências:** Sem isolamento multi-tenant, billing por cliente ou painel SaaS. Permite que outros repliquem a instalação de forma independente.

## ADR-002 — Distribuição open source

- **Status:** Pendente de definição do ADR da licença
- **Decisão:** Código público; terceiros podem fazer self-host.
- **Consequências:** Nunca deixar secrets no repo/logs; documentação de setup necessária; recomendado definição da licença.

## ADR-003 — Catálogo fechado de jogos

- **Status:** Aceita
- **Contexto:** Hospedar “qualquer jogo” explode o escopo.
- **Decisão:** Catálogo fechado; novos jogos entram como GameAdapters independentes.
- **Consequências:** Detalhes individuais fica para implementação do adapter; o núcleo só conhece o contrato do port.

## ADR-004 — Mutex global: um Game Server ativo por vez

- **Status:** Aceita
- **Contexto:** Para um servidor pequeno inicialmente não há necessidade de hospedar múltiplos jogos.
- **Decisão:** No máximo uma instância de jogo ligada por instalação.
- **Consequências:** Troca de jogo através de `/config`; custo e complexidade menores; `/start` falha com mensagem clara se já houver servidor ativo.

## ADR-005 — Interface no Discord através de slash commands

- **Status:** Aceita
- **Contexto:** A interface deve ser de fácil acesso e uso para todos os potenciais usuários.
- **Decisão:** Uso de slash command em servidor do Discord com autorização através das roles do próprio Discord.
- **Consequências:** Operações longas precisam de feedback assíncrono no Discord (mensagens de progresso/resultado).

## ADR-006 — Permissões de admin vs usuário

- **Status:** Aceita
- **Decisão:** Admins no Discord controlam tudo e liberam acesso a outros usuários através de roles.
- **Consequências:** Pouca granularidade no ACR; acesso atrelado diretamente à configuração do servidor no Discord.

## ADR-007 — Conexão por IP público

- **Status:** A alterar
- **Contexto:** DNS dinâmico com domínio melhora UX, mas adiciona peças.
- **Decisão:** v1 informa IP público. Domínio fica para depois.
- **Consequências:** IP pode mudar a cada start; jogadores precisam do IP atual via `/status` ou mensagem de start.

## ADR-008 — Auto-stop por inatividade configurável

- **Status:** Aceita
- **Decisão:** Timeout configurável via Discord (`/config`), persistido.
- **Consequências:** Control Plane precisa supervisionar o Game Server enquanto ele estiver up.

## ADR-009 — Control Plane e Game Server em recursos separados

- **Status:** Aceita
- **Decisão:** Mesma conta/região no provedor cloud; processos/recursos distintos.
- **Consequências:** Game Server pode morrer/ser destruído sem derrubar o bot; scaling de custo fica no jogo.

## ADR-010 — Estado em DynamoDB via port `StateStore`

- **Status:** Aceita
- **Contexto:** Control Plane pode ser efêmero/recriado; estado não deve viver só em disco local.
- **Decisão:** DynamoDB atrás de `StateStore`.
- **Consequências:** No caso de mudanças futuras será necessário migrar o conteúdo já existente no DynamoDB.

## ADR-011 — Saves e backups em S3 via port `SaveStorage`

- **Status:** Aceita
- **Decisão:** Persistência de saves entre starts; backups frequentes e com retenção; backup obrigatório antes do destroy do runtime.
- **Consequências:** GameAdapter deve coordenar o backup seguro antes da cópia/upload.

## ADR-012 — Providers desacoplados através de Ports & Adapters

- **Status:** Aceita
- **Decisão:** Port `ServerProvider` na versão inicial com adapter AWS; posteriormente podendo ser adaptado para outros fornecedores.
- **Consequências:** Núcleo não pode depender de SDK AWS para regras de negócio; arquitetura hexagonal nas fronteiras.

## ADR-013 — Stack TypeScript + Node

- **Status:** Aceita
- **Decisão:** Control Plane em TypeScript/Node.
- **Consequências:** Ecossistema Discord e AWS maduros; tipagem ajuda nos contratos dos ports.
