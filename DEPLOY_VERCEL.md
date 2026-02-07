# Guia de Deploy na Vercel com Horários Dinâmicos

Agora o seu bot permite que você configure os horários **diretamente no site** e ele continuará postando 24h por dia, mesmo com o navegador fechado!

## 🚀 Como Funciona

1.  **Vercel KV (Redis)**: Usamos um banco de dados gratuito da Vercel para salvar suas configurações (horários, mensagens, etc.).
2.  **Sincronização**: Quando você clica em "Salvar" ou "Ativar Bot" no site, ele envia as configurações para a nuvem.
3.  **Cron Job Inteligente**: O Cron Job da Vercel roda a cada minuto, verifica se há um post agendado para aquele exato momento no banco de dados e executa a postagem.

## 📋 Passos para o Deploy

### Passo 1: Enviar para o GitHub
Execute o script de deploy:
```bash
./deploy.sh
```

### Passo 2: Criar o Vercel KV
Para que o site consiga salvar os horários, você precisa ativar o banco de dados:
1. No dashboard da Vercel, vá em **"Storage"**.
2. Clique em **"Create Database"** e selecione **"KV (Redis)"**.
3. Aceite os termos e crie o banco.
4. Após criar, clique em **"Connect"** e selecione o seu projeto `objkt-bluesky-bot`.
5. Isso vai adicionar automaticamente as variáveis `KV_URL`, `KV_REST_API_URL`, etc., ao seu projeto.

### Passo 3: Variáveis de Ambiente Adicionais
Além do KV, certifique-se de que as variáveis básicas estão no projeto (Settings → Environment Variables):
- `TEZOS_ADDRESS`
- `BLUESKY_HANDLE`
- `BLUESKY_PASSWORD`

*Nota: O site agora envia essas informações para o KV, mas ter os env vars como fallback é uma boa prática.*

## ✅ Como Usar

1. Acesse o seu site na Vercel.
2. Configure seus horários e mensagens.
3. Clique em **"Salvar Configuração"**.
4. Clique em **"Ativar Bot"**.
5. **Pronto!** Você pode fechar a aba. O bot vai "acordar" a cada minuto na Vercel, ler o que você salvou e postar nos horários certos.

## ⏰ Ajustando o Cron
O arquivo `vercel.json` está configurado para checar a cada minuto:
```json
"schedule": "* * * * *"
```
Isso garante que nenhum horário configurado por você seja perdido.

## 🔍 Verificação
Você pode testar se o banco de dados está lendo suas configurações acessando:
`https://seu-projeto.vercel.app/api/test`

Ele agora mostrará as configurações que estão salvas no "Cloud" (KV).
