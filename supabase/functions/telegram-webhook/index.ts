// @ts-nocheck
// Telegram webhook receiver — instant push from Telegram, no polling.
// Replaces the long-polling telegram-poll loop so the bot never "sleeps".
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-telegram-bot-api-secret-token",
};

const TG_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
const TG_API = `https://api.telegram.org/bot${TG_TOKEN}`;
const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SB_ANON = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const REPORT_FN_URL = `${SB_URL}/functions/v1/daily-telegram-report`;

// Webhook secret — derived from bot token so setup and handler agree without
// needing an extra secret in the dashboard.
async function webhookSecret(): Promise<string> {
  const buf = new TextEncoder().encode(`telegram-webhook:${TG_TOKEN}`);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

// @ts-ignore
const waitUntil = (p: Promise<any>) => {
  try {
    // @ts-ignore
    if (typeof EdgeRuntime !== "undefined" && EdgeRuntime.waitUntil) EdgeRuntime.waitUntil(p);
  } catch (_) {}
  p.catch(err => console.error("bg task error:", err));
};

const MAIN_MENU = {
  keyboard: [
    [{ text: "📊 Bugun" }, { text: "📅 Kecha" }],
    [{ text: "📈 Hafta" }, { text: "🗓 Oy" }],
    [{ text: "📆 Oraliq" }, { text: "🔎 Boshqa sana" }],
  ],
  resize_keyboard: true,
  is_persistent: true,
};
const REMOVE_KB = { remove_keyboard: true };
const UZ_MONTHS = ["Yanvar","Fevral","Mart","Aprel","May","Iyun","Iyul","Avgust","Sentyabr","Oktyabr","Noyabr","Dekabr"];

function uzNow(): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Tashkent" }));
}
function buildMonthsKeyboard() {
  const now = uzNow();
  const items: any[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear(); const m = d.getMonth() + 1;
    items.push({ label: `${i===0?"📍 ":""}${UZ_MONTHS[m-1]} ${y}`, data: `m:${y}-${String(m).padStart(2,"0")}` });
  }
  const rows: any[] = [];
  for (let i = 0; i < items.length; i += 2) {
    const row = [{ text: items[i].label, callback_data: items[i].data }];
    if (items[i+1]) row.push({ text: items[i+1].label, callback_data: items[i+1].data });
    rows.push(row);
  }
  rows.push([{ text: "⬅️ Orqaga", callback_data: "back" }]);
  return { inline_keyboard: rows };
}
function monthRange(y: number, m: number) {
  const first = new Date(y, m-1, 1); const last = new Date(y, m, 0);
  const fmt = (d: Date) => `${String(d.getDate()).padStart(2,"0")}-${String(d.getMonth()+1).padStart(2,"0")}-${d.getFullYear()}`;
  return { from: fmt(first), to: fmt(last) };
}
function parseFlexibleDate(input: string): string | null {
  if (!input) return null;
  const parts = input.trim().split(/[.\-\/\\ ]+/).filter(Boolean);
  if (parts.length !== 3) return null;
  let d: number, m: number, y: number;
  if (parts[0].length === 4 && /^\d{4}$/.test(parts[0])) { y=+parts[0]; m=+parts[1]; d=+parts[2]; }
  else { d=+parts[0]; m=+parts[1]; y=+parts[2]; }
  if (!Number.isInteger(d)||!Number.isInteger(m)||!Number.isInteger(y)) return null;
  if (y<100) y+=2000;
  if (y<1900||y>2100||m<1||m>12||d<1||d>31) return null;
  const dt = new Date(y, m-1, d);
  if (dt.getFullYear()!==y||dt.getMonth()!==m-1||dt.getDate()!==d) return null;
  return `${String(d).padStart(2,"0")}-${String(m).padStart(2,"0")}-${y}`;
}
function parseFlexibleRange(input: string) {
  if (!input) return null;
  const cleaned = input.trim().replace(/\s*(dan|gacha|to|—|–|-|=>|->|,|;)\s*/gi, " | ").replace(/\s+/g, " ");
  let halves: string[];
  if (cleaned.includes("|")) halves = cleaned.split("|").map(s=>s.trim()).filter(Boolean);
  else {
    const t = cleaned.split(" "); if (t.length<2) return null;
    const mid = Math.floor(t.length/2);
    halves = [t.slice(0,mid).join(" "), t.slice(mid).join(" ")];
  }
  if (halves.length<2) return null;
  const from = parseFlexibleDate(halves[0]); const to = parseFlexibleDate(halves[1]);
  if (!from||!to) return null;
  return { from, to };
}

async function tgSend(chatId: number, text: string, extra: any = {}) {
  const r = await fetch(`${TG_API}/sendMessage`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", ...extra }),
  });
  if (!r.ok) console.error("sendMessage:", r.status, await r.text().catch(()=>""));
}
async function tgAnswerCallback(id: string, text?: string) {
  await fetch(`${TG_API}/answerCallbackQuery`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: id, text }),
  });
}
async function tgSetCommands() {
  await fetch(`${TG_API}/setMyCommands`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ commands: [
      { command: "start", description: "Botni ishga tushirish / menyu" },
      { command: "menu", description: "Asosiy menyuni ko'rsatish" },
      { command: "today", description: "Bugungi hisobot" },
      { command: "yesterday", description: "Kechagi hisobot" },
      { command: "week", description: "So'nggi 7 kun" },
      { command: "month", description: "Oy tanlash" },
      { command: "stop", description: "Botni to'xtatish" },
      { command: "help", description: "Yordam" },
      { command: "id", description: "Profil ID raqamim" },
    ]}),
  });
}

function normPhone(s: string): string {
  let d = (s||"").replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.length === 9) d = "998" + d;
  return "+" + d;
}
async function isAllowed(supabase: any, chatId: number, phone: string | null): Promise<boolean> {
  const { data: byChat } = await supabase.from("telegram_allowed_users").select("id").eq("telegram_chat_id", chatId).maybeSingle();
  if (byChat) return true;
  if (phone) {
    const { data: byPhone } = await supabase.from("telegram_allowed_users").select("id").eq("phone", phone).maybeSingle();
    if (byPhone) {
      await supabase.from("telegram_allowed_users").update({ telegram_chat_id: chatId }).eq("id", byPhone.id);
      return true;
    }
  }
  return false;
}
async function ensureSubscriber(supabase: any, chatId: number, info: any, phone: string | null) {
  await supabase.from("telegram_subscribers").upsert({
    chat_id: chatId, phone,
    first_name: info.first_name || null, username: info.username || null,
  }, { onConflict: "chat_id" });
}
async function triggerReport(chatId: number, payload: any) {
  waitUntil(fetch(REPORT_FN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SB_KEY}` },
    body: JSON.stringify({ chat_id: chatId, ...payload }),
  }).then(async r => { if (!r.ok) console.error("triggerReport:", r.status, await r.text().catch(()=>"")); }));
}

async function handleMessage(supabase: any, msg: any) {
  const chatId = msg.chat.id;
  const text = (msg.text || "").trim();
  const contact = msg.contact;

  if (contact && contact.phone_number) {
    const phone = normPhone(contact.phone_number);
    await ensureSubscriber(supabase, chatId, msg.from || {}, phone);
    const ok = await isAllowed(supabase, chatId, phone);
    if (ok) await tgSend(chatId, `✅ Tasdiqlandi! Endi quyidagi tugmalar orqali hisobot oling.`, { reply_markup: MAIN_MENU });
    else await tgSend(chatId, `⏳ Ma'lumotlaringiz adminga yuborildi.\n\n📱 ${phone}\n🆔 <code>${chatId}</code>\n\nAdmin ruxsat bergach, /start yuboring.`, { reply_markup: REMOVE_KB });
    return;
  }

  if (text === "/start" || text === "/menu") {
    await ensureSubscriber(supabase, chatId, msg.from || {}, null);
    const allowed = await isAllowed(supabase, chatId, null);
    if (allowed) { await tgSend(chatId, `👋 Xush kelibsiz!\n\nDavrni tanlang yoki sana yuboring (masalan: <code>1.1.2026</code>).`, { reply_markup: MAIN_MENU }); return; }
    await tgSend(chatId, `👋 Salom! Optica hisobot botiga xush kelibsiz.\n\nDavom etish uchun telefon raqamingizni yuboring.\n\n🆔 Profil ID: <code>${chatId}</code>`, {
      reply_markup: { keyboard: [[{ text: "📱 Telefon raqamni yuborish", request_contact: true }]], resize_keyboard: true, one_time_keyboard: true },
    });
    return;
  }
  if (text === "/id") { await tgSend(chatId, `🆔 Sizning Profil ID: <code>${chatId}</code>`, { reply_markup: MAIN_MENU }); return; }
  if (text === "/stop") {
    await supabase.from("telegram_subscribers").delete().eq("chat_id", chatId);
    await tgSend(chatId, `👋 Obuna bekor qilindi. Qayta yoqish uchun /start yuboring.`, { reply_markup: REMOVE_KB });
    return;
  }
  if (text === "/help") {
    await tgSend(chatId, `<b>Buyruqlar:</b>\n/start /menu /today /yesterday /week /month /id /stop\n\n<b>Sana:</b> <code>1.1.2026</code>\n<b>Oraliq:</b> <code>1.1.2026 - 5.1.2026</code>`, { reply_markup: MAIN_MENU });
    return;
  }

  const allowed = await isAllowed(supabase, chatId, null);
  if (!allowed) { await tgSend(chatId, `🚫 Sizda ruxsat yo'q. /start yuboring.`); return; }

  const cmdMap: Record<string,string> = { "/today":"today", "/yesterday":"yesterday", "/week":"week" };
  if (cmdMap[text]) { triggerReport(chatId, { period: cmdMap[text] }); await tgSend(chatId, `⏳ Hisobot tayyorlanmoqda...`, { reply_markup: MAIN_MENU }); return; }
  if (text === "/month" || text === "🗓 Oy") { await tgSend(chatId, `🗓 <b>Oyni tanlang:</b>`, { reply_markup: buildMonthsKeyboard() }); return; }

  const textMap: Record<string,string> = { "📊 Bugun":"today", "📅 Kecha":"yesterday", "📈 Hafta":"week" };
  if (textMap[text]) { triggerReport(chatId, { period: textMap[text] }); await tgSend(chatId, `⏳ Hisobot tayyorlanmoqda...`, { reply_markup: MAIN_MENU }); return; }
  if (text === "🔎 Boshqa sana") { await tgSend(chatId, `📅 Sanani yuboring (masalan: <code>15.04.2026</code>)`, { reply_markup: MAIN_MENU }); return; }
  if (text === "📆 Oraliq") { await tgSend(chatId, `📆 Oraliqni yuboring (masalan: <code>1.4.2026 - 30.4.2026</code>)`, { reply_markup: MAIN_MENU }); return; }

  const range = parseFlexibleRange(text);
  if (range) { triggerReport(chatId, { period: "range", from: range.from, to: range.to }); await tgSend(chatId, `⏳ <b>${range.from}</b> — <b>${range.to}</b> tayyorlanmoqda...`, { reply_markup: MAIN_MENU }); return; }
  const date = parseFlexibleDate(text);
  if (date) { triggerReport(chatId, { period: "date", date }); await tgSend(chatId, `⏳ <b>${date}</b> tayyorlanmoqda...`, { reply_markup: MAIN_MENU }); return; }

  await tgSend(chatId, `Tushunmadim. Tugmalardan birini tanlang yoki sanani yuboring.`, { reply_markup: MAIN_MENU });
}

async function handleCallback(supabase: any, cb: any) {
  const chatId = cb.message?.chat?.id;
  const messageId = cb.message?.message_id;
  const data = cb.data || "";
  if (!chatId) { await tgAnswerCallback(cb.id); return; }

  const allowed = await isAllowed(supabase, chatId, null);
  if (!allowed) { await tgAnswerCallback(cb.id, "Ruxsat yo'q"); return; }

  if (data.startsWith("m:")) {
    const [, ym] = data.split(":");
    const [yStr, mStr] = ym.split("-");
    const y = +yStr, m = +mStr;
    const { from, to } = monthRange(y, m);
    await tgAnswerCallback(cb.id, "Tayyorlanmoqda...");
    if (messageId) {
      await fetch(`${TG_API}/editMessageReplyMarkup`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, message_id: messageId, reply_markup: { inline_keyboard: [] } }),
      });
    }
    triggerReport(chatId, { period: "range", from, to });
    await tgSend(chatId, `⏳ <b>${UZ_MONTHS[m-1]} ${y}</b> hisoboti tayyorlanmoqda...`, { reply_markup: MAIN_MENU });
    return;
  }
  if (data === "back") {
    await tgAnswerCallback(cb.id);
    if (messageId) {
      await fetch(`${TG_API}/deleteMessage`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, message_id: messageId }),
      });
    }
    await tgSend(chatId, `👋 Asosiy menyu`, { reply_markup: MAIN_MENU });
    return;
  }
  await tgAnswerCallback(cb.id);
}

let commandsSet = false;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const url = new URL(req.url);

  // ---- Setup branch: register webhook with Telegram ----
  // Call: POST ?action=setup with bearer = anon or service key.
  if (url.searchParams.get("action") === "setup") {
    const auth = req.headers.get("Authorization") ?? "";
    const tok = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (tok !== SB_KEY && tok !== SB_ANON) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type":"application/json" } });
    }
    const secret = await webhookSecret();
    const webhookUrl = `${SB_URL}/functions/v1/telegram-webhook`;
    const r = await fetch(`${TG_API}/setWebhook`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: webhookUrl,
        secret_token: secret,
        allowed_updates: ["message", "callback_query"],
        drop_pending_updates: false,
        max_connections: 100,
      }),
    });
    const data = await r.json();
    await tgSetCommands().catch(()=>{});
    const info = await fetch(`${TG_API}/getWebhookInfo`).then(r=>r.json()).catch(()=>null);
    return new Response(JSON.stringify({ setWebhook: data, info }), { headers: { ...corsHeaders, "Content-Type":"application/json" } });
  }

  // ---- Webhook branch: Telegram POSTs updates here ----
  const expectedSecret = await webhookSecret();
  const gotSecret = req.headers.get("x-telegram-bot-api-secret-token") || req.headers.get("X-Telegram-Bot-Api-Secret-Token");
  if (gotSecret !== expectedSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type":"application/json" } });
  }

  // One-time bot commands setup per instance
  if (!commandsSet) { tgSetCommands().catch(e=>console.error("setMyCommands:",e)); commandsSet = true; }

  let update: any = null;
  try { update = await req.json(); } catch { return new Response("ok"); }

  // Acknowledge Telegram immediately and process in background — never let the
  // webhook hang waiting for downstream work.
  const supabase = createClient(SB_URL, SB_KEY);
  waitUntil((async () => {
    try {
      if (update.message) await handleMessage(supabase, update.message);
      else if (update.edited_message) await handleMessage(supabase, update.edited_message);
      else if (update.callback_query) await handleCallback(supabase, update.callback_query);
    } catch (e) { console.error("handler error:", e); }
  })());

  return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type":"application/json" } });
});
