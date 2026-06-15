import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const ADMIN_EMAIL = "gabrielleguissamo77@gmail.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Plan = "inicial" | "profissional" | "business";

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

  if (userData.user.email !== ADMIN_EMAIL) {
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });
  }

  const { userId, action, plan } = await req.json();
  if (!userId || !action) {
    return new Response(JSON.stringify({ error: "Missing userId or action" }), { status: 400, headers: corsHeaders });
  }

  if (action === "grant") {
    if (plan !== "inicial" && plan !== "profissional" && plan !== "business") {
      return new Response(JSON.stringify({ error: "Invalid plan" }), { status: 400, headers: corsHeaders });
    }

    const { error: upsertError } = await supabase.from("subscriptions").upsert({
      user_id: userId,
      stripe_customer_id: `manual_${userId}`,
      stripe_subscription_id: `manual_${userId}`,
      plan,
      status: "active",
      amount: 0,
      currency: "brl",
      source: "manual",
      current_period_start: new Date().toISOString(),
      current_period_end: null,
      cancel_at: null,
      canceled_at: null,
    }, { onConflict: "stripe_subscription_id" });

    if (upsertError) {
      return new Response(JSON.stringify({ error: upsertError.message }), { status: 500, headers: corsHeaders });
    }

    await supabase.from("profiles").update({ plan }).eq("id", userId);

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  if (action === "revoke") {
    await supabase
      .from("subscriptions")
      .delete()
      .eq("user_id", userId)
      .eq("stripe_subscription_id", `manual_${userId}`);

    const { data: remaining } = await supabase
      .from("subscriptions")
      .select("plan, status")
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();

    await supabase.from("profiles").update({ plan: remaining?.plan ?? "inicial" }).eq("id", userId);

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400, headers: corsHeaders });
});
