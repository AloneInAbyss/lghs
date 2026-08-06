# Comandos no Discord

Documentação dos **Discord Slash Commands** do LGHS.

---

## Comandos

### `/start [game]`

| Campo | Conteúdo |
| --- | --- |
| **Descrição** | Inicia o servidor de um jogo |
| **Permissão** | Admin |
| **Pré-condições** | Estado: `stopped` (ou `error` sem runtime ativo) |
| **Observações** | Caso não informe o game, utiliza o último selecionado; responde com status e IP de conexão |

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

### `/status`

| Campo | Conteúdo |
| --- | --- |
| **Descrição** | Informa estado, jogo, endereço de conexão (IP + porta), etc. |
| **Permissão** | Usuário comum |
| **Pré-condições** | Nenhuma |
| **Observações** | Disponível para qualquer usuário do servidor Discord |
