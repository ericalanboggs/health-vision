// Phase 4 — notify-coach-inbound
//
// Sends an APNs push to every registered coach device when a user replies by SMS.
// Invoked either by a Postgres trigger (pg_net) or by twilio-webhook right after
// it inserts the inbound row. Accepts one of:
//   { "message_id": "<uuid>" }         -- we fetch the row
//   { "record": { ...sms_messages } }  -- trigger passes NEW directly
//
// Env (set with `supabase secrets set`):
//   APNS_KEY_P8    — the .p8 private key contents (BEGIN/END PRIVATE KEY block)
//   APNS_KEY_ID    — 10-char Key ID for the .p8
//   APNS_TEAM_ID   — Apple Developer Team ID (DQ459DQCXQ)
//   APNS_BUNDLE_ID — app bundle id / APNs topic (app.SummitHealth)
//   APNS_HOST      — api.push.apple.com (prod) | api.development.push.apple.com (sandbox)
// SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are injected automatically.
//
// Deploy: supabase functions deploy notify-coach-inbound
// (This one has no browser caller, so it does NOT need --no-verify-jwt.)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const APNS_KEY_P8 = Deno.env.get("APNS_KEY_P8")!;
const APNS_KEY_ID = Deno.env.get("APNS_KEY_ID")!;
const APNS_TEAM_ID = Deno.env.get("APNS_TEAM_ID")!;
const APNS_BUNDLE_ID = Deno.env.get("APNS_BUNDLE_ID") ?? "app.SummitHealth";
const APNS_HOST = Deno.env.get("APNS_HOST") ?? "api.push.apple.com";

const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

// --- APNs JWT (ES256) ------------------------------------------------------
// APNs auth is a short-lived JWT signed with the .p8 P-256 key. Cache it in
// module scope; Apple accepts a token for up to 60 min (refresh well under that).
let cachedJwt: { token: string; madeAt: number } | null = null;

function b64url(bytes: Uint8Array): string {
  let s = btoa(String.fromCharCode(...bytes));
  return s.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pemToPkcs8(pem: string): ArrayBuffer {
  const body = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  const raw = atob(body);
  const buf = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) buf[i] = raw.charCodeAt(i);
  return buf.buffer;
}

async function apnsJwt(nowSec: number): Promise<string> {
  if (cachedJwt && nowSec - cachedJwt.madeAt < 45 * 60) return cachedJwt.token;

  const header = { alg: "ES256", kid: APNS_KEY_ID };
  const payload = { iss: APNS_TEAM_ID, iat: nowSec };
  const enc = new TextEncoder();
  const signingInput =
    b64url(enc.encode(JSON.stringify(header))) + "." +
    b64url(enc.encode(JSON.stringify(payload)));

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToPkcs8(APNS_KEY_P8),
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    enc.encode(signingInput),
  );
  const token = signingInput + "." + b64url(new Uint8Array(sig));
  cachedJwt = { token, madeAt: nowSec };
  return token;
}

// --- Handler ---------------------------------------------------------------
Deno.serve(async (req) => {
  try {
    const nowSec = Math.floor(Date.now() / 1000);
    const input = await req.json().catch(() => ({}));

    // Resolve the inbound message row.
    let msg = input.record ?? null;
    if (!msg && input.message_id) {
      const { data } = await admin
        .from("sms_messages")
        .select("id,direction,user_id,user_name,phone,body")
        .eq("id", input.message_id)
        .single();
      msg = data;
    }
    if (!msg) return json({ skipped: "no message" }, 200);
    if (msg.direction !== "inbound") return json({ skipped: "not inbound" }, 200);

    // "Replying to AI" detection: look at the most recent OUTBOUND message for
    // this user; if the AI coach spoke last, flag it (COACH_ADMIN_APP.md §2.1).
    let repliedToAI = false;
    if (msg.user_id) {
      const { data: lastOut } = await admin
        .from("sms_messages")
        .select("sent_by_type")
        .eq("user_id", msg.user_id)
        .eq("direction", "outbound")
        .order("created_at", { ascending: false })
        .limit(1);
      repliedToAI = lastOut?.[0]?.sent_by_type === "coach";
    }

    // Gather every registered device.
    const { data: tokens } = await admin
      .from("admin_push_tokens")
      .select("token");
    if (!tokens?.length) return json({ skipped: "no devices" }, 200);

    const name = (msg.user_name || msg.phone || "Someone").trim();
    const title = repliedToAI ? `🤖 ${name} replied to the AI` : name;
    const body = (msg.body || "").slice(0, 180);

    const jwt = await apnsJwt(nowSec);
    const aps = {
      // Custom bundled sound (Funk.caf ships in the app). If a device's installed
      // build lacks the file, iOS silently falls back to the default sound.
      aps: { alert: { title, body }, sound: "Funk.caf", "thread-id": msg.user_id ?? msg.phone },
      user_id: msg.user_id ?? "",
      phone: msg.phone ?? "",
    };

    // HTTP/2 to APNs. Deno's fetch negotiates h2 to api.push.apple.com.
    const results = await Promise.all((tokens).map(async ({ token }) => {
      const res = await fetch(`https://${APNS_HOST}/3/device/${token}`, {
        method: "POST",
        headers: {
          authorization: `bearer ${jwt}`,
          "apns-topic": APNS_BUNDLE_ID,
          "apns-push-type": "alert",
          "apns-priority": "10",
        },
        body: JSON.stringify(aps),
      });
      // 410 = token no longer valid → prune it.
      if (res.status === 410 || res.status === 400) {
        await admin.from("admin_push_tokens").delete().eq("token", token);
      }
      return { token: token.slice(0, 8), status: res.status };
    }));

    return json({ sent: results.length, repliedToAI, results }, 200);
  } catch (e) {
    console.error("[notify-coach-inbound]", e);
    return json({ error: String(e) }, 500);
  }
});

function json(obj: unknown, status: number): Response {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
