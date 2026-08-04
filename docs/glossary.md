# Glossário

Termos usados na documentação e no código do LGHS.

| Termo | Definição |
| --- | --- |
| **LGHS** | *Leonhart's Game Hosting System* — o produto/sistema como um todo |
| **Control Plane** | Processo orquestrador, sempre ligado, que ouve o Discord, aplica permissões, controla ciclo de vida, auto-stop, etc. Não é o processo do jogo |
| **Game Server** | Instância de runtime onde o jogo dedicado de fato roda (sob demanda) |
| **Catálogo** | Lista fechada de jogos suportados; cada entrada tem um GameAdapter |
| **GameAdapter** | Adapter que conhece um jogo específico: como instalar/iniciar/parar, portas, saves, healthcheck, configs |
| **ServerProvider** (port) | Abstração para criar/iniciar/parar/redimensionar/obter status e IP do runtime de hospedagem |
| **AWS Adapter** | Implementação do ServerProvider na AWS |
| **StateStore** (port) | Persistência do estado do sistema (servidor ligado?, configs, ACL, idle-timeout, metadados) |
| **SaveStorage** (port) | Persistência de mundos/saves e configs |
| **Idle-timeout** | Tempo sem jogadores após o qual o auto-stop é disparado; configurável via Discord |
| **Auto-stop** | Encerramento automático do Game Server por ociosidade |
| **Mutex global** | Regra de no máximo um Game Server ativo por instalação do LGHS |
| **Admin** | Papel com permissão total aos comandos no Discord |
| **Usuário comum** | Usuário comum com subconjunto de comandos no Discord |
| **Discord Slash Command** | Comando de aplicação do Discord usado como interface do LGHS |
