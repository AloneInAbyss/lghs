# LGHS

**LGHS** (_Leonhart's Game Hosting System_) é um sistema para controlar servidores dedicados de jogos via Discord.

Para humanos 🥸: confira nos [/docs](#docs) toda a definição do produto.

Para agentes de IA 🤖: confira instruções no arquivo [`AGENTS.md`](AGENTS.md).

Progresso e escopo do MVP: [`CHECKLIST.md`](CHECKLIST.md).

## Docs

| Documento                           | Descrição                           |
| ----------------------------------- | ----------------------------------- |
| [Produto](docs/product.md)          | Problema, proposta, público         |
| [Arquitetura](docs/architecture.md) | Ports/adapters, estados, fluxos     |
| [Glossário](docs/glossary.md)       | Termos do domínio                   |
| [Riscos](docs/risks.md)             | Riscos analisados e mitigações      |
| [Decisões](docs/decisions.md)       | Decisões de arquitetura (ADRs)      |
| [Comandos](docs/commands.md)        | Documentação de comandos do Discord |
| [Deploy](docs/deploy.md)            | CDK, ECR, Fargate e secrets         |
| [Smoke test](docs/smoke-test.md)    | Validação manual pós-deploy         |

## Comandos no Discord

| Comando   | Intenção                                             |
| --------- | ---------------------------------------------------- |
| `/start`  | Inicia o Game Server                                 |
| `/stop`   | Encerra o Game Server ativo                          |
| `/status` | Informa estado, jogo, endereço de conexão (IP), etc. |

## Desenvolvimento

Requisitos: Node.js 24+ e [pnpm](https://pnpm.io/).

```bash
pnpm install
pnpm test
pnpm test:coverage
pnpm lint
pnpm typecheck
```

Variáveis locais: [`.env.example`](.env.example). Deploy na AWS: [`docs/deploy.md`](docs/deploy.md).

```bash
pnpm --filter @lghs/control-plane build
pnpm --filter @lghs/control-plane start
```

Monorepo: `apps/control-plane`, `packages/core`, `packages/adapters/*`, `infra`.
