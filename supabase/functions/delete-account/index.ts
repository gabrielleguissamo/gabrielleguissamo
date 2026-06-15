import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

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

  const userId = userData.user.id;

  const { data: patients } = await supabase.from("patients").select("id").eq("user_id", userId);
  const patientIds = (patients ?? []).map((p) => p.id);

  if (patientIds.length > 0) {
    await supabase.from("records").delete().in("patient_id", patientIds);
  }

  await supabase.from("patient_documents").delete().eq("user_id", userId);
  await supabase.from("transactions").delete().eq("user_id", userId);
  await supabase.from("sessions").delete().eq("user_id", userId);
  await supabase.from("relatorios").delete().eq("user_id", userId);
  await supabase.from("google_calendar_tokens").delete().eq("user_id", userId);
  await supabase.from("payments").delete().eq("user_id", userId);
  await supabase.from("subscriptions").delete().eq("user_id", userId);
  await supabase.from("patients").delete().eq("user_id", userId);

  for (const bucket of ["avatars", "logos", "documents"]) {
    const { data: files } = await supabase.storage.from(bucket).list(userId);
    if (files && files.length > 0) {
      await supabase.storage.from(bucket).remove(files.map((f) => `${userId}/${f.name}`));
    }
  }

  await supabase.from("profiles").delete().eq("id", userId);

  const { error: deleteUserError } = await supabase.auth.admin.deleteUser(userId);
  if (deleteUserError) {
    return new Response(JSON.stringify({ error: "delete_user_failed", details: deleteUserError.message }), { status: 500, headers: corsHeaders });
  }

  return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
