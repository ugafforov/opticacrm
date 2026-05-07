// Google Sheets backup edge function
// Authenticates via Service Account, dumps all public tables to spreadsheet sheets.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TABLES = [
  "buyurtmalar",
  "tekshiruvlar",
  "tayyor_kozoynaklar",
  "linza_sotuvlari",
  "linza_royxatlari",
  "xarajatlar",
  "qarzdorlar",
  "qarz_tolovlari",
  "bemor_tarixi",
  "chiqindilar",
  "profiles",
  "user_roles",
  "telegram_subscribers",
  "telegram_allowed_users",
  "telegram_settings",
  "backup_logs",
];

// ---------- JWT for Google Service Account ----------
function b64url(input: ArrayBuffer | string): string {
  const bytes = typeof input === "string"
    ? new TextEncoder().encode(input)
    : new Uint8Array(input);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN [^-]+-----/g, "")
    .replace(/-----END [^-]+-----/g, "")
    .replace(/\s+/g, "");
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

async function getAccessToken(sa: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };
  const unsigned = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(claim))}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(sa.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned));
  const jwt = `${unsigned}.${b64url(sig)}`;
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  const j = await r.json();
  if (!j.access_token) throw new Error("Google auth failed: " + JSON.stringify(j));
  return j.access_token;
}

// ---------- Sheets API ----------
async function gfetch(token: string, url: string, init: RequestInit = {}) {
  const r = await fetch(url, {
    ...init,
    headers: {
      ...(init.headers || {}),
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`Sheets API ${r.status}: ${t}`);
  }
  return r.json();
}

async function ensureSheets(token: string, sheetId: string, names: string[]) {
  const meta = await gfetch(token, `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}`);
  const existing = new Map<string, number>();
  for (const s of meta.sheets) existing.set(s.properties.title, s.properties.sheetId);

  const requests: any[] = [];
  for (const name of names) {
    if (!existing.has(name)) {
      requests.push({ addSheet: { properties: { title: name } } });
    }
  }
  if (requests.length) {
    await gfetch(token, `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}:batchUpdate`, {
      method: "POST",
      body: JSON.stringify({ requests }),
    });
  }
}

async function writeSheet(token: string, sheetId: string, name: string, rows: any[]) {
  // Clear
  await gfetch(token, `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(name)}:clear`, {
    method: "POST",
    body: "{}",
  });

  if (!rows.length) {
    await gfetch(token, `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(name + "!A1")}?valueInputOption=RAW`, {
      method: "PUT",
      body: JSON.stringify({ values: [["(empty)"]] }),
    });
    return;
  }
  const headers = Array.from(
    rows.reduce((set, r) => { Object.keys(r).forEach((k) => set.add(k)); return set; }, new Set<string>())
  ) as string[];

  const values = [headers, ...rows.map((r) => headers.map((h) => {
    const v = (r as any)[h];
    if (v === null || v === undefined) return "";
    if (typeof v === "object") return JSON.stringify(v);
    return String(v);
  }))];

  await gfetch(token, `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(name + "!A1")}?valueInputOption=RAW`, {
    method: "PUT",
    body: JSON.stringify({ values }),
  });
}

async function fetchAll(supabase: any, table: string): Promise<any[]> {
  const all: any[] = [];
  let from = 0;
  const size = 1000;
  while (true) {
    const { data, error } = await supabase.from(table).select("*").range(from, from + size - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    if (!data || !data.length) break;
    all.push(...data);
    if (data.length < size) break;
    from += size;
  }
  return all;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    const saRaw = Deno.env.get("GOOGLE_SERVICE_ACCOUNT");
    const sheetId = Deno.env.get("GOOGLE_SHEET_ID");
    if (!saRaw || !sheetId) throw new Error("GOOGLE_SERVICE_ACCOUNT yoki GOOGLE_SHEET_ID sozlanmagan");
    const sa = JSON.parse(saRaw);

    const token = await getAccessToken(sa);
    await ensureSheets(token, sheetId, TABLES);

    let totalRows = 0;
    const errors: string[] = [];
    for (const table of TABLES) {
      try {
        const rows = await fetchAll(supabase, table);
        await writeSheet(token, sheetId, table, rows);
        totalRows += rows.length;
      } catch (e) {
        errors.push(`${table}: ${(e as Error).message}`);
      }
    }

    const status = errors.length ? "partial" : "success";
    const message = errors.length ? errors.join("; ") : `OK: ${TABLES.length} jadval, ${totalRows} qator`;
    await supabase.from("backup_logs").insert({ status, message, rows_count: totalRows, tables_count: TABLES.length });

    return new Response(JSON.stringify({ ok: true, status, totalRows, tables: TABLES.length, errors }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = (e as Error).message;
    try { await supabase.from("backup_logs").insert({ status: "error", message: msg }); } catch {}
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
