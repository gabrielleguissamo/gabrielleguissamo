import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, SupabaseClient } from "jsr:@supabase/supabase-js@2";

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function getValidAccessToken(supabase: SupabaseClient, userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("google_calendar_tokens")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error || !data) return null;

  if (new Date(data.expires_at).getTime() > Date.now() + 60_000) {
    return data.access_token;
  }

  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: data.refresh_token,
      grant_type: "refresh_token",
    }),
  });
  const refreshed = await resp.json();
  if (!resp.ok || !refreshed.access_token) {
    // Refresh token is no longer valid (e.g. revoked by the user on Google's side).
    // Remove the stored connection so the UI stops showing "Conectado".
    await supabase.from("google_calendar_tokens").delete().eq("user_id", userId);
    return null;
  }

  const expiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();
  await supabase
    .from("google_calendar_tokens")
    .update({ access_token: refreshed.access_token, expires_at: expiresAt, updated_at: new Date().toISOString() })
    .eq("user_id", userId);

  return refreshed.access_token;
}

function toDateTimeLocal(date: string, time: string): string {
  return `${date}T${time}:00-03:00`;
}

function addMinutes(date: string, time: string, minutes: number): string {
  const dt = new Date(`${date}T${time}:00`);
  dt.setMinutes(dt.getMinutes() + minutes);
  const pad = (n: number) => String(n).padStart(2, "0");
  const endDate = `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
  const endTime = `${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
  return toDateTimeLocal(endDate, endTime);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Missing authorization" }), { status: 401, headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const token = authHeader.replace("Bearer ", "");
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) {
    return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: corsHeaders });
  }

  const body = await req.json();
  const { action, eventId, title, date, time, duration, description, type } = body;

  const accessToken = await getValidAccessToken(supabase, userData.user.id);
  if (!accessToken) {
    return new Response(JSON.stringify({ error: "not_connected" }), { status: 400, headers: corsHeaders });
  }

  if (action === "delete") {
    const resp = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!resp.ok && resp.status !== 404 && resp.status !== 410) {
      return new Response(JSON.stringify({ error: "google_api_error", status: resp.status }), { status: 500, headers: corsHeaders });
    }
    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const startDateTime = toDateTimeLocal(date, time);
  const endDateTime = addMinutes(date, time, duration);

  const eventBody = {
    summary: `Sessão - ${title}`,
    description: `${type} - Terapô.pro${description ? "\n" + description : ""}`,
    start: { dateTime: startDateTime, timeZone: "America/Sao_Paulo" },
    end: { dateTime: endDateTime, timeZone: "America/Sao_Paulo" },
  };

  if (action === "create") {
    const resp = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(eventBody),
    });
    const data = await resp.json();
    if (!resp.ok) {
      return new Response(JSON.stringify({ error: "google_api_error", details: data }), { status: 500, headers: corsHeaders });
    }
    return new Response(JSON.stringify({ eventId: data.id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  if (action === "update") {
    const resp = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(eventBody),
    });
    if (!resp.ok) {
      const data = await resp.json();
      return new Response(JSON.stringify({ error: "google_api_error", details: data }), { status: 500, headers: corsHeaders });
    }
    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  return new Response(JSON.stringify({ error: "invalid_action" }), { status: 400, headers: corsHeaders });
});
