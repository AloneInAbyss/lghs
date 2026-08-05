# Comandos no Discord

Documentação dos **Discord Slash Commands** do LGHS. Cada comando abaixo deve seguir o template; copie o bloco e preencha um por comando.

---

<!-- Template -->

<!-- ### `/nome`

| Campo | Conteúdo |
| --- | --- |
| **Descrição** | O que o comando faz, em uma frase |
| **Permissão** | Admin / Usuário comum |
| **Pré-condições** | Estado ou contexto necessário antes de executar (ex.: servidor parado) |
| **Opções** | Ver tabela abaixo (ou “nenhuma”) |
| **Comportamento** | Passos principais no Control Plane |
| **Resposta de sucesso** | O que o Discord mostra quando dá certo |
| **Erros esperados** | Falhas conhecidas e mensagem/comportamento |
| **Observações** | Assíncrono? Ephemeral? Relação com outros comandos? | -->

<!-- #### Opções

| Nome | Tipo | Obrigatório | Descrição | Exemplo |
| --- | --- | --- | --- | --- |
| `…` | string / integer / … | sim / não | … | `…` | -->

## Comandos

### `/start [game]`

| Campo | Conteúdo |
| --- | --- |
| **Descrição** | Inicia o servidor de um jogo |
| **Permissão** | Admin |
| **Pré-condições** | Estado: `stopped` (ou `error` sem runtime ativo) |
| **Observações** | Caso não informe o game, utiliza o último selecionado |

#### Opções

| Nome | Tipo | Obrigatório | Descrição | Exemplo |
| --- | --- | --- | --- | --- |
| `game` | texto | não | Nome do jogo a ser iniciado | `/start minecraft` |

### `/stop`

| Campo | Conteúdo |
| --- | --- |
| **Descrição** | Encerra o Game Server ativo |
| **Permissão** | Admin |
| **Pré-condições** | Estado: `running` ou `error` |
| **Observações** | Persiste save e configs antes de destruir/parar o runtime |

#### Opções

Nenhuma.

### `/status`

| Campo | Conteúdo |
| --- | --- |
| **Descrição** | Informa estado, jogo, endereço de conexão, tempo em inatividade, etc. |
| **Permissão** | Usuário comum |
| **Pré-condições** | Nenhuma |
| **Observações** | Disponível para qualquer usuário do servidor Discord |

#### Opções

Nenhuma.

### `/config idle <minutos>`

| Campo | Conteúdo |
| --- | --- |
| **Descrição** | Ajusta o tempo de inatividade para encerrar o servidor (auto-stop) |
| **Permissão** | Admin |
| **Pré-condições** | Nenhuma |
| **Observações** | Valor `0` desativa o auto-stop; persistido no StateStore |

#### Opções

| Nome | Tipo | Obrigatório | Descrição | Exemplo |
| --- | --- | --- | --- | --- |
| `idle` | inteiro | sim | Minutos sem jogadores até o auto-stop | `/config idle 30` |
