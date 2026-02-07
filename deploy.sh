#!/bin/bash

echo "🚀 Script de Deploy para Vercel"
echo "================================"
echo ""

# Verificar se está no diretório correto
if [ ! -f "vercel.json" ]; then
    echo "❌ Erro: Execute este script na raiz do projeto objkt-bluesky-bot"
    exit 1
fi

echo "📦 Adicionando arquivos ao Git..."
git add .

echo "💬 Criando commit..."
git commit -m "feat: Adiciona suporte para deploy na Vercel com Cron Jobs"

echo "📤 Enviando para o GitHub..."
git push origin main

echo ""
echo "✅ Arquivos enviados com sucesso!"
echo ""
echo "📋 Próximos passos:"
echo "1. Acesse https://vercel.com"
echo "2. Importe o repositório 'objkt-bluesky-bot'"
echo "3. Configure as variáveis de ambiente (veja .env.example)"
echo "4. Faça o deploy"
echo "5. Teste em: https://seu-projeto.vercel.app/api/test"
echo ""
echo "📚 Consulte DEPLOY_VERCEL.md para instruções detalhadas"
