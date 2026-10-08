import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Callout, Card, CardBody, CardHeader, IconButton } from '../../components/ui/primitives';
import Icon from '../../components/ui/Icon';
import { useToast } from '../../components/ui/Toast';
import { formatDateTime } from '../../lib/form';
import {
  deleteQuoteFile,
  folderPermission,
  getRootFolder,
  isLocalFilesSupported,
  listQuoteFiles,
  pickRootFolder,
  quoteFolderName,
  readQuoteFile,
  saveQuoteFiles,
} from './localFiles';

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1).replace('.', ',')} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
}

/**
 * Arquivos do orçamento (STL, 3MF, G-code, fotos...) guardados numa pasta do
 * computador. Nada é enviado para a nuvem.
 */
export default function QuoteFilesPanel({ quote }) {
  const toast = useToast();
  const inputRef = useRef(null);

  const [root, setRoot] = useState(null);
  /** 'loading' | 'unsupported' | 'no-root' | 'prompt' | 'ready' */
  const [status, setStatus] = useState('loading');
  const [folderName, setFolderName] = useState(quoteFolderName(quote));
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);

  const refresh = useCallback(
    async (handle = root) => {
      if (!handle) return;
      const result = await listQuoteFiles(handle, quote);
      setFolderName(result.folderName);
      setFiles(result.files);
    },
    [root, quote],
  );

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!isLocalFilesSupported()) {
        setStatus('unsupported');
        return;
      }
      const handle = await getRootFolder();
      if (cancelled) return;
      if (!handle) {
        setStatus('no-root');
        return;
      }
      setRoot(handle);
      const permission = await folderPermission(handle);
      if (cancelled) return;
      if (permission === 'granted') {
        await refresh(handle);
        if (!cancelled) setStatus('ready');
      } else {
        setStatus('prompt');
      }
    })().catch((error) => {
      console.error(error);
      if (!cancelled) setStatus('no-root');
    });

    return () => {
      cancelled = true;
    };
    // `refresh` muda junto com `root`; recarregar só quando o orçamento muda.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quote.id]);

  const handlePick = async () => {
    try {
      const handle = await pickRootFolder();
      setRoot(handle);
      await refresh(handle);
      setStatus('ready');
      toast.success(`Pasta "${handle.name}" definida para os arquivos dos orçamentos.`);
    } catch (error) {
      if (error?.name !== 'AbortError') toast.error('Não foi possível usar a pasta escolhida.');
    }
  };

  const handleAllow = async () => {
    try {
      const permission = await folderPermission(root, { request: true });
      if (permission !== 'granted') {
        toast.warning('Sem permissão, os arquivos da pasta não podem ser lidos.');
        return;
      }
      await refresh(root);
      setStatus('ready');
    } catch {
      toast.error('A pasta salva não está mais disponível. Escolha a pasta novamente.');
      setStatus('no-root');
    }
  };

  const handleAdd = async (fileList) => {
    const selected = [...(fileList || [])];
    if (selected.length === 0) return;

    setBusy(true);
    try {
      const saved = await saveQuoteFiles(root, quote, selected);
      await refresh();
      toast.success(
        saved.length === 1 ? `"${saved[0]}" salvo na pasta do orçamento.` : `${saved.length} arquivos salvos.`,
      );
    } catch (error) {
      console.error(error);
      toast.error('Não foi possível gravar os arquivos na pasta.');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleOpen = async (name) => {
    try {
      const file = await readQuoteFile(root, quote, name);
      const url = URL.createObjectURL(file);
      const link = document.createElement('a');
      link.href = url;
      // Imagens e PDF abrem numa aba; STL, 3MF e G-code são baixados.
      if (/^(image\/|application\/pdf|text\/)/.test(file.type)) {
        link.target = '_blank';
        link.rel = 'noopener';
      } else {
        link.download = name;
      }
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      toast.error('Não foi possível abrir o arquivo. Ele pode ter sido movido ou apagado.');
      refresh().catch(() => {});
    }
  };

  const handleDelete = async (name) => {
    if (!window.confirm(`Apagar "${name}" da pasta do orçamento? O arquivo será removido do computador.`)) {
      return;
    }
    try {
      await deleteQuoteFile(root, quote, name);
      await refresh();
    } catch {
      toast.error('Não foi possível apagar o arquivo.');
    }
  };

  const dropProps =
    status === 'ready'
      ? {
          onDragOver: (event) => {
            event.preventDefault();
            setDragging(true);
          },
          onDragLeave: () => setDragging(false),
          onDrop: (event) => {
            event.preventDefault();
            setDragging(false);
            handleAdd(event.dataTransfer.files);
          },
        }
      : {};

  return (
    <Card {...dropProps} className={dragging ? 'ring-2 ring-brand-blue/60' : ''}>
      <CardHeader
        title="Arquivos do orçamento"
        subtitle={status === 'ready' ? `${root.name} › ${folderName}` : 'Salvos só neste computador'}
        icon="folder"
        actions={
          status === 'ready' ? (
            <>
              <IconButton icon="settings" label="Trocar pasta raiz" onClick={handlePick} />
              <Button size="sm" variant="secondary" icon="upload" disabled={busy} onClick={() => inputRef.current?.click()}>
                {busy ? 'Salvando...' : 'Adicionar'}
              </Button>
            </>
          ) : null
        }
      />
      <CardBody>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(event) => handleAdd(event.target.files)}
        />

        {status === 'loading' ? <p className="text-sm text-gray-500">Carregando...</p> : null}

        {status === 'unsupported' ? (
          <Callout tone="warning" title="Navegador sem suporte">
            Guardar arquivos numa pasta do computador funciona no Google Chrome ou no Microsoft Edge (desktop).
          </Callout>
        ) : null}

        {status === 'no-root' ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-400">
              Escolha uma pasta no computador (por exemplo, <span className="text-gray-200">Documentos\TRIDDO\Orçamentos</span>).
              Cada orçamento ganha uma subpasta própria dentro dela. Nada é enviado para a nuvem.
            </p>
            <Button variant="primary" icon="folder" onClick={handlePick}>
              Escolher pasta dos orçamentos
            </Button>
          </div>
        ) : null}

        {status === 'prompt' ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-400">
              O navegador precisa da sua confirmação para acessar a pasta{' '}
              <span className="text-gray-200">{root?.name}</span> nesta sessão.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="primary" icon="check" onClick={handleAllow}>
                Permitir acesso
              </Button>
              <Button variant="ghost" icon="folder" onClick={handlePick}>
                Escolher outra pasta
              </Button>
            </div>
          </div>
        ) : null}

        {status === 'ready' ? (
          files.length === 0 ? (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex w-full flex-col items-center gap-2 rounded-lg border border-dashed border-ink-600 p-6 text-sm text-gray-500 transition-colors hover:border-brand-blue/50 hover:text-gray-300"
            >
              <Icon name="upload" size={20} />
              Arraste os arquivos aqui ou clique para escolher (STL, 3MF, G-code, fotos...)
            </button>
          ) : (
            <ul className="divide-y divide-ink-800">
              {files.map((file) => (
                <li key={file.name} className="flex items-center gap-3 py-2">
                  <Icon name="file" size={16} className="text-gray-500" />
                  <button
                    type="button"
                    onClick={() => handleOpen(file.name)}
                    className="min-w-0 flex-1 text-left"
                    title="Abrir"
                  >
                    <p className="truncate text-sm text-gray-200 hover:text-brand-blue-400">{file.name}</p>
                    <p className="text-xs text-gray-600">
                      {formatBytes(file.size)} · {formatDateTime(file.lastModified)}
                    </p>
                  </button>
                  <IconButton icon="download" label="Abrir / baixar" onClick={() => handleOpen(file.name)} />
                  <IconButton icon="trash" label="Apagar" variant="danger" onClick={() => handleDelete(file.name)} />
                </li>
              ))}
            </ul>
          )
        ) : null}
      </CardBody>
    </Card>
  );
}
