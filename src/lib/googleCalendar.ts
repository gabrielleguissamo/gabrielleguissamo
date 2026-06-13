// Google Calendar integration via Supabase Edge Functions
// Tokens (with refresh token) are stored server-side in google_calendar_tokens,
// so the connection survives page reloads.

import { supabase } from './supabase'

const CLIENT_ID = '856149008791-sp2vlfni739sibsg1vh9p4rho2nu0qrq.apps.googleusercontent.com'
const SCOPE = 'https://www.googleapis.com/auth/calendar.events'

export function getGoogleCalendarAuthUrl(redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPE,
    access_type: 'offline',
    prompt: 'consent',
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

export async function exchangeGoogleCalendarCode(code: string, redirectUri: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke('google-calendar-oauth', {
    body: { code, redirectUri },
  })
  if (error) throw error
  if (data?.error) throw new Error(data.error)
}

export async function isGoogleCalendarConnected(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('google_calendar_tokens')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle()
  return !!data
}

export async function disconnectGoogleCalendar(userId: string): Promise<void> {
  await supabase.from('google_calendar_tokens').delete().eq('user_id', userId)
}

async function callSync(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('google-calendar-sync', { body })
  if (error) throw error
  if (data?.error) throw new Error(data.error)
  return data
}

// Create a calendar event
export async function createGoogleCalendarEvent(params: {
  title: string
  date: string // YYYY-MM-DD
  time: string // HH:MM
  duration: number // minutes
  description?: string
  type: string
}): Promise<string> {
  const data = await callSync({ action: 'create', ...params })
  return data.eventId as string
}

// Update a calendar event
export async function updateGoogleCalendarEvent(
  eventId: string,
  params: {
    title: string
    date: string
    time: string
    duration: number
    description?: string
    type: string
  }
): Promise<void> {
  await callSync({ action: 'update', eventId, ...params })
}

// Delete a calendar event
export async function deleteGoogleCalendarEvent(eventId: string): Promise<void> {
  await callSync({ action: 'delete', eventId })
}
