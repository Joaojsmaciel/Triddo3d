# Triddo - Calculadora de Custo de Impressão 3D

Aplicação React moderna para cálculo de custos de impressão 3D, desenvolvida com React, Tailwind CSS e Firebase.

## 🚀 Tecnologias

- **React 18** - Biblioteca JavaScript para construção de interfaces
- **Vite** - Build tool moderna e rápida
- **Tailwind CSS** - Framework CSS utility-first
- **Firebase Firestore** - Banco de dados em tempo real
- **Firebase Analytics** - Análise de uso

## 📋 Pré-requisitos

- Node.js 16+ instalado
- Conta Firebase configurada
- NPM ou Yarn

## 🛠️ Instalação

1. Instale as dependências:
```bash
npm install
```

2. A configuração do Firebase já está incluída no arquivo `src/firebase/config.js` com suas credenciais.

3. Inicie o servidor de desenvolvimento:
```bash
npm run dev
```

4. Acesse `http://localhost:5173` no navegador.

## 📦 Build para Produção

```bash
npm run build
```

Os arquivos otimizados estarão na pasta `dist/`.

## 🔥 Configuração do Firebase

A aplicação já está configurada com suas credenciais do Firebase. Certifique-se de que:

1. O Firestore está habilitado no seu projeto Firebase
2. As regras de segurança do Firestore permitem leitura/escrita (para desenvolvimento, você pode usar regras temporárias):
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true; // Apenas para desenvolvimento!
    }
  }
}
```

⚠️ **Importante**: Para produção, configure regras de segurança adequadas no Firebase Console.

## 📁 Estrutura do Projeto

```
src/
├── components/          # Componentes React
│   ├── Header.jsx
│   ├── FilamentForm.jsx
│   ├── FilamentList.jsx
│   ├── Calculator.jsx
│   ├── Results.jsx
│   └── Notification.jsx
├── firebase/            # Configuração e serviços Firebase
│   ├── config.js
│   └── filaments.js
├── hooks/               # Custom hooks
│   └── useFilaments.js
├── App.jsx              # Componente principal
├── main.jsx             # Ponto de entrada
└── index.css            # Estilos globais com Tailwind
```

## ✨ Funcionalidades

- ✅ Gerenciamento de filamentos (adicionar, listar, excluir)
- ✅ Cálculo automático de custo por grama
- ✅ Múltiplas cores por filamento
- ✅ Cálculo completo de custos de impressão:
  - Custo do filamento
  - Custo de energia
  - Taxa de serviço
  - Margem de lucro
- ✅ Persistência de dados no Firebase
- ✅ Interface responsiva e moderna
- ✅ Notificações de feedback

## 🎨 Personalização

As cores da marca podem ser ajustadas no arquivo `tailwind.config.js`:

```javascript
colors: {
  'brand-blue': '#4C7DFF',
  'brand-blue-600': '#3f6af2',
  'brand-blue-700': '#2f54d7',
}
```

## 📝 Licença

Este projeto é propriedade da Triddo - Print and Design 3D.
