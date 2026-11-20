# 🔥 Firebase: login e materiais na nuvem

O TRIDDO 3D usa o projeto Firebase **triddo-eeb4d** para:

- **Authentication**: login com conta Google. Sem login, o sistema não abre.
  **Só `joaogsmaciel@gmail.com` tem acesso.** A lista fica em dois lugares, que precisam
  andar juntos: `firestore.rules` (proteção real dos dados) e `src/auth/access.js` (a tela
  desconecta as demais contas). Para liberar outra pessoa, inclua o e-mail nos dois e
  publique as regras de novo.
- **Firestore**: todos os dados de cada usuário em `users/{uid}/`:
  `materials`, `printers`, `quotes`, `transactions` e `meta/settings`.

Na primeira entrada, tudo o que estava salvo no navegador (materiais, impressoras,
orçamentos, lançamentos e configurações) sobe automaticamente para a conta, com os mesmos ids
— os orçamentos continuam ligados aos materiais e impressoras. Se a conta já tiver dados, só
sobe o que ainda não existe nela. Depois de confirmado pelo servidor, os dados saem do navegador.

O navegador guarda dados separados por endereço: o que foi cadastrado no site publicado não
aparece em `localhost`, e vice-versa. Para levar os dados de um endereço para a conta, entre
com o Google nesse mesmo endereço, ou use **Configurações → Exportar JSON** na versão antiga e
**Importar JSON → Mesclar** na nova. Filamentos da coleção antiga do Firestore entram pelo
botão **Configurações → Importar filamentos do Firebase**.

## 1. Ativar o login com Google (uma vez, no Console)

1. Abra o [Authentication do projeto](https://console.firebase.google.com/project/triddo-eeb4d/authentication).
2. Se aparecer, clique em **Vamos começar**.
3. Em **Sign-in method**, ative **Google**, escolha o e-mail de suporte do projeto e salve.
4. Em **Settings → Authorized domains**, confira se estão `localhost` (já vem por padrão) e o
   domínio onde o site é publicado (por exemplo `triddo.com.br`). Sem isso, o login nesse
   endereço falha com "Este endereço não está autorizado no Firebase".

Sem o passo 3, a tela de login mostra "O login com Google não está ativado no projeto Firebase".
O login abre uma janela do Google: se o navegador bloquear pop-ups, permita para o site.

## 2. Publicar as regras de segurança (Firebase CLI)

Os arquivos do projeto já estão prontos: `firebase.json`, `.firebaserc` (projeto `triddo-eeb4d`)
e `firestore.rules`.

```bash
npm install -g firebase-tools        # se ainda não tiver o CLI
firebase login                       # use a conta Google dona do projeto triddo-eeb4d
firebase use                         # deve mostrar triddo-eeb4d
firebase deploy --only firestore:rules
```

Se o login atual for de outra conta, troque com `firebase login:add` e `firebase login:use <email>`,
ou refaça com `firebase logout` + `firebase login`.

As regras garantem que:

- cada usuário lê e grava **somente os próprios** dados, só nas coleções conhecidas e no
  formato esperado;
- a coleção antiga `filaments` fica **somente leitura** para usuários logados (usada pelo botão
  "Importar filamentos do Firebase" em Configurações);
- todo o resto é negado.

## 3. Conferir

1. `npm run dev` e clique em **Entrar com o Google**.
2. Cadastre um material e confira em **Firestore Database → users → (seu uid) → materials**.
3. Abra o sistema em outro navegador com a mesma conta: o material aparece lá também.

## Erro "Missing or insufficient permissions"

Significa que as regras publicadas no projeto não são as do arquivo `firestore.rules`. Rode
`firebase deploy --only firestore:rules` com a conta dona do projeto.
Nunca publique `allow read, write: if true`: qualquer pessoa poderia ler e apagar os dados.
