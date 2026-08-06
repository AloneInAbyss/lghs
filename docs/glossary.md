# Glossário

Termos usados na documentação e no código do LGHS.

| Termo | Definição |
| --- | --- |
| **LGHS** | *Leonhart's Game Hosting System* — o produto/sistema como um todo |
| **Control Plane** | Processo orquestrador, sempre ligado, que ouve o Discord, aplica permissões, controla ciclo de vida, etc. Não é o processo do jogo. |
| **Fargate** | Modo de ECS em que a AWS gerencia o compute do container |
| **ECS** | Elastic Container Service — orquestra containers na AWS |
| **Game Server** | Instância de runtime onde o jogo dedicado de fato roda (sob demanda) |
| **Catálogo** | Lista fechada de jogos suportados; cada entrada tem um GameAdapter |
| **GameAdapter** | Adapter que conhece um jogo específico: como instalar/iniciar/parar, portas, saves, healthcheck, configs |
| **GameSession** | Sessão de supervisão num runtime ativo: health, flush, shutdown, playerCount |
| **BootstrapPlan** | Plano tipado do adapter que o ServerProvider serializa no user-data da EC2 |
| **ServerProvider** (port) | Abstração para criar/iniciar/parar/redimensionar/obter status e IP do runtime de hospedagem |
| **EC2 Adapter** | Implementação do ServerProvider na AWS via EC2 On-Demand (ADR-017) |
| **User-data** | Script de bootstrap injetado na criação da EC2 (cloud-init): prepara Java, save, jar e sobe o jogo |
| **SSM** | AWS Systems Manager — canal operacional na instância sem SSH público |
| **StateStore** (port) | Persistência do estado do sistema (servidor ligado?, configs, metadados) |
| **SaveStorage** (port) | Persistência de mundos/saves e configs do jogo entre sessões |
| **Estado do Game Server** | `stopped`, `starting`, `running`, `stopping`, ou `error` |
| **Mutex global** | Regra de no máximo um Game Server ativo por instalação do LGHS |
| **ACL** | Access Control List, define as permissões de cada recurso por usuário |
| **Admin** | Papel com permissão total aos comandos no Discord |
| **Usuário comum** | Usuário comum com subconjunto de comandos no Discord |
| **Discord Slash Command** | Comando de aplicação do Discord usado como interface do LGHS |
| **ADR** | Architectural Decision Record, registra todas as decisões tomadas para o design do sistema |
| **IaC** | Infrastructure as Code — infraestrutura declarada e versionada em código |
| **CDK** | AWS Cloud Development Kit — IaC em TypeScript (ou outra linguagem) que gera CloudFormation |
