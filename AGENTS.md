# Instruções para agentes de IA

A **definição do produto** vive em [`docs/`](docs/). Este arquivo não a substitui.

## Leia estes docs antes de codar

Em mudanças amplas, leia na ordem abaixo. Em edits locais e pequenos, leia só o doc relevante.

1. [`README.md`](README.md)
2. [`CHECKLIST.md`](CHECKLIST.md)
3. [`docs/product.md`](docs/product.md)
4. [`docs/architecture.md`](docs/architecture.md)
5. [`docs/commands.md`](docs/commands.md)
6. [`docs/decisions.md`](docs/decisions.md)
7. [`docs/risks.md`](docs/risks.md)
8. [`docs/glossary.md`](docs/glossary.md)

## Regras de engenharia

- Código em **inglês**; documentação em **português**
- Não commitar secrets (tokens, chaves, webhooks, credenciais)
- Respeitar a arquitetura de ports/adapters — o núcleo não fala com SDKs de fornecedor diretamente
- Preferir editar docs existentes a criar documentos paralelos redundantes

### Comentários no código

Comentários só quando forem **realmente úteis**. Preferir código claro a comentário que narra o óbvio.

- **Não** descrever o que o código já expressa (renomear/extrair em vez de comentar)
- **Sim** explicar o *motivo* de uma decisão não óbvia, regra de negócio atípica ou workaround
- Ser **breve e claro**; comentários em inglês (como o código)
- Ao mudar a regra no código, **atualizar ou remover** o comentário correspondente — comentário desatualizado é pior que nenhum
- Quando for indicar uma implementação futura, utilize o prefixo `TODO:`
- Não referenciar etapas do [`CHECKLIST.md`](CHECKLIST.md) (ex.: "stage 2", "etapa 3") em comentários ou mensagens no código — o progresso vive no checklist, não no fonte

## Regras de comportamento

- Não expandir escopo sem pedido explícito do usuário
- Não escreva citações a outros documentos desnecessariamente (ADRs, riscos) a menos que seja realmente útil naquele contexto
- Quando um requisito for alterado, verifique se é necessário atualizar alguma documentação em /docs
