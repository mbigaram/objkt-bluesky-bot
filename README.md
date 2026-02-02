# objkt.com → Bluesky Bot

Bot automatizado para postar suas artes NFT do [objkt.com](https://objkt.com) no [Bluesky](https://bsky.app) com agendamento personalizável.

<img width="667" height="667" alt="image" src="https://github.com/user-attachments/assets/4758e44e-c573-4546-9c9a-d5dd62ebbb7c" /><img width="519" height="519" alt="image" src="https://github.com/user-attachments/assets/e6184885-3e67-4153-a5c8-b6ec01143fb6" />





## ✨ Funcionalidades

- 🎨 **Busca automática de artes** do objkt.com via GraphQL API
- 📅 **Agendamento flexível** com até 4 horários configuráveis
- 💬 **Mensagens personalizadas** para cada postagem
- 🖼️ **Suporte a múltiplos formatos** (PNG, GIF, MP4, etc.)
- 💰 **Exibição de preços** em XTZ automaticamente
- 🔄 **Rotação inteligente** de artes nas postagens
- 💾 **Configuração persistente** no navegador
- 🎯 **Interface Neo-Brutalism** moderna e ousada

## 🚀 Como Usar

### 1. Configuração Inicial

1. **Endereço Tezos**: Insira seu endereço Tezos (tz1...) que contém suas artes no objkt.com
2. **Handle do Bluesky**: Seu handle completo (ex: `seu-nome.bsky.social`)
3. **Senha do Bluesky**: Recomendado usar um [App Password](https://bsky.app/settings/app-passwords) gerado nas configurações

### 2. Personalização

- **Mensagem Personalizada**: Adicione uma mensagem que aparecerá em todas as postagens
  - Formato final: `[Sua Mensagem] - [Nome da Arte] - [Preço] XTZ`
  - Exemplo: `Good morning! ☀️ - Digital Dreams #42 - 15.5 XTZ`

### 3. Horários de Postagem

- Configure até **4 horários** diferentes
- Ative/desative horários individualmente
- O bot rotaciona automaticamente entre suas artes disponíveis

### 4. Ativação

1. Clique em **"Salvar Configuração"**
2. Clique em **"Ativar Bot"**
3. O bot buscará suas artes e começará a postar nos horários configurados

## 🛠️ Tecnologias

- **React 19** - Framework frontend
- **TypeScript** - Type safety
- **Tailwind CSS 4** - Estilização
- **shadcn/ui** - Componentes UI
- **objkt.com GraphQL API** - Busca de artes NFT
- **Bluesky AT Protocol** - Postagens automáticas

## 📦 APIs Utilizadas

### objkt.com API

- **Endpoint**: `https://data.objkt.com/v3/graphql`
- **Funcionalidade**: Busca artes NFT de um endereço Tezos
- **Limites**: 120 requisições/minuto, máximo 500 resultados

### Bluesky API (AT Protocol)

- **Endpoint**: `https://bsky.social/xrpc`
- **Funcionalidade**: Autenticação e criação de posts
- **Suporte**: Texto + imagens/vídeos

## 🎨 Design

O bot utiliza o estilo **Neo-Brutalism Digital**:

- **Cores**: Preto profundo (#0A0A0A), Verde neon (#00FF87), Roxo (#8B5CF6)
- **Tipografia**: Space Grotesk (display), Inter (body), JetBrains Mono (mono)
- **Elementos**: Bordas grossas (4px), sombras duras deslocadas, geometria ousada
- **Filosofia**: Contraste extremo, hierarquia clara, interações diretas

## 📝 Estrutura do Projeto

```
objkt-bluesky-bot/
├── client/
│   ├── src/
│   │   ├── components/    # Componentes UI (shadcn/ui)
│   │   ├── lib/
│   │   │   ├── objkt.ts   # Integração objkt.com API
│   │   │   ├── bluesky.ts # Integração Bluesky API
│   │   │   └── bot.ts     # Lógica principal do bot
│   │   ├── pages/
│   │   │   └── Home.tsx   # Página principal
│   │   └── index.css      # Estilos globais
│   └── public/            # Assets estáticos
├── README.md
└── package.json
```

## 🔒 Segurança

- **Credenciais locais**: Todas as configurações são salvas apenas no seu navegador (localStorage)
- **App Passwords**: Recomendado usar App Passwords do Bluesky ao invés da senha principal
- **Sem backend**: Aplicação 100% client-side, sem servidor intermediário

## ⚠️ Limitações

- O bot funciona apenas enquanto a página estiver aberta no navegador
- Formatos de vídeo podem ter limitações de tamanho no Bluesky
- Necessário manter a aba aberta para o agendamento funcionar

## 🤝 Contribuindo

Contribuições são bem-vindas! Sinta-se à vontade para:

1. Fazer fork do projeto
2. Criar uma branch para sua feature (`git checkout -b feature/MinhaFeature`)
3. Commit suas mudanças (`git commit -m 'Adiciona MinhaFeature'`)
4. Push para a branch (`git push origin feature/MinhaFeature`)
5. Abrir um Pull Request

## 📄 Licença

MIT License - sinta-se livre para usar este projeto como quiser!

## 🔗 Links Úteis

- [objkt.com](https://objkt.com) - Marketplace de NFTs Tezos
- [Bluesky](https://bsky.app) - Rede social descentralizada
- [objkt.com API Docs](https://data.objkt.com) - Documentação da API
- [AT Protocol Docs](https://docs.bsky.app) - Documentação do Bluesky

## 💡 Dicas

1. **App Password**: Sempre use um App Password do Bluesky para maior segurança
2. **Horários**: Escolha horários estratégicos para máximo engajamento
3. **Mensagens**: Personalize suas mensagens para cada tipo de arte
4. **Teste**: Use o botão de teste nas artes para verificar antes de ativar o bot

---

Desenvolvido com ❤️ para a comunidade de arte NFT
