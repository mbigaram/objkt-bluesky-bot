# 🦋 Bluesky API - Guia Completo

## 📚 Documentação Oficial

- **Site Principal**: https://bsky.app/
- **Documentação AT Protocol**: https://docs.bsky.app/
- **GitHub do Bluesky**: https://github.com/bluesky-social/atproto
- **Playground da API**: https://bsky.app/xrpc/com.atproto.server.describeServer

## 🔑 Autenticação

### Método 1: App Password (Recomendado)

**Por que usar App Password?**
- Mais seguro que a senha principal
- Pode ser revogado a qualquer momento
- Não expõe sua senha principal

**Como gerar:**

1. Acesse https://bsky.app/settings/app-passwords
2. Clique em **"Create App Password"**
3. Dê um nome descritivo (ex: "objkt-bot")
4. Clique em **"Create"**
5. **Copie a senha** (você só verá uma vez!)

**Formato da senha:**
```
xxxx-xxxx-xxxx-xxxx (16 caracteres com hífens)
```

### Método 2: Senha Principal

Você pode usar sua senha do Bluesky diretamente, mas **não é recomendado**.

## 🔗 Endpoints Principais

### 1. Criar Sessão (Autenticação)

```
POST https://bsky.social/xrpc/com.atproto.server.createSession
```

**Request:**
```json
{
  "identifier": "seu-handle.bsky.social",
  "password": "xxxx-xxxx-xxxx-xxxx"
}
```

**Response:**
```json
{
  "did": "did:plc:...",
  "handle": "seu-handle.bsky.social",
  "accessJwt": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refreshJwt": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "email": "seu-email@example.com"
}
```

### 2. Upload de Blob (Imagem/Vídeo)

```
POST https://bsky.social/xrpc/com.atproto.repo.uploadBlob
```

**Headers:**
```
Authorization: Bearer {accessJwt}
Content-Type: image/png (ou image/jpeg, video/mp4, etc)
```

**Body:** Arquivo binário

**Response:**
```json
{
  "blob": {
    "cid": "bafy...",
    "mimeType": "image/png",
    "size": 12345
  }
}
```

### 3. Criar Post

```
POST https://bsky.social/xrpc/com.atproto.repo.createRecord
```

**Headers:**
```
Authorization: Bearer {accessJwt}
Content-Type: application/json
```

**Request (Texto Simples):**
```json
{
  "repo": "did:plc:...",
  "collection": "app.bsky.feed.post",
  "record": {
    "$type": "app.bsky.feed.post",
    "text": "Olá Bluesky! 🦋",
    "createdAt": "2026-01-29T12:00:00.000Z"
  }
}
```

**Request (Com Imagem):**
```json
{
  "repo": "did:plc:...",
  "collection": "app.bsky.feed.post",
  "record": {
    "$type": "app.bsky.feed.post",
    "text": "Minha arte NFT! 🎨",
    "embed": {
      "$type": "app.bsky.embed.images",
      "images": [
        {
          "image": {
            "cid": "bafy...",
            "mimeType": "image/png",
            "size": 12345
          },
          "alt": "Descrição da imagem"
        }
      ]
    },
    "createdAt": "2026-01-29T12:00:00.000Z"
  }
}
```

**Response:**
```json
{
  "uri": "at://did:plc:.../app.bsky.feed.post/3l7...",
  "cid": "bafy..."
}
```

## 📝 Tipos de Conteúdo Suportados

| Tipo | MIME Type | Tamanho Máx |
|------|-----------|------------|
| PNG | `image/png` | 1 MB |
| JPEG | `image/jpeg` | 1 MB |
| GIF | `image/gif` | 1 MB |
| WebP | `image/webp` | 1 MB |
| MP4 | `video/mp4` | 50 MB |
| MOV | `video/quicktime` | 50 MB |
| WebM | `video/webm` | 50 MB |

## 🔍 Limitações da API

- **Rate Limit**: 300 requisições por 5 minutos
- **Tamanho de Post**: Máximo 300 caracteres
- **Imagens por Post**: Máximo 4 imagens
- **Tamanho de Imagem**: 1 MB cada
- **Tamanho de Vídeo**: 50 MB

## 🛠️ Exemplos de Uso

### Exemplo 1: Postar Texto Simples

```typescript
import { createBlueskySession, createPost } from './lib/bluesky';

async function postSimple() {
  const session = await createBlueskySession(
    'seu-handle.bsky.social',
    'xxxx-xxxx-xxxx-xxxx'
  );

  await createPost(session, {
    text: 'Olá Bluesky! 🦋'
  });
}
```

### Exemplo 2: Postar com Imagem

```typescript
async function postWithImage() {
  const session = await createBlueskySession(
    'seu-handle.bsky.social',
    'xxxx-xxxx-xxxx-xxxx'
  );

  const imageBlob = await fetch('imagem.png')
    .then(r => r.blob());

  await createPost(session, {
    text: 'Minha arte NFT! 🎨',
    imageBlob,
    imageMimeType: 'image/png',
    imageAlt: 'Descrição da arte'
  });
}
```

### Exemplo 3: Postar com Vídeo

```typescript
async function postWithVideo() {
  const session = await createBlueskySession(
    'seu-handle.bsky.social',
    'xxxx-xxxx-xxxx-xxxx'
  );

  const videoBlob = await fetch('video.mp4')
    .then(r => r.blob());

  await createPost(session, {
    text: 'Meu vídeo de arte! 🎬',
    imageBlob: videoBlob,
    imageMimeType: 'video/mp4',
    imageAlt: 'Vídeo de arte animada'
  });
}
```

## 🔐 Segurança

### ✅ Boas Práticas

- Use **App Passwords** em vez de senhas principais
- **Nunca** compartilhe seus tokens JWT
- Revogue App Passwords que não usa mais
- Use HTTPS sempre
- Valide inputs antes de enviar para a API

### ❌ Evite

- Armazenar senhas em código
- Usar a mesma senha para múltiplos apps
- Compartilhar tokens JWT
- Fazer requisições sem validação

## 🐛 Erros Comuns

### Erro: "Invalid identifier"
```
Solução: Verifique se o handle está correto (com .bsky.social)
```

### Erro: "Invalid password"
```
Solução: Verifique se está usando um App Password válido
```

### Erro: "Rate limit exceeded"
```
Solução: Aguarde 5 minutos antes de fazer mais requisições
```

### Erro: "Blob too large"
```
Solução: Redimensione a imagem/vídeo para menos de 1MB/50MB
```

## 📊 Monitorar Postagens

### Obter Posts do Usuário

```
GET https://bsky.social/xrpc/app.bsky.feed.getAuthorFeed?actor={did}
```

### Obter Engajamento

```
GET https://bsky.social/xrpc/app.bsky.feed.getPostThread?uri={post-uri}
```

## 🔗 Recursos Úteis

- **AT Protocol Spec**: https://atproto.com/
- **Bluesky GitHub**: https://github.com/bluesky-social
- **Comunidade**: https://bsky.app/profile/bsky.app
- **Status da API**: https://status.bsky.app/

## 📞 Suporte

- **Issues**: https://github.com/bluesky-social/atproto/issues
- **Discussions**: https://github.com/bluesky-social/atproto/discussions
- **Discord**: https://discord.gg/bluesky

---

**Última atualização**: Janeiro 2026

Para mais informações, consulte a documentação oficial em https://docs.bsky.app/
