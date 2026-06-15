import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const FROM_EMAIL = "Terapô.pro <onboarding@resend.dev>";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function sendEmail(to: string, subject: string, html: string) {
  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html }),
  });
  if (!resp.ok) {
    throw new Error(`Resend error: ${resp.status} ${await resp.text()}`);
  }
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

  const { data: userData, error: userError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
  if (userError || !userData.user) {
    return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: corsHeaders });
  }

  const { type, sessionId } = await req.json();

  const { data: profile } = await supabase
    .from("profiles")
    .select("email, full_name, notif_confirmacoes")
    .eq("id", userData.user.id)
    .single();

  if (!profile) {
    return new Response(JSON.stringify({ error: "profile_not_found" }), { status: 404, headers: corsHeaders });
  }

  if (type === "confirmacao") {
    if (profile.notif_confirmacoes === false) {
      return new Response(JSON.stringify({ skipped: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: session } = await supabase
      .from("sessions")
      .select("date, time, type, patients(name)")
      .eq("id", sessionId)
      .eq("user_id", userData.user.id)
      .single();

    if (!session) {
      return new Response(JSON.stringify({ error: "session_not_found" }), { status: 404, headers: corsHeaders });
    }

    const patientName = (session.patients as unknown as { name: string } | null)?.name ?? "Paciente";
    const [year, month, day] = session.date.split("-");
    const dateFormatted = `${day}/${month}/${year}`;

    await sendEmail(
      profile.email,
      "Consulta confirmada — Terapô.pro",
      `<div style="font-family: sans-serif; color: #1a1a1a; max-width: 480px;">
        <h2 style="color: #16a34a;">Consulta confirmada ✅</h2>
        <p>Olá, ${profile.full_name}!</p>
        <p>A sessão com <strong>${patientName}</strong> foi confirmada:</p>
        <ul>
          <li><strong>Data:</strong> ${dateFormatted}</li>
          <li><strong>Horário:</strong> ${session.time}</li>
          <li><strong>Tipo:</strong> ${session.type === "presencial" ? "Presencial" : "Online"}</li>
        </ul>
        <p style="color: #888; font-size: 12px; margin-top: 24px;">Terapô.pro — gestão para terapeutas ocupacionais</p>
      </div>`,
    );

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  return new Response(JSON.stringify({ error: "unknown_type" }), { status: 400, headers: corsHeaders });
});
