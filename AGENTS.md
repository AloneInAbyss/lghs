# Instruções para agentes de IA

A **definição do produto** vive em [`docs/`](docs/). Este arquivo não a substitui.

## Leia estes docs antes de codar

Em mudanças amplas, leia na ordem abaixo. Em edits locais e pequenos, leia só o doc relevante.

1. [`README.md`](README.md)
2. [`docs/product.md`](docs/product.md)
3. [`docs/architecture.md`](docs/architecture.md)
4. [`docs/commands.md`](docs/commands.md)
5. [`docs/decisions.md`](docs/decisions.md)
6. [`docs/risks.md`](docs/risks.md)
7. [`docs/glossary.md`](docs/glossary.md)

## Regras de engenharia

- Código em **inglês**; documentação em **português**
- Não commitar secrets (tokens, chaves, webhooks, credenciais)
- Respeitar a arquitetura de ports/adapters — o núcleo não fala com SDKs de fornecedor diretamente
- Não expandir escopo sem pedido explícito do usuário
- Preferir editar docs existentes a criar documentos paralelos redundantes
