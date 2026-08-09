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

## Comandos no Discord

| Comando   | Intenção                                             |
| --------- | ---------------------------------------------------- |
| `/start`  | Inicia o Game Server                                 |
| `/stop`   | Encerra o Game Server ativo                          |
| `/status` | Informa estado, jogo, endereço de conexão (IP), etc. |

## Desenvolvimento

Requisitos: Node.js e [pnpm](https://pnpm.io/).

```bash
pnpm install
pnpm test
pnpm test:coverage
pnpm lint
pnpm typecheck
```

Variáveis de ambiente: copie [`.env.example`](.env.example). Subir o Control Plane (requer Discord + AWS configurados):

```bash
pnpm --filter @lghs/control-plane build
pnpm --filter @lghs/control-plane start
```

Monorepo: `apps/control-plane`, `packages/core`, `packages/adapters/*`, `infra`.
