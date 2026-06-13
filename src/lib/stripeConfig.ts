export const WHATSAPP_CEO = '5551997690851'

export const STRIPE_PAYMENT_LINKS: Record<'inicial' | 'profissional', string> = {
  inicial: 'https://buy.stripe.com/4gM7sM5Vud0V0n88Mj6EU00',
  profissional: 'https://buy.stripe.com/3cI5kE83C5ytfi2geL6EU01',
}

export function getStripeCheckoutUrl(plan: 'inicial' | 'profissional', userId: string, email?: string | null): string {
  const params = new URLSearchParams({ client_reference_id: userId })
  if (email) params.set('prefilled_email', email)
  return `${STRIPE_PAYMENT_LINKS[plan]}?${params.toString()}`
}

export function getWhatsappCeoUrl(message: string): string {
  return `https://wa.me/${WHATSAPP_CEO}?text=${encodeURIComponent(message)}`
}
