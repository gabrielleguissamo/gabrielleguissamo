declare global {
  interface Window {
    posthog?: {
      capture: (event: string, properties?: Record<string, unknown>) => void
      identify: (id: string, properties?: Record<string, unknown>) => void
    }
  }
}

export function track(event: string, properties?: Record<string, unknown>) {
  window.posthog?.capture(event, properties)
}

export function identifyUser(userId: string, properties?: Record<string, unknown>) {
  window.posthog?.identify(userId, properties)
}
