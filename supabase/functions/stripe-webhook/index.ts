import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14?target=deno";

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;
const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
  httpClient: Stripe.createFetchHttpClient(),
});

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

type Plan = "inicial" | "profissional" | "business";

function planFromPrice(price: Stripe.Price | null | undefined): Plan {
  const meta = price?.metadata?.plan;
  if (meta === "profissional" || meta === "business" || meta === "inicial") return meta;
  return "inicial";
}

// Find the profile linked to a Stripe customer. If the link hasn't been
// established yet (subscription events can arrive before
// checkout.session.completed is processed), fall back to looking up the
// Checkout Session that created this customer.
async function findProfileByCustomer(customerId: string): Promise<{ id: string } | null> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  if (profile) return profile;

  const sessions = await stripe.checkout.sessions.list({ customer: customerId, limit: 1 });
  const userId = sessions.data[0]?.client_reference_id;
  if (!userId) return null;

  await supabase.from("profiles").update({ stripe_customer_id: customerId }).eq("id", userId);
  return { id: userId };
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const signature = req.headers.get("stripe-signature");
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature ?? "", STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return new Response(`Webhook signature error: ${(err as Error).message}`, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.client_reference_id;
      const customerId = session.customer as string | null;
      if (userId && customerId) {
        await supabase.from("profiles").update({ stripe_customer_id: customerId }).eq("id", userId);
      }
      break;
    }

    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = sub.customer as string;

      const profile = await findProfileByCustomer(customerId);
      if (!profile) break;

      const price = sub.items.data[0]?.price ?? null;
      const plan = planFromPrice(price);
      const amount = price?.unit_amount ? price.unit_amount / 100 : 0;

      await supabase.from("subscriptions").upsert({
        user_id: profile.id,
        stripe_customer_id: customerId,
        stripe_subscription_id: sub.id,
        plan,
        status: sub.status,
        amount,
        currency: price?.currency ?? "brl",
        current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
        current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
        cancel_at: sub.cancel_at ? new Date(sub.cancel_at * 1000).toISOString() : null,
        canceled_at: sub.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : null,
      }, { onConflict: "stripe_subscription_id" });

      if (sub.status === "active" || sub.status === "trialing") {
        await supabase.from("profiles").update({ plan }).eq("id", profile.id);
      }
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;

      await supabase
        .from("subscriptions")
        .update({ status: "canceled", canceled_at: new Date().toISOString() })
        .eq("stripe_subscription_id", sub.id);

      const { data: subRow } = await supabase
        .from("subscriptions")
        .select("user_id")
        .eq("stripe_subscription_id", sub.id)
        .maybeSingle();

      if (subRow) {
        await supabase.from("profiles").update({ plan: "inicial" }).eq("id", subRow.user_id);
      }
      break;
    }

    // Fatura gerada (cobrança futura/pendente)
    case "invoice.created":
    case "invoice.finalized": {
      const invoice = event.data.object as Stripe.Invoice;
      if (invoice.status !== "open") break;

      const customerId = invoice.customer as string;
      const profile = await findProfileByCustomer(customerId);
      if (!profile) break;

      const subscriptionId = invoice.subscription as string | null;
      let subRowId: string | null = null;
      if (subscriptionId) {
        const { data: subRow } = await supabase
          .from("subscriptions")
          .select("id")
          .eq("stripe_subscription_id", subscriptionId)
          .maybeSingle();
        subRowId = subRow?.id ?? null;
      }

      await supabase.from("payments").upsert({
        user_id: profile.id,
        subscription_id: subRowId,
        stripe_invoice_id: invoice.id,
        amount: invoice.amount_due / 100,
        currency: invoice.currency,
        status: "pending",
        period_start: invoice.period_start ? new Date(invoice.period_start * 1000).toISOString() : null,
        period_end: invoice.period_end ? new Date(invoice.period_end * 1000).toISOString() : null,
        paid_at: null,
      }, { onConflict: "stripe_invoice_id" });
      break;
    }

    // Fatura paga ou falhou
    case "invoice.paid":
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = invoice.customer as string;

      const profile = await findProfileByCustomer(customerId);
      if (!profile) break;

      const subscriptionId = invoice.subscription as string | null;
      let subRowId: string | null = null;
      if (subscriptionId) {
        const { data: subRow } = await supabase
          .from("subscriptions")
          .select("id")
          .eq("stripe_subscription_id", subscriptionId)
          .maybeSingle();
        subRowId = subRow?.id ?? null;
      }

      const paid = event.type === "invoice.paid";
      await supabase.from("payments").upsert({
        user_id: profile.id,
        subscription_id: subRowId,
        stripe_invoice_id: invoice.id,
        amount: (paid ? invoice.amount_paid : invoice.amount_due) / 100,
        currency: invoice.currency,
        status: paid ? "paid" : "failed",
        period_start: invoice.period_start ? new Date(invoice.period_start * 1000).toISOString() : null,
        period_end: invoice.period_end ? new Date(invoice.period_end * 1000).toISOString() : null,
        paid_at: paid ? new Date().toISOString() : null,
      }, { onConflict: "stripe_invoice_id" });
      break;
    }

    default:
      break;
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
