import React from 'react';
import { Button, Callout, Modal } from './primitives';

/**
 * Confirmação de ações destrutivas. Substitui `window.confirm`, que não permite
 * explicar a consequência nem seguir a identidade visual.
 */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  tone = 'negative',
  onConfirm,
  onCancel,
  children,
}) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button variant={tone === 'negative' ? 'danger' : 'primary'} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <Callout tone={tone}>{message}</Callout>
      {children}
    </Modal>
  );
}
