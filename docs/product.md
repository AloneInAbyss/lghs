# Visão do produto

## Nome

**LGHS** — *Leonhart's Game Hosting System*

## Problema & Objetivo

Hospedar servidores dedicados de jogos para um grupo de amigos exige, hoje, trabalho manual repetitivo: ligar a máquina, configurar recursos, abrir portas, lembrar o IP, cuidar de saves e backups, e desligar quando ninguém está jogando. Quando o grupo joga títulos diferentes, esse custo operacional se multiplica.

O objetivo do LGHS é **abstrair essa operação** para que o ciclo de vida do servidor seja controlado por comandos no Discord, sem que cada pessoa precise entender a infraestrutura.

## Proposta de valor

- Iniciar e encerrar um servidor de jogo por comandos no Discord
- Indicar qual jogo do catálogo deve subir
- Persistir mundos/saves e fazer backups sem intervenção manual constante
- Desligar automaticamente quando o servidor estiver ocioso (economia de custo e recursos)
- Disponibilizar o status, acesso e configurações do servidor por comandos no Discord

## Público

| Papel              | Descrição                                               |
| ------------------ | ------------------------------------------------------- |
| Operador principal | Dono do Discord/infra; administra o LGHS e permissões   |
| Administradores    | Interagem com qualquer comando (ex.: start/stop/config) |
| Usuários comuns    | Interagem com comandos liberados (ex.: status)          |

O uso primário é para um servidor de Discord pequeno compartilhado entre amigos.

## Modelo de distribuição

- Código **open source**
- Credenciais, tokens e contas de cloud são responsabilidade de quem hospeda
- Qualquer pessoa pode replicar o sistema na própria comunidade
