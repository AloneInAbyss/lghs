# Smoke test — LGHS

Checklist manual após deploy (infra + imagem + secrets). Objetivo: validar o caminho feliz sem automatização de E2E na nuvem.

## Antes de começar

- [ ] Stack `LghsStack` criada com sucesso
- [ ] Secrets `/lghs/discord-token` e `/lghs/discord-alarm-webhook` atualizados (não são `REPLACE_ME`)
- [ ] Imagem `lghs-control-plane:latest` no ECR e serviço ECS com `runningCount = 1`
- [ ] Bot convidado ao guild com permissões de slash commands
- [ ] Role de admin do Discord = `DISCORD_ADMIN_ROLE_ID` usado no deploy

## 1. Control Plane vivo

- [ ] `/status` no Discord responde com estado `stopped` (ou o estado atual) em poucos segundos
- [ ] Logs do Fargate sem loop de crash (`Essential container exited`)

## 2. Start

Com usuário **admin**:

- [ ] `/start game:minecraft` faz defer e, após alguns minutos, responde com IP e porta `25565`
- [ ] `/status` mostra `running`, o mesmo jogo e o endereço de conexão
- [ ] Consola AWS: existe uma instância EC2 com o SG do Game Server e IP público
- [ ] Cliente Minecraft Java consegue entrar (modo offline / `online-mode=false`)

Com usuário **comum** (sem role admin):

- [ ] `/start` é recusado
- [ ] `/status` continua permitido

## 3. Stop

- [ ] `/stop` (admin) encerra a sessão e responde com status `stopped`
- [ ] Instância EC2 é terminada
- [ ] Objetos de save aparecem no bucket S3 sob o prefixo `saves/minecraft/` (ou equivalente da stack)

## 4. Persistência de save

- [ ] `/start minecraft` de novo restaura o mundo anterior (alteração feita na sessão anterior ainda presente)
- [ ] `/stop` novamente sem erro

## 5. Alarme (opcional)

- [ ] Forçar `desiredCount = 0` no serviço ECS por ~2 minutos
- [ ] Mensagem de alarme chega no canal do webhook Discord
- [ ] Restaurar `desiredCount = 1`

## Critério de sucesso

Todos os itens das seções 1–4 passam. A seção 5 valida o caminho de alerta com Control Plane indisponível (ADR-015).
