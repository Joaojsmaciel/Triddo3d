# ⚡ Deploy Rápido - InfinityFree

## 🚀 Comandos Rápidos

### Windows:
```bash
# Opção 1: Usar o script automático
build-and-deploy.bat

# Opção 2: Manual
npm install
npm run build:deploy
```

### Linux/Mac:
```bash
# Opção 1: Usar o script automático
chmod +x build-and-deploy.sh
./build-and-deploy.sh

# Opção 2: Manual
npm install
npm run build:deploy
```

## 📤 Upload para InfinityFree

1. **Acesse o File Manager do InfinityFree**
   - Login: https://infinityfree.net/
   - Vá em "Control Panel" → Seu domínio → "File Manager"

2. **Entre na pasta pública**
   - Pasta: `htdocs` ou `public_html`

3. **Delete tudo que está lá** (se houver)

4. **Faça upload de TUDO da pasta `dist`**
   - `index.html`
   - `.htaccess`
   - Toda a pasta `assets/`

5. **Pronto!** Acesse seu domínio 🎉

## ⚙️ Configurar Firebase (Importante!)

Após fazer o deploy, configure o Firebase para aceitar seu domínio:

1. Acesse: https://console.firebase.google.com/project/triddo-eeb4d/settings/general
2. Role até "Domínios autorizados"
3. Adicione seu domínio do InfinityFree (ex: `seudominio.com`)
4. Salve

## 📝 Estrutura Final no Servidor

```
htdocs/ (ou public_html/)
├── index.html
├── .htaccess
└── assets/
    ├── index-[hash].js
    ├── index-[hash].css
    └── ...
```

## 🔄 Para Atualizar no Futuro

Sempre que fizer mudanças:
```bash
npm run build:deploy
```
Depois faça upload dos novos arquivos da pasta `dist`.

