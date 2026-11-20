/**
 * Quem pode usar o TRIDDO 3D.
 *
 * Esta lista só controla a interface (desconecta quem não está nela). A
 * proteção real dos dados está em `firestore.rules`, que tem a mesma lista:
 * ao incluir ou remover alguém, altere os dois lugares e publique as regras.
 */
export const ALLOWED_EMAILS = ['joaogsmaciel@gmail.com'];

export function isAllowedUser(user) {
  if (!user?.email) return false;
  // Contas Google sempre vêm verificadas; um e-mail não verificado não prova dono.
  if (user.emailVerified === false) return false;
  return ALLOWED_EMAILS.includes(String(user.email).trim().toLowerCase());
}
