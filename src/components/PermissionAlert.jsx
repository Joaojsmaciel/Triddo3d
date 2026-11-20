import React from 'react';
import Icon from './ui/Icon';
import { Button, Modal } from './ui/primitives';

/**
 * Instruções para publicar as regras do Firestore.
 *
 * Aparece na importação dos filamentos da versão anterior, quando o Firebase
 * recusa a leitura por falta de permissão — sinal de que as regras do projeto
 * ainda não foram publicadas.
 */
export default function PermissionAlert({ onDismiss }) {
  return (
    <Modal
      open
      onClose={onDismiss}
      title="Firestore sem permissão de leitura"
      subtitle="As regras de segurança publicadas no projeto estão bloqueando o acesso aos filamentos antigos."
      footer={
        <>
          <Button variant="ghost" onClick={onDismiss}>
            Fechar
          </Button>
          <a
            href="https://console.firebase.google.com/project/triddo-eeb4d/firestore/rules"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="primary" icon="arrowLeft">
              Abrir Firebase Console
            </Button>
          </a>
        </>
      }
    >
      <p className="mb-3 text-sm text-gray-300">
        As regras corretas estão no arquivo <strong className="text-gray-100">firestore.rules</strong> do
        projeto. Publique-as com o Firebase CLI, na pasta do projeto:
      </p>

      <pre className="overflow-x-auto rounded-lg border border-ink-700 bg-ink-950 p-4 text-xs text-positive">
        {`firebase login
firebase deploy --only firestore:rules`}
      </pre>

      <p className="mt-4 flex items-start gap-2 text-xs text-warning">
        <Icon name="alert" size={14} className="mt-0.5" />
        Essas regras liberam a coleção antiga apenas para leitura de usuários logados, e cada conta só
        acessa os próprios materiais. Não publique regras com “allow read, write: if true”.
      </p>
    </Modal>
  );
}
