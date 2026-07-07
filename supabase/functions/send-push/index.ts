import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface SendPushPayload {
  profileId: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

serve(async (req) => {
  try {
    const { profileId, title, body, data } = (await req.json()) as SendPushPayload;

    if (!profileId || !title || !body) {
      return new Response(
        JSON.stringify({ error: "profileId, title, and body are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: tokens, error: tokensError } = await supabase
      .from("push_tokens")
      .select("token, platform")
      .eq("profile_id", profileId);

    if (tokensError) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch push tokens" }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    if (!tokens || tokens.length === 0) {
      return new Response(
        JSON.stringify({ message: "No push tokens found for this profile", sent: 0 }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    const messages = tokens.map((t) => ({
      to: t.token,
      sound: "default" as const,
      title,
      body,
      ...(data ? { data } : {}),
    }));

    const EXPO_PUSH_API = "https://exp.host/--/api/v2/push/send";
    const BATCH_SIZE = 100;
    let totalSent = 0;
    const errors: Array<{ token: string; error: string }> = [];

    for (let i = 0; i < messages.length; i += BATCH_SIZE) {
      const batch = messages.slice(i, i + BATCH_SIZE);
      const response = await fetch(EXPO_PUSH_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(batch),
      });

      if (!response.ok) {
        const text = await response.text();
        errors.push({ token: `batch-${i / BATCH_SIZE}`, error: text });
        continue;
      }

      const result = await response.json();
      if (result.data) {
        for (const ticket of result.data) {
          if (ticket.status === "error") {
            errors.push({
              token: ticket.details?.error || "unknown",
              error: ticket.message || "Expo push error",
            });
          }
        }
      }
      totalSent += batch.length;
    }

    return new Response(
      JSON.stringify({
        message: `Processed ${totalSent} push token(s)`,
        sent: totalSent,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
