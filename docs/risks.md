# Riscos

Lista de riscos conhecidos e mitigações importantes para a integridade do sistema.

## R-001 — Conexão sem autenticação em IP público

- **Descrição:** Em jogos como Minecraft, que não possuem autenticação definida por padrão, a livre conexão por IP público pode comprometer o servidor.
- **Impacto:** Qualquer pessoa que obtenha o IP pode entrar; nicks podem ser impersonados (inclusive de admins); grief e perda de mundo.
- **Mitigações:**
  - Auth por senha no jogo
  - Configuração de whitelist no jogo
  - No caso de nenhuma das opções acima ser possível, utilizar plugin ou mecanismo dentro do adapter
- **Status:** Aceito (ADR-006, ADR-007)

## R-002 — Custo variável do Game Server

- **Descrição:** Não há teto mensal definido. Custo depende de tamanho da instância, horas ligadas e uso do storage.
- **Impacto:** Custo adicional caso o servidor permaneça ligado por erro ou por gasto desnecessário de recursos.
- **Mitigações:**
  - definir orçamento dentro do provedor cloud
  - auto-stop
  - apenas um servidor ativo por vez
  - predefinições do tamanho do servidor na hospedagem (small/medium/large)
- **Status:** Aceito (ADR-004, ADR-008, ADR-009)

## R-003 — Cópia a quente e integridade de saves

- **Descrição:** Saves e configs sobem ao `SaveStorage` apenas no `/stop` e no auto-stop. Se o jogo não fizer flush adequado antes da cópia, o upload pode ficar inconsistente ou corrompido.
- **Impacto:** Perda de progresso desde o último stop bem-sucedido; save inutilizável na próxima sessão.
- **Mitigações:**
  - GameAdapter deve coordenar procedimento seguro de flush/save antes da cópia
  - Upload obrigatório de save/configs antes de interromper o runtime
- **Status:** Aceito (ADR-011)

## R-004 — Self-host open source e a gestão de secrets

- **Descrição:** O sistema usa muitas credenciais pessoais — Tokens Discord, chaves do cloud provider e credenciais de storage — que não podem vazar no repositório nem em logs.
- **Impacto:** Comprometimento da conta Discord/cloud provider.
- **Mitigações:**
  - Manter secrets fora do git
  - Utilizar arquivo de instrução para agentes de IA com boas práticas de segurança
- **Status:** Aceito (ADR-001, ADR-002)

## R-005 — Dependência do Control Plane contínuo

- **Descrição:** Se o Control Plane cair, comandos e integrações param (mas o Game Server pode continuar ligado).
- **Impacto:** Custo sem supervisão; impossibilidade de `/stop` via Discord até recuperação; fluxo de save não ocorre.
- **Mitigação:**
  - Restart automático do Control Plane
  - CloudWatch Logs + Alarms
  - Alertas no Discord através de caminho mínimo (Lambda → webhook)
- **Status:** Aceito (ADR-015)
