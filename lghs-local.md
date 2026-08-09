# LGHS Local — decisões de produto e operação

**Status:** decisões da sessão de discovery (aceitas para o perfil local)  
**Nome do perfil:** `lghs-local` (*Leonhart's Game Hosting System* — instalação em hardware próprio)  
**Idioma:** UX em português; código em inglês  
**Stack preferida:** TypeScript (alinhada ao monorepo LGHS)

Este documento registra o acordo para rodar o LGHS em um **PC sobressalente na rede residencial**, controlado pelo Discord, com Minecraft (modpacks) no MVP e extensão futura a outros jogos (ex.: Palworld).

Não substitui [`docs/product.md`](docs/product.md) nem [`docs/architecture.md`](docs/architecture.md) (perfil cloud/AWS atual). Onde houver divergência, a seção [Relação com o LGHS cloud](#relação-com-o-lghs-cloud) deixa explícito o que muda neste perfil.

---

## 1. Problema e objetivo

Grupo pequeno no Discord joga com frequência. Às vezes alguém precisa hospedar o servidor no PC pessoal e manter a máquina ligada. Há um PC ocioso que pode virar host dedicado.

**Objetivo:** ciclo de vida do servidor de jogo o mais automatizado possível, porém configurável — start/stop/status/backup/comandos via Discord — com mínimo atrito para os jogadores conectarem pela internet.

---

## 2. Decisões fechadas

### 2.1 Pessoas e permissões

| Tópico | Decisão |
| --- | --- |
| Tamanho do grupo | 2–4 no dia a dia; pico eventual ~12 |
| `/start` | Qualquer membro do servidor Discord |
| `/stop`, `/backup`, `/cmd` | Apenas role de admin (nome definido na instalação) |
| `/status`, `/list` | Todos |
| Canal | Comandos e anúncios no **mesmo** canal de bots já existente |
| ACL | Roles do Discord bastam (sem cooldown artificial de `/start`) |

### 2.2 Host e disponibilidade

| Tópico | Decisão |
| --- | --- |
| Energia | PC pode ficar 24/7; desligues longos (meses) são ok |
| Cold start | Ligar a máquina → serviços do lghs sobem sozinhos → bot online no Discord (sem script manual) |
| Crash / reboot | Se havia sessão ativa, **ressuscitar automaticamente** o que estava rodando |
| Auto-stop por idle | **Não** no escopo |
| Onde roda o bot | **No mesmo** spare PC |
| SO recomendado | Ubuntu Server + Docker |
| Acesso admin ao host | SSH por chave; operador usa WSL no dia a dia |

### 2.3 Rede e conexão

| Tópico | Decisão |
| --- | --- |
| Exposição | Servidor **aberto na internet** (mínimo atrito; sem VPN obrigatória) |
| Mecanismo | **Port forward** no roteador + **domínio** |
| IP | Residencial dinâmico → **DDNS** |
| DNS / DDNS | **Cloudflare** (domínio + API atualizando o A record) |
| Porta Minecraft | Padrão **25565** |
| Anúncio | Hostname canônico (ex.: `mc.exemplo.com:25565`), não IP cru |
| Whitelist Minecraft | Servidor **aberto** (sem whitelist por padrão) |
| Ops in-game | Configurados **na mão** no pack, se necessário; pouco uso esperado |
| EULA | lghs pode gravar `eula=true` no prepare/start |

**Por que Cloudflare neste caso:** um único lugar para domínio + atualização de IP via API, TTL baixo, sem depender de hostname feio de serviço gratuito de DDNS. Outros provedores funcionam; não há ganho claro em trocar para o uso residencial descrito.

### 2.4 Jogos e instâncias

| Tópico | Decisão |
| --- | --- |
| MVP | **Minecraft com modpacks** (Forge / Fabric / NeoForge) |
| Extensibilidade | Fácil adicionar jogos depois via adapter |
| Próximo candidato | **Palworld** |
| Concorrência | **Uma** instância de jogo ativa por vez (mutex) |
| `/start` com algo rodando | **Recusar** (mensagem clara) |
| `/start` já em `starting`/`running` | **Idempotente:** não dispara novo sinal de inicialização |
| Identidade | `id` técnico (pasta) + nome de exibição no Discord |
| Descoberta | **Scan** de `instances/*/manifest.yml` (ver §3) |

### 2.5 Preparação de modpack (fluxo humano + bot)

Automatizar 100% “baixar no Curse/Modrinth → extrair → bootstrap → ajustar configs/mods” no Discord **não** é meta do MVP: varia demais entre packs e o ajuste fino é humano.

**Modelo aceito:**

1. Preparar/validar o server pack no **PC pessoal**
2. **Sincronizar** a pasta da instância para o host (rsync / SFTP / SCP — não via upload no Discord)
3. Bot **opera** a instância já preparada (`/start`, `/stop`, etc.)

**Layout conceitual no host:**

```text
instances/<instance-id>/
  manifest.yml      # loader, Java, RAM, porta, backups, display name…
  server/           # server pack
  overrides/        # patches que devem sobreviver a updates
  world/            # (ou path declarado) persistência do mundo
  backups/
```

| Fase | Capacidade |
| --- | --- |
| MVP | Import/sync manual → bot opera |
| Depois | `/instance import` por URL ou zip já no host |
| Depois | Update **in-place** preservando `world/` + `overrides/` (com backup obrigatório antes) |
| MVP + depois | Replace/reimport completo da pasta do pack |

As **duas** estratégias de atualização ficam no desenho: `replace` e `update-in-place`. No MVP prioriza-se o fluxo replace/sync; in-place vem em seguida com o layout acima já previsto.

### 2.6 Runtime, Java, console

| Tópico | Decisão |
| --- | --- |
| Isolamento do processo | **Containers (Docker)** com volume/bind mount da instância (ver §4) |
| Java | lghs **instala e gerencia** a versão por instância (ex.: 17 / 21) |
| RAM JVM | Declarada no `manifest` da instância |
| Console / comandos ao vivo | **RCON**; exposto no Discord como `/cmd` (admin) |
| Parada | Sempre **parada limpa** (RCON `stop` → espera graceful → encerra container) para reduzir risco de world corrompido |
| Logs | Arquivos **no host** (sem colar logs no Discord no MVP) |

### 2.7 Backups

| Tópico | Decisão |
| --- | --- |
| Gatilhos | **Agendado** + **manual** (`/backup`) |
| Intervalo | Configurável no `manifest` |
| Retenção rolling | ~**7** backups no ciclo |
| Âncoras | Manter obrigatoriamente âncoras mais lentas (ex.: 1 do início do dia + 1 do início da semana) |
| Fuso | `America/Sao_Paulo` |
| Disco cheio | Sem guard especial no MVP (cenário descartado pelo operador) |

### 2.8 Configuração e secrets

| Tópico | Decisão |
| --- | --- |
| Config global do host | `lghs.yml` no disco (domínio, canal, roles, DDNS, paths…) |
| Secrets | `.env` (ou equivalente) **só no host**, nunca no git — token do bot, senha RCON, token Cloudflare, etc. |
| Painel web | Fora de escopo (Discord basta) |

### 2.9 Comandos Discord (MVP)

| Comando | Quem | Intenção |
| --- | --- | --- |
| `/start [instância]` | todos | Sobe a instância (ou a padrão/última, conforme implementação) |
| `/stop` | admin | Parada limpa |
| `/status` | todos | Estado, jogo, endereço |
| `/list` | todos | Instâncias descobertas no scan |
| `/backup` | admin | Snapshot manual |
| `/cmd <…>` | admin | Comando RCON |

### 2.10 Anúncio (tom)

Linha de raciocínio aprovada (texto final pode ser ajustado):

> **ATM10** está online  
> Conecte: `mc.exemplo.com:25565`  
> Pedido por @fulano  

Anunciar também queda/parada no mesmo canal.

### 2.11 Definição de pronto do MVP

- 1 modpack preparado via sync no host  
- `/start`, `/stop`, `/status`, `/list`, `/backup`, `/cmd`  
- Anúncio com domínio no canal de bots  
- Backup manual + agendado com retenção acordada  
- Revive após reboot  
- Cold start: ligar PC → stack no ar  

Domínio Cloudflare ainda será comprado/configurado no setup (não bloqueia o desenho).

---

## 3. Scan de instâncias vs comando `/instance register`

**Decisão:** scan de `instances/*/manifest.yml` é suficiente no MVP.

**Vantagens do scan**

- Disco = fonte da verdade (casa com rsync/SFTP)
- Zero passo extra após copiar a pasta
- Fácil de inspecionar e debugar no SSH

**Quando um comando `register` ajudaria (fase posterior, opcional)**

- Validar o `manifest` na hora e devolver erro legível no Discord
- Marcar instância enabled/disabled sem mover pasta
- Anexar metadados que não se quer no filesystem
- Evitar que pasta pela metade apareça como “jogável”

Enquanto o operador controla o que coloca em `instances/`, scan simples é o melhor custo/benefício.

---

## 4. Por que containers (Docker)?

Decisão recomendada para o lghs-local — não é dogma, é encaixe no caso de uso.

**Vantagens no nosso cenário**

1. **Ciclo de vida limpo** — start/stop/restart previsível; alinha com parada graceful + revive no boot (`restart` policy / unit que sobe o stack).
2. **Java por instância** — imagem ou camada com Temurin 17 vs 21 sem poluir o SO host com várias JDKs “soltas”.
3. **Isolamento** — mods, libs nativas e processos do jogo não espalham lixo no Ubuntu base.
4. **Portas e recursos** — mapear `25565` e, se um dia precisar, tetos de CPU/RAM por container.
5. **Mesmo padrão para outros jogos** — Palworld e afins tendem a imagens dedicadas; o control plane continua falando “suba este runtime”, não “invente um systemd por título”.
6. **Bind mount da pasta da instância** — você continua editando/syncando arquivos no host como pasta normal; o container só executa.

**Trade-offs honestos**

- Primeiro setup Docker + permissões de volume exige um pouco mais que “rodar o `.sh` do pack”.
- Packs que assumem paths absolutos ou GUI de launcher podem precisar de ajuste no `manifest`/entrypoint.
- Debug emergencial às vezes usa `docker logs` / `docker exec` em vez de um tmux clássico — mitigado por RCON + logs em arquivo no volume.

**Alternativa descartada para o MVP:** processos nus + systemd por instância. Funciona, mas complica o gerenciamento de Java, cleanup e o caminho para o segundo jogo.

**Modelo prático:** container efêmero (ou recriável) + **dados da instância no host** (bind mount). Assim o bot opera o runtime e o humano opera os arquivos.

---

## 5. Arquitetura lógica (perfil local)

```text
Discord (slash commands)
        │
        ▼
┌───────────────────┐
│  Control Plane    │  TypeScript, sempre ligado (mesmo PC)
│  - permissões     │
│  - mutex          │
│  - anúncios       │
│  - backups cron   │
└─────────┬─────────┘
          │
          ├─► InstanceStore (scan disco + estado local)
          ├─► DnsProvider (Cloudflare DDNS)
          ├─► RuntimeProvider (Docker)
          └─► GameAdapter (Minecraft modpack + RCON)
                      │
                      ▼
              containers + volumes
              instances/<id>/…
```

Config global: `lghs.yml` + secrets em `.env`.

---

## 6. Relação com o LGHS cloud

O repositório já descreve um MVP **AWS** (Control Plane em Fargate, Game Server em EC2, estado em DynamoDB, saves em S3). O **lghs-local** é o mesmo produto mental (Discord + mutex + adapters de jogo), com outros adapters de infraestrutura:

| Concern | Cloud (docs atuais) | Local (este doc) |
| --- | --- | --- |
| Control Plane | Fargate | Processo/serviço no spare PC |
| Runtime do jogo | EC2 sob demanda | Container Docker no mesmo host |
| State store | DynamoDB | Estado local (arquivo/sqlite/etc. — a definir na implementação) |
| Saves | S3 entre sessões | Disco local + backups na instância |
| DNS estável | ADR adiada | **No MVP local** (Cloudflare) |
| `/start` | Admin | **Todos** |
| Auto-stop idle | ADR adiada / desejável cloud | **Fora** do local por enquanto |
| Catálogo MVP | Minecraft Java | Minecraft **modpack** + sync humano |

Ports & adapters continuam válidos: o núcleo não deve falar SDK Docker/Cloudflare/Discord diretamente nas regras de negócio.

Quando estes requisitos locais forem promovidos à definição oficial do produto, deve-se atualizar `docs/*` e ADRs correspondentes — este arquivo é o **brief congelado da discovery** até essa promoção.

---

## 7. Fora de escopo (explícito)

- Painel web  
- VPN obrigatória para jogar  
- Multi-host / vários jogos ao mesmo tempo  
- Install completo de modpack só pelo Discord no MVP  
- Auto-stop por ausência de players  
- Guard de disco baixo  

---

## 8. Próximos passos (depois deste doc)

1. Promover decisões relevantes para `docs/product.md`, `docs/architecture.md`, `docs/commands.md` e ADRs (ou manter fork conceitual “local provider”).  
2. Comprar/configurar domínio na Cloudflare + DDNS.  
3. Preparar Ubuntu Server + Docker + SSH no spare PC.  
4. Implementar adapters locais (Docker runtime, state local, Cloudflare DNS, Minecraft modpack/RCON).  
5. Validar MVP com um modpack real via sync WSL → host.

---

## 9. Changelog da discovery

| Data | Nota |
| --- | --- |
| 2026-08-09 | Sessão Q&A: blocos A–I; brief `lghs-local` gravado na raiz do repositório |
