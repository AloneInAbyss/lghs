# Riscos

Lista de riscos conhecidos e mitigações importantes para a integridade do sistema.

## R-001 — Conexão sem autenticação em IP público

- **Descrição:** Em jogos como Minecraft, que não possuem autenticação definida por padrão, a livre conexão por IP público pode comprometer o servidor.
- **Impacto:** Qualquer pessoa que obtenha o IP pode entrar; nicks podem ser impersonados (inclusive de admins); grief e perda de mundo.
- **Mitigações:**
  - Auth por senha no jogo
  - Configuração de whitelist no jogo
  - No caso de nenhuma das opções acima ser possível, utilizar plugin ou mecanismo dentro do adapter
- **Status:** Pendente (precisa alterar o ADR)

## R-002 — Custo variável do Game Server

- **Descrição:** Não há teto mensal definido. Custo depende de tamanho da instância, horas ligadas e uso do storage.
- **Impacto:** Custo adicional caso o servidor permaneça ligado por erro ou por gasto desnecessário de recursos.
- **Mitigações:**
  - definir orçamento dentro do provedor cloud
  - auto-stop
  - apenas um servidor ativo por vez
  - predefinições do tamanho do servidor na hospedagem (small/medium/large)
- **Status:** Aceito (ADR-004, ADR-008, ADR-009)

## R-003 — Backup a quente e integridade de saves

- **Descrição:** Backup durante execução pode corromper saves se o jogo não fizer flush adequado.
- **Impacto:** Perda de dados e backups.
- **Mitigações:**
  - GameAdapter deve coordenar procedimento seguro antes da cópia
  - Backup obrigatório antes de interromper o runtime
- **Status:** Aceito (ADR-011)

## R-004 — Self-host open source e a gestão de secrets

- **Descrição:** O sistema usa muitas credenciais pessoais — Tokens Discord, chaves do cloud provider e credenciais de storage — que não podem vazar no repositório nem em logs.
- **Impacto:** Comprometimento da conta Discord/cloud provider.
- **Mitigações:**
  - Manter secrets fora do git
  - Utilizar arquivo de instrução para agentes de IA com boas práticas de segurança
- **Status:** Aceito (ADR-001, ADR-002)

## R-007 — Dependência do Control Plane contínuo

- **Descrição:** Se o Control Plane cair, comandos e auto-stop/save periódico param (o Game Server pode continuar ligado).
- **Impacto:** Custo sem supervisão; impossibilidade de `/stop` via Discord até recuperação.
- **Mitigação:**
  - Restart automático do Control Plane
  - Envio de alertas através de serviço de observabilidade
- **Status:** Pendente (definir o serviço de observabilidade e como enviar alertas)
