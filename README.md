# LGHS

**LGHS** (*Leonhart's Game Hosting System*) é um sistema para controlar servidores dedicados de jogos via Discord.

Para humanos 🥸: confira nos [/docs](#docs) toda a definição do produto.

Para agentes de IA 🤖: confira instruções no arquivo [`AGENTS.md`](AGENTS.md).

## Docs

| Documento | Descrição |
| --- | --- |
| [Produto](docs/product.md) | Problema, proposta, público |
| [Arquitetura](docs/architecture.md) | Ports/adapters, estados, fluxos |
| [Glossário](docs/glossary.md) | Termos do domínio |
| [Riscos](docs/risks.md) | Riscos analisados e mitigações |
| [Decisões](docs/decisions.md) | Decisões de arquitetura (ADRs) |
| [Comandos](docs/commands.md) | Documentação de comandos do Discord |

## Comandos no Discord

| Comando | Intenção |
| --- | --- |
| `/start` | Inicia o Game Server |
| `/stop` | Encerra o Game Server ativo |
| `/status` | Informa estado, jogo, endereço de conexão, tempo em inatividade, etc. |
| `/config idle <minutos>` | Ajusta o tempo em inatividade para encerrar o servidor |
