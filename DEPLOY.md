# 📦 Guia de Deploy — GitHub / Hosts Externos

## ⚠️ Importante

Este app é construído na plataforma **Base44**. Quando publicado pelo editor da Base44, todas as variáveis de ambiente são injetadas automaticamente. Porém, se você for fazer o build **fora da plataforma** (GitHub Actions, Vercel, Netlify, etc.), precisa configurar as variáveis manualmente.

---

## 🔧 Variáveis de Ambiente Necessárias

| Variável | Descrição | Exemplo |
|---|---|---|
| `VITE_BASE44_APP_ID` | ID do app na plataforma Base44 | `com.base44.profarma` |
| `VITE_BASE44_APP_BASE_URL` | URL do backend da Base44 | `https://api.base44.com` |
| `VITE_BASE44_FUNCTIONS_VERSION` | Versão das functions (opcional) | *(vazio = última)* |

---

## 📋 Como Obter os Valores

### 1. App ID (`VITE_BASE44_APP_ID`)
- Abra seu app no editor da Base44
- O App ID está na URL do editor ou nas configurações do app
- Formato: `com.base44.NOME_DO_APP`

### 2. App Base URL (`VITE_BASE44_APP_BASE_URL`)
- É a URL do backend da Base44
- Normalmente: `https://api.base44.com`

---

## 🚀 Configuração por Plataforma

### Vercel
1. Vá em **Settings → Environment Variables**
2. Adicione cada variável listada acima
3. Faça um novo deploy

### Netlify
1. Vá em **Site settings → Environment variables**
2. Adicione cada variável
3. Faça um novo deploy

### GitHub Actions
Adicione as variáveis como **secrets** no repositório:
1. **Settings → Secrets and variables → Actions**
2. Crie os secrets:
   - `VITE_BASE44_APP_ID`
   - `VITE_BASE44_APP_BASE_URL`
3. No workflow YAML, passe para o build:
```yaml
env:
  VITE_BASE44_APP_ID: ${{ secrets.VITE_BASE44_APP_ID }}
  VITE_BASE44_APP_BASE_URL: ${{ secrets.VITE_BASE44_APP_BASE_URL }}
```

### Desenvolvimento Local
1. Copie o arquivo `.env.example` para `.env`:
   ```bash
   cp .env.example .env
   ```
2. Preencha os valores
3. Rode `npm run dev`

---

## ✅ Verificação

O app valida automaticamente as variáveis no startup. Se algo estiver faltando, um aviso aparecerá no **console do navegador** indicando quais variáveis estão ausentes.

Se você ver uma **tela em branco** após o deploy, verifique:
1. As variáveis de ambiente estão configuradas na plataforma de deploy
2. O build foi reexecutado após adicionar as variáveis
3. Não há erros no console do navegador (F12)

---

## 💡 Recomendação

Para evitar problemas de configuração, **publique pelo editor da Base44** quando possível — o processo é automático e não requer configuração de variáveis.