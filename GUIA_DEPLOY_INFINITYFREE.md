# 🚀 Guia de Deploy no InfinityFree

Este guia vai te ajudar a fazer o build e fazer upload da aplicação React para o InfinityFree.

## 📋 Pré-requisitos

- Node.js instalado no seu computador
- Conta no InfinityFree criada
- Domínio configurado no InfinityFree

## 🔧 Passo 1: Fazer o Build da Aplicação

### 1.1 Instalar Dependências (se ainda não fez)
```bash
npm install
```

### 1.2 Criar o Build de Produção
```bash
npm run build
```

Este comando vai criar uma pasta `dist` com todos os arquivos otimizados para produção.

## 📤 Passo 2: Preparar Arquivos para Upload

### 2.1 Verificar a Pasta `dist`
Após o build, você terá uma estrutura assim:
```
dist/
├── index.html
├── assets/
│   ├── index-[hash].js
│   ├── index-[hash].css
│   └── ...
└── ...
```

### 2.2 Copiar o arquivo .htaccess
O arquivo `.htaccess` já foi criado na raiz do projeto. Você precisa copiá-lo para dentro da pasta `dist`:

**Windows:**
```bash
copy .htaccess dist\.htaccess
```

**Linux/Mac:**
```bash
cp .htaccess dist/.htaccess
```

## 🌐 Passo 3: Fazer Upload para o InfinityFree

### 3.1 Acessar o Painel do InfinityFree
1. Acesse: https://infinityfree.net/
2. Faça login na sua conta
3. Vá em **"Control Panel"** (Painel de Controle)

### 3.2 Acessar o File Manager
1. No painel, encontre seu domínio
2. Clique em **"Manage"** (Gerenciar)
3. Clique em **"File Manager"** ou **"FTP File Manager"**

### 3.3 Limpar a Pasta Pública
1. Entre na pasta `htdocs` ou `public_html` (depende do servidor)
2. **DELETE todos os arquivos** que estão lá (se houver)
   - Isso é importante para evitar conflitos

### 3.4 Fazer Upload dos Arquivos
Você tem duas opções:

#### Opção A: Upload via File Manager (Recomendado para poucos arquivos)
1. No File Manager, entre na pasta `htdocs` ou `public_html`
2. Clique em **"Upload"** ou **"Upload Files"**
3. Selecione **TODOS os arquivos** da pasta `dist`:
   - `index.html`
   - `.htaccess`
   - Toda a pasta `assets/` (ou os arquivos dentro dela)
4. Aguarde o upload completar

#### Opção B: Upload via FTP (Recomendado para muitos arquivos)
1. No painel do InfinityFree, vá em **"FTP Accounts"**
2. Crie uma conta FTP ou use a existente
3. Use um cliente FTP como:
   - **FileZilla** (gratuito): https://filezilla-project.org/
   - **WinSCP** (Windows): https://winscp.net/
4. Conecte usando as credenciais FTP
5. Navegue até `htdocs` ou `public_html`
6. Faça upload de **TODOS os arquivos** da pasta `dist`

### 3.5 Estrutura Final no Servidor
A estrutura deve ficar assim:
```
htdocs/ (ou public_html/)
├── index.html
├── .htaccess
└── assets/
    ├── index-[hash].js
    ├── index-[hash].css
    └── ...
```

## ✅ Passo 4: Verificar se Funcionou

1. Acesse seu domínio no navegador
2. A aplicação deve carregar normalmente
3. Teste adicionar um filamento para verificar se o Firebase está funcionando

## 🔄 Passo 5: Atualizar a Aplicação (Futuro)

Sempre que fizer alterações:

1. Faça o build novamente:
```bash
npm run build
```

2. Limpe a pasta `htdocs/public_html` no servidor

3. Faça upload dos novos arquivos da pasta `dist`

## ⚠️ Problemas Comuns

### Erro 404 ao acessar rotas
- **Solução**: Verifique se o arquivo `.htaccess` está na pasta raiz (`htdocs` ou `public_html`)

### Arquivos CSS/JS não carregam
- **Solução**: Verifique se a pasta `assets` foi enviada completamente
- Verifique se os caminhos no `index.html` estão corretos

### Firebase não funciona
- **Solução**: Verifique se o domínio está autorizado no Firebase Console:
  1. Acesse: https://console.firebase.google.com/
  2. Vá em **Configurações do Projeto** → **Geral**
  3. Em **Domínios autorizados**, adicione seu domínio do InfinityFree

### Página em branco
- **Solução**: 
  - Verifique o console do navegador (F12) para erros
  - Verifique se todos os arquivos foram enviados
  - Verifique se o `.htaccess` está correto

## 📝 Notas Importantes

- O InfinityFree é gratuito, mas tem algumas limitações (largura de banda, espaço, etc.)
- Para produção profissional, considere serviços pagos como Vercel, Netlify ou Firebase Hosting
- Sempre faça backup antes de fazer upload de novos arquivos
- O build otimiza os arquivos para produção (minificação, tree-shaking, etc.)

## 🎉 Pronto!

Sua aplicação está no ar! 🚀

