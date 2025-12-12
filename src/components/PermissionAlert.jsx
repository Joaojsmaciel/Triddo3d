import React from 'react';

const PermissionAlert = ({ onDismiss }) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border-2 border-red-500 rounded-2xl p-6 max-w-2xl w-full shadow-2xl">
        <div className="flex items-start gap-4">
          <div className="text-red-500 text-3xl">
            <i className="fas fa-exclamation-triangle"></i>
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-red-500 mb-3">
              Erro de Permissões do Firestore
            </h3>
            <p className="text-gray-200 mb-4">
              O Firestore precisa ter as regras de segurança configuradas para permitir leitura e escrita.
            </p>
            <div className="bg-gray-800 rounded-lg p-4 mb-4">
              <p className="text-gray-300 text-sm font-semibold mb-2">
                Siga estes passos para corrigir:
              </p>
              <ol className="list-decimal list-inside text-gray-300 text-sm space-y-2">
                <li>Acesse o <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="text-brand-blue hover:underline">Firebase Console</a></li>
                <li>Selecione seu projeto: <strong className="text-white">triddo-eeb4d</strong></li>
                <li>Vá em <strong className="text-white">Firestore Database</strong> → <strong className="text-white">Rules</strong></li>
                <li>Cole as seguintes regras:</li>
              </ol>
            </div>
            <div className="bg-black rounded-lg p-4 mb-4 overflow-x-auto">
              <pre className="text-green-400 text-xs">
{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /filaments/{filamentId} {
      allow read, write: if true;
    }
  }
}`}
              </pre>
            </div>
            <p className="text-yellow-400 text-sm mb-4">
              ⚠️ <strong>Atenção:</strong> Essas regras permitem acesso total. Para produção, configure autenticação e regras mais restritivas.
            </p>
            <div className="flex gap-3">
              <button
                onClick={onDismiss}
                className="px-4 py-2 bg-brand-blue text-white rounded-lg font-semibold hover:bg-brand-blue-600 transition-colors"
              >
                Entendi, vou configurar
              </button>
              <a
                href="https://console.firebase.google.com/project/triddo-eeb4d/firestore/rules"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-gray-700 text-white rounded-lg font-semibold hover:bg-gray-600 transition-colors inline-block"
              >
                Abrir Firebase Console
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PermissionAlert;

