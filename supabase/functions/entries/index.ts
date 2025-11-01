import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": Deno.env.get("CORS_ORIGIN") ?? "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("URL");
  const supabaseServiceRoleKey = Deno.env.get("SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return json({ error: "Missing URL or SERVICE_ROLE_KEY" }, 500);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

  try {
    if (req.method === "GET") {
      const { data, error } = await supabase
        .from("entries")
        .select("*")
        .order("timestamp", { ascending: false });
      if (error) throw error;
      return json({ data });
    }

    if (req.method === "POST") {
      const body = (await req.json().catch(() => null)) as {
        title?: string;
        description?: string;
      };
      const title = typeof body?.title === "string" ? body.title.trim() : "";
      const description =
        typeof body?.description === "string" ? body.description : null;

      if (!title) {
        return json({ error: "Invalid payload: 'title' is required" }, 400);
      }

      const { data, error } = await supabase
        .from("entries")
        .insert({ title, description })
        .select()
        .single();
      if (error) throw error;

      // Fire-and-forget notifications to Strapi and Next.js for syncing and ISR
      const strapiWebhookUrl = Deno.env.get("STRAPI_WEBHOOK_URL");
      const strapiWebhookSecret = Deno.env.get("STRAPI_WEBHOOK_SECRET");
      const nextRevalidateUrl = Deno.env.get("NEXT_REVALIDATE_URL");
      const revalidateSecret = Deno.env.get("REVALIDATE_SECRET");

      // Notify Strapi to clone this entry (Supabase -> Strapi)
      if (strapiWebhookUrl && strapiWebhookSecret) {
        // Do not block the response on failures
        fetch(strapiWebhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-webhook-secret": strapiWebhookSecret,
          },
          body: JSON.stringify({
            title,
            description,
            timestamp: new Date().toISOString(),
          }),
        }).catch(() => {});
      }

      // Trigger Next.js on-demand revalidation for the public page
      if (nextRevalidateUrl && revalidateSecret) {
        fetch(nextRevalidateUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-revalidate-secret": revalidateSecret,
          },
          body: JSON.stringify({ path: "/" }),
        }).catch(() => {});
      }

      return json({ data }, 201);
    }

    return json({ error: "Method not allowed" }, 405, {
      Allow: "GET, POST, OPTIONS",
    });
  } catch (err: any) {
    return json({ error: String(err?.message ?? err) }, 500);
  }
});

function json(
  value: unknown,
  status = 200,
  extraHeaders: Record<string, string> = {}
) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
      ...extraHeaders,
    },
  });
}
