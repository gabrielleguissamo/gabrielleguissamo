export const ADMIN_EMAILS = ['gabrielleguissamo77@gmail.com', 'contato.f1redg@gmail.com']

export function isAdminEmail(email?: string | null): boolean {
  return !!email && ADMIN_EMAILS.includes(email)
}
