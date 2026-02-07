# 🚀 Comandos Rápidos para Deploy

## Opção 1: Script Automático (Recomendado)

Execute o script que já preparei para você:

```bash
./deploy.sh
```

Este script irá:
- Adicionar todos os arquivos ao Git
- Criar um commit com mensagem apropriada
- Enviar tudo para o GitHub

## Opção 2: Comandos Manuais

Se preferir fazer manualmente, execute:

```bash
# 1. Adicionar todos os arquivos
git add .

# 2. Criar commit
git commit -m "feat: Adiciona suporte para deploy na Vercel com Cron Jobs"

# 3. Enviar para o GitHub
git push origin main
```

## Após Enviar para o GitHub

1. **Acesse a Vercel**: https://vercel.com
2. **Importe o projeto**: Clique em "Add New..." → "Project" → Selecione `objkt-bluesky-bot`
3. **Configure as variáveis de ambiente** (Settings → Environment Variables):

```
TEZOS_ADDRESS=tz1...
BLUESKY_HANDLE=seu-nome.bsky.social
BLUESKY_PASSWORD=sua-senha-ou-app-password
CUSTOM_MESSAGE=Minha arte do dia!
PROFILE_URL=https://objkt.com/profile/seu-perfil
CRON_SECRET=senha-aleatoria-segura (opcional)
```

4. **Faça o deploy**: A Vercel irá construir e publicar automaticamente
5. **Teste a configuração**: Acesse `https://seu-projeto.vercel.app/api/test`

## URLs Importantes

Depois do deploy, você terá acesso a:

- **Interface Web**: `https://seu-projeto.vercel.app`
- **Teste de Configuração**: `https://seu-projeto.vercel.app/api/test`
- **Endpoint de Postagem**: `https://seu-projeto.vercel.app/api/post` (chamado automaticamente pelos Cron Jobs)

## Ajustando os Horários

Para mudar os horários de postagem, edite o arquivo `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/post",
      "schedule": "0 9 * * *"  // 09:00 UTC
    }
  ]
}
```

**Formato do schedule**: `minuto hora dia mês dia-da-semana`

Exemplos:
- `0 9 * * *` - Todos os dias às 9h UTC
- `0 */6 * * *` - A cada 6 horas
- `0 9,13,17,21 * * *` - Às 9h, 13h, 17h e 21h UTC
- `0 9 * * 1-5` - Às 9h UTC, apenas dias úteis (segunda a sexta)

## Testando Manualmente

Para testar um post sem esperar o agendamento:

```bash
curl -X POST https://seu-projeto.vercel.app/api/post
```

Ou acesse a URL no navegador.

## Logs e Monitoramento

Para ver os logs das execuções:
1. Acesse o dashboard da Vercel
2. Vá para o seu projeto
3. Clique em "Logs" ou "Functions"
4. Veja o histórico de execuções dos Cron Jobs

---

**Pronto! Seu bot agora roda 24h sem precisar de computador ligado! 🎉**
