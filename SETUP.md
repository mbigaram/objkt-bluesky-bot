# 🚀 Guia de Instalação e Execução

## Pré-requisitos

Antes de começar, certifique-se de ter instalado:

- **Node.js** (v18+): https://nodejs.org/
- **pnpm** (recomendado): `npm install -g pnpm`
- **Git**: https://git-scm.com/
- **VSCode** (opcional): https://code.visualstudio.com/

## 1. Clonar o Repositório

```bash
git clone https://github.com/mbigaram/objkt-bluesky-bot.git
cd objkt-bluesky-bot
```

## 2. Instalar Dependências

```bash
# Usando pnpm (recomendado)
pnpm install

# Ou usando npm
npm install

# Ou usando yarn
yarn install
```

## 3. Executar em Desenvolvimento

```bash
# Usando pnpm
pnpm dev

# Ou usando npm
npm run dev

# Ou usando yarn
yarn dev
```

O servidor iniciará em `http://localhost:5173` (ou outra porta se 5173 estiver ocupada).

## 4. Acessar o Bot

1. Abra seu navegador e acesse: **http://localhost:5173**
2. Você verá a interface do bot com os campos de configuração

## 5. Acessar o Dashboard

Após ativar o bot e fazer algumas postagens, acesse o dashboard em:
**http://localhost:5173/dashboard/**

## 📋 Estrutura de Pastas

```
objkt-bluesky-bot/
├── client/
│   ├── src/
│   │   ├── lib/
│   │   │   ├── objkt.ts      # Integração com API objkt.com
│   │   │   ├── bluesky.ts    # Integração com API Bluesky
│   │   │   └── bot.ts        # Lógica principal do bot
│   │   ├── pages/
│   │   │   └── Home.tsx      # Interface principal
│   │   ├── components/       # Componentes UI (shadcn/ui)
│   │   ├── App.tsx           # Roteador principal
│   │   └── index.css         # Estilos globais
│   ├── public/
│   │   └── dashboard/        # Dashboard estático
│   └── index.html
├── package.json
└── README.md
```

## 🔧 Comandos Disponíveis

```bash
# Desenvolvimento
pnpm dev              # Inicia servidor de desenvolvimento

# Build
pnpm build            # Cria build otimizado para produção

# Preview
pnpm preview          # Visualiza build de produção localmente

# Verificação
pnpm check            # Verifica tipos TypeScript
pnpm format           # Formata código com Prettier
```

## 🔑 Configuração de Credenciais

### objkt.com

1. Vá para https://objkt.com/
2. Conecte sua carteira Tezos
3. Copie seu **endereço Tezos** (começa com `tz1...`)
4. Cole no campo "Endereço Tezos (objkt.com)" no bot

### Bluesky

1. Vá para https://bsky.app/
2. Crie uma conta ou faça login
3. Vá para **Settings** → **App Passwords**
4. Clique em **"Create App Password"**
5. Dê um nome (ex: "objkt-bot")
6. **Copie a senha gerada** (você só verá uma vez!)
7. Cole no campo "Senha/App Password do Bluesky" no bot

**Seu handle** é o nome da sua conta (ex: `seu-nome.bsky.social`)

## 🐛 Troubleshooting

### Erro: "Cannot find module 'react'"
```bash
# Reinstale as dependências
pnpm install
# Ou limpe o cache
pnpm store prune
pnpm install
```

### Porta 5173 já está em uso
```bash
# O Vite usará automaticamente a próxima porta disponível
# Ou especifique uma porta diferente
pnpm dev -- --port 3000
```

### Erro de autenticação no Bluesky
- Verifique se está usando um **App Password** (não a senha principal)
- Certifique-se de que o handle está correto (com `.bsky.social`)
- Gere um novo App Password se necessário

### Erro ao buscar artes do objkt.com
- Verifique se o endereço Tezos está correto (começa com `tz1...`)
- Certifique-se de que tem artes na sua conta
- Verifique sua conexão com a internet

## 📚 Documentação das APIs

### objkt.com GraphQL API
- **Documentação**: https://data.objkt.com/
- **Endpoint**: `https://data.objkt.com/v3/graphql`
- **Sem autenticação necessária**

### Bluesky AT Protocol
- **Documentação**: https://docs.bsky.app/
- **Endpoint**: `https://bsky.social/xrpc`
- **Requer autenticação com handle + senha**

## 🎨 Personalização

### Mudar Cores do Tema

Edite `client/src/index.css` e procure por:

```css
:root {
  --primary: #00FF87;        /* Verde neon */
  --secondary: #8B5CF6;      /* Roxo */
  --background: #0A0A0A;     /* Preto profundo */
  --foreground: #FFFFFF;     /* Branco */
}
```

### Adicionar Novos Horários

Edite `client/src/pages/Home.tsx` e procure por:

```typescript
const [schedules, setSchedules] = useState<ScheduleTime[]>([
  { id: 1, time: "09:00", enabled: true },
  { id: 2, time: "13:00", enabled: true },
  // Adicione mais horários aqui
]);
```

## 📦 Build para Produção

```bash
# Criar build otimizado
pnpm build

# Testar build localmente
pnpm preview

# Fazer deploy (depende do seu host)
# Veja instruções de deploy em README.md
```

## 🤝 Suporte

Se encontrar problemas:

1. Verifique se todas as dependências estão instaladas
2. Limpe o cache: `pnpm store prune`
3. Reinstale: `pnpm install`
4. Abra uma issue no GitHub: https://github.com/mbigaram/objkt-bluesky-bot/issues

---

**Pronto para começar!** 🚀

Qualquer dúvida, consulte o README.md ou a documentação das APIs.
