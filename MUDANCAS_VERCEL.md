# Resumo das Mudanças para Deploy na Vercel

## 📦 Arquivos Criados

### Pasta `/api` (Funções Serverless)

1. **`api/bot-config.ts`** - Contém toda a lógica do bot adaptada para rodar no ambiente serverless da Vercel. Inclui:
   - Funções para buscar artes do objkt.com
   - Autenticação com o Bluesky
   - Upload de mídia e criação de posts
   - Função principal `postRandomArtwork()` que seleciona e posta uma arte aleatória

2. **`api/post.ts`** - Endpoint principal que será chamado pelos Cron Jobs da Vercel
   - Rota: `/api/post`
   - Lê as configurações das variáveis de ambiente
   - Executa a postagem automática
   - Retorna JSON com status da operação

3. **`api/test.ts`** - Endpoint para testar a configuração
   - Rota: `/api/test`
   - Verifica autenticação do Bluesky
   - Verifica se as artes estão sendo encontradas
   - Útil para debug antes de ativar o agendamento

4. **`api/tsconfig.json`** - Configuração TypeScript específica para as funções API

### Arquivos de Configuração

5. **`vercel.json`** - Configuração principal do deploy na Vercel
   - Define os comandos de build
   - Configura os Cron Jobs (4 horários por padrão: 9h, 13h, 17h, 21h UTC)
   - Especifica variáveis de ambiente

6. **`.env.example`** - Template das variáveis de ambiente necessárias
   - Serve como referência para configurar no painel da Vercel
   - Lista todas as variáveis obrigatórias e opcionais

### Documentação

7. **`DEPLOY_VERCEL.md`** - Guia completo de deploy
   - Passo a passo para fazer o deploy
   - Instruções de configuração das variáveis de ambiente
   - Como testar e verificar o funcionamento
   - Como ajustar os horários de postagem

8. **`MUDANCAS_VERCEL.md`** - Este arquivo, resumindo todas as alterações

## 🔧 Arquivos Modificados

1. **`package.json`** - Adicionada dependência `@vercel/node` para suporte a tipos TypeScript das funções serverless

2. **`.gitignore`** - Adicionada pasta `.vercel` para não versionar arquivos de configuração local da Vercel

## 🎯 Como Funciona

### Antes (Versão Original)
- Bot rodava no navegador (client-side)
- Dependia de manter a aba aberta
- Agendamento via `setInterval` do JavaScript
- Credenciais salvas no localStorage

### Agora (Versão Vercel)
- Bot roda como função serverless (backend)
- Funciona 24h sem precisar de computador ligado
- Agendamento via Cron Jobs nativos da Vercel
- Credenciais seguras em variáveis de ambiente

### Fluxo de Execução

1. **Vercel Cron Job** dispara no horário configurado
2. Chama o endpoint `/api/post`
3. A função lê as credenciais das variáveis de ambiente
4. Autentica com o Bluesky
5. Busca as artes do objkt.com
6. Seleciona uma arte aleatória
7. Faz download da mídia (imagem ou vídeo)
8. Cria o post no Bluesky com a arte
9. Retorna o resultado (sucesso ou erro)

## ⚙️ Próximos Passos

Para colocar tudo em produção, você precisa:

1. ✅ **Fazer commit e push das mudanças** para o GitHub
2. ✅ **Importar o projeto na Vercel**
3. ✅ **Configurar as variáveis de ambiente** no painel da Vercel
4. ✅ **Fazer o deploy**
5. ✅ **Testar** acessando `/api/test`
6. ✅ **Aguardar o primeiro post automático** no horário agendado

Consulte o arquivo `DEPLOY_VERCEL.md` para instruções detalhadas de cada passo!

---

**Desenvolvido com ❤️ para rodar 24h na nuvem**
