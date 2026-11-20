/**
 * Mensagens do login com Google. Sem dependência do SDK para poder ser testado
 * com `node --test`.
 */

/** Códigos em que o próprio usuário desistiu: não há erro a mostrar. */
const SILENT_CODES = new Set(['auth/popup-closed-by-user', 'auth/cancelled-popup-request', 'auth/user-cancelled']);

const PROVIDER_DISABLED =
  'O login com Google não está ativado no projeto Firebase (Authentication → Sign-in method → Google).';

const MESSAGES = {
  'auth/popup-blocked': 'O navegador bloqueou a janela do Google. Permita pop-ups para este site e tente de novo.',
  'auth/unauthorized-domain':
    'Este endereço não está autorizado no Firebase. Adicione o domínio em Authentication → Settings → Authorized domains.',
  'auth/operation-not-allowed': PROVIDER_DISABLED,
  'auth/configuration-not-found': PROVIDER_DISABLED,
  'auth/user-disabled': 'Esta conta foi desativada.',
  'auth/account-exists-with-different-credential': 'Já existe uma conta com este e-mail usando outro método de login.',
  'auth/too-many-requests': 'Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.',
  'auth/network-request-failed': 'Sem conexão com o servidor. Verifique sua internet.',
  'auth/internal-error': 'O Google não respondeu como esperado. Tente novamente.',
};

/** Mensagem para o usuário, ou `null` quando ele mesmo fechou a janela do Google. */
export function authErrorMessage(error) {
  const code = String(error?.code || '');
  if (SILENT_CODES.has(code)) return null;
  return MESSAGES[code] || 'Não foi possível entrar com o Google. Tente novamente.';
}
