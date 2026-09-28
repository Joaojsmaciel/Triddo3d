import React from 'react';
import Icon from './ui/Icon';
import { Button, Modal } from './ui/primitives';

/**
 * Instruções para liberar as regras do Firestore.
 *
 * Aparece somente na importação dos filamentos da versão anterior, quando o
 * Firebase recusa a leitura por falta de permissão.
 */
export default function PermissionAlert({ onDismiss }) {
  return (
    <Modal
      open
      onClose={onDismiss}
      title="Firestore sem permissão de leitura"
      subtitle="As regras de segurança do projeto estão bloqueando o acesso aos filamentos antigos."
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
      <ol className="mb-4 list-inside list-decimal space-y-2 text-sm text-gray-300">
        <li>
          Acesse o{' '}
          <a
            href="https://console.firebase.google.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-blue hover:underline"
          >
            Firebase Console
          </a>{' '}
          e selecione o projeto <strong className="text-gray-100">triddo-eeb4d</strong>.
        </li>
        <li>
          Abra <strong className="text-gray-100">Firestore Database → Rules</strong>.
        </li>
        <li>Publique as regras abaixo e tente a importação novamente.</li>
      </ol>

      <pre className="overflow-x-auto rounded-lg border border-ink-700 bg-ink-950 p-4 text-xs text-positive">
        {`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /filaments/{filamentId} {
      allow read: if true;
    }
  }
}`}
      </pre>

      <p className="mt-4 flex items-start gap-2 text-xs text-warning">
        <Icon name="alert" size={14} className="mt-0.5" />
        Essas regras liberam a leitura pública da coleção. Depois de importar, volte a restringi-las — o
        TRIDDO 3D passa a guardar os dados neste navegador e não depende mais do Firebase.
      </p>
    </Modal>
  );
}
