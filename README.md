# 💑 Finanças do Casal | Gabriel & Sara (PWA + Google Sheets)

Uma Progressive Web App (PWA) moderna, responsiva, mobile-first e ultrarrápida para controle financeiro conjunto, pronta para deploy na **Vercel** e persistência direta no **Google Sheets** através do **Google Apps Script**.

![PWA Finanças](icons/icon.svg)

---

## ✨ Funcionalidades Principais

- 📱 **Mobile-First & PWA**: Instalação como app nativo na tela inicial do smartphone (iOS e Android) com suporte offline e ícones personalizados.
- ⚡ **Lançamento em Segundos**: Entrada com máscara de moeda brasileira fluida (`R$ 0,00`), teclado numérico automático e atalhos rápidos (`+10`, `+50`, etc.).
- 👥 **Segmentação Casal**: Seleção rápida de **Quem pagou** (`Gabriel` ou `Sara`) e **Divisão do Gasto** (`Conjunto (Casal)` ou `Individual`).
- 🏷️ **Categorização com Emojis**: Grade tátil com categorias visuais (Mercado, Transporte, Alimentação, Moradia, Lazer, Saúde, Pet, etc.).
- 💳 **Formas de Pagamento**: Botões rápidos para `Crédito`, `Pix`, `Débito` e `Dinheiro`.
- 🔒 **Concorrência Protegida**: Backend Google Apps Script com `LockService` para evitar perda de dados quando ambos registram gastos simultaneamente.
- ☁️ **Sincronização & Fila Offline**: Permite registrar despesas mesmo sem conexão com a internet; ao reconectar, o app sincroniza automaticamente.
- ⚙️ **Configuração Dinâmica**: Permite trocar a URL da API diretamente pela interface ou via constante no código.

---

## 🚀 Passo a Passo: Configuração do Google Sheets

### 1. Criar a Planilha
1. Acesse [sheets.new](https://sheets.new) para criar uma nova planilha Google.
2. Dê um nome à planilha (ex.: `Finanças Gabriel e Sara`).

### 2. Adicionar o Script do Backend
1. No menu superior da planilha, clique em **Extensões** > **Apps Script**.
2. Apague qualquer código existente no arquivo `Código.gs` (ou `Code.gs`).
3. Copie todo o conteúdo do arquivo [`backend/Code.gs`](backend/Code.gs) deste repositório e cole no editor do Google.
4. Clique no ícone de disquete 💾 (**Salvar projeto**).

### 3. Publicar o Web App (Deploy)
1. No canto superior direito da tela do Apps Script, clique no botão azul **Implantar** (Deploy) > **Nova implantação** (New deployment).
2. Clique no ícone de engrenagem ao lado de "Selecionar tipo" e escolha **App da Web** (Web app).
3. Preencha as opções exatamente como abaixo:
   - **Descrição**: `API Finanças Casal v1`
   - **Executar como**: `Eu (seu-email@gmail.com)`
   - **Quem tem acesso**: `Qualquer pessoa` *(Anyone)*  
     *(⚠️ Essencial: essa opção permite que o PWA envie os dados das despesas sem solicitar login do Google).*
4. Clique em **Implantar**.
5. Conceda as permissões de acesso à planilha quando solicitado pelo Google.
6. Copie a **URL do app da Web** gerada (ela termina com `/exec`). Exemplo:
   ```
   https://script.google.com/macros/s/AKfycbx.../exec
   ```

---

## 🔗 Vinculando a API no App

Você pode vincular sua URL de duas maneiras:

### Opção A (Direto na Interface do App - Mais Rápida):
1. Abra o app no navegador.
2. Toque no ícone de **engrenagem ⚙️** no topo direito.
3. Cole a URL copiada no campo e clique em **Salvar**.

### Opção B (No código-fonte antes do Deploy):
Abra o arquivo [`app.js`](app.js) e insira a URL na constante:
```javascript
const DEFAULT_API_URL = 'https://script.google.com/macros/s/SEU_ID_AQUI/exec';
```

---

## 🌐 Deploy na Vercel

O projeto é 100% estático, dispensando build pesado ou servidores intermediários.

### Opção 1: Via Vercel CLI
```bash
# Instalar a CLI da Vercel (se ainda não tiver)
npm i -g vercel

# Na raiz do projeto, execute:
vercel
```

### Opção 2: Via GitHub / Dashboard Vercel
1. Suba este repositório para o seu GitHub.
2. Acesse [vercel.com](https://vercel.com) e clique em **Add New Project**.
3. Importe o repositório.
4. Framework Preset: **Other** (ou deixe em branco/detectado automaticamente).
5. Clique em **Deploy**.

O arquivo [`vercel.json`](vercel.json) já vem pré-configurado com os headers necessários para Service Worker e PWA.

---

## 📲 Como Instalar no Celular (PWA)

### No iPhone (iOS / Safari):
1. Abra o link do seu app implantado no **Safari**.
2. Toque no botão de **Compartilhar** (ícone do quadrado com a seta para cima).
3. Role para baixo e selecione **Adicionar à Tela de Início** (Add to Home Screen).
4. O app será instalado com ícone nativo e abrirá em tela cheia sem barras do navegador.

### No Android (Chrome):
1. Abra o link do seu app no **Chrome**.
2. Toque no menu de três pontos (⋮) no canto superior direito ou no aviso inferior.
3. Selecione **Instalar aplicativo** ou **Adicionar à tela inicial**.

---

## 📂 Estrutura do Projeto

```
├── index.html          # Interface principal mobile-first em Dark Mode (Tailwind)
├── app.js              # Lógica de input, máscara BRL, offline queue e envio
├── sw.js               # Service Worker com cache para suporte offline
├── manifest.json       # Manifesto PWA com modo standalone e paleta Slate
├── vercel.json         # Configurações de headers e rotas para a Vercel
├── icons/              # Ícones PWA para iOS e Android
│   ├── icon.svg
│   ├── icon-192.png
│   ├── icon-512.png
│   └── apple-touch-icon.png
├── backend/
│   └── Code.gs         # Backend Google Apps Script com LockService
└── README.md           # Este guia de configuração e deploy
```
