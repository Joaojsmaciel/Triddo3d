# 🔥 Instruções para Configurar o Firestore

## Problema: "Missing or insufficient permissions"

Este erro ocorre porque as regras de segurança do Firestore não estão configuradas. Siga os passos abaixo para resolver:

## 📋 Passo a Passo

### 1. Acesse o Firebase Console
- Vá para: https://console.firebase.google.com/
- Faça login com sua conta Google

### 2. Selecione seu Projeto
- Clique no projeto: **triddo-eeb4d**

### 3. Acesse o Firestore Database
- No menu lateral esquerdo, clique em **"Firestore Database"**
- Se ainda não criou o banco de dados, clique em **"Criar banco de dados"**
  - Escolha o modo: **"Começar no modo de teste"** (para desenvolvimento)
  - Selecione a localização (ex: `southamerica-east1` para Brasil)

### 4. Configure as Regras de Segurança
- Clique na aba **"Rules"** (Regras) no topo da página
- Substitua o conteúdo por:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Regras para a coleção de filamentos
    match /filaments/{filamentId} {
      // Permitir leitura e escrita para todos (apenas para desenvolvimento)
      allow read, write: if true;
    }
  }
}
```

### 5. Publique as Regras
- Clique no botão **"Publicar"** (Publish)

### 6. Aguarde alguns segundos
- As regras podem levar alguns segundos para serem aplicadas
- Recarregue a aplicação no navegador

## ✅ Verificação

Após configurar, você deve conseguir:
- ✅ Salvar novos filamentos
- ✅ Ver a lista de filamentos
- ✅ Excluir filamentos

## ⚠️ Importante para Produção

As regras acima (`allow read, write: if true`) permitem acesso total a qualquer pessoa. 

**Para produção**, configure autenticação e regras mais restritivas, por exemplo:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /filaments/{filamentId} {
      // Permitir apenas para usuários autenticados
      allow read, write: if request.auth != null;
      
      // Ou permitir apenas para usuários específicos
      // allow read, write: if request.auth.uid == 'SEU_UID_AQUI';
    }
  }
}
```

## 📁 Arquivo de Regras

Um arquivo `firestore.rules` foi criado na raiz do projeto com as regras básicas. Você pode usar o Firebase CLI para fazer deploy:

```bash
firebase deploy --only firestore:rules
```

Mas para começar rapidamente, use o Console Web conforme descrito acima.

