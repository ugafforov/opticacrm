// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TG_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
const TG_API = `https://api.telegram.org/bot${TG_TOKEN}`;
const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const REPORT_FN_URL = `${SB_URL}/functions/v1/daily-telegram-report`;

const MAX_RUNTIME_MS = 50_000;

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

// Joriy oydan boshlab ortga 12 oy (eng yangisi birinchi)
function buildMonthsKeyboard() {
  const now = uzNow();
  const items: { y: number; m: number; label: string; data: string }[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const isCurrent = i === 0;
    const label = `${isCurrent ? "📍 " : ""}${UZ_MONTHS[m - 1]} ${y}`;
    items.push({ y, m, label, data: `m:${y}-${String(m).padStart(2,"0")}` });
  }
  // 2 ustun grid
  const rows: any[] = [];
  for (let i = 0; i < items.length; i += 2) {
    const row = [{ text: items[i].label, callback_data: items[i].data }];
    if (items[i + 1]) row.push({ text: items[i + 1].label, callback_data: items[i + 1].data });
    rows.push(row);
  }
  rows.push([{ text: "⬅️ Orqaga", callback_data: "back" }]);
  return { inline_keyboard: rows };
}

function monthRange(y: number, m: number): { from: string; to: string } {
  const first = new Date(y, m - 1, 1);
  const last = new Date(y, m, 0); // oxirgi kun
  const fmt = (d: Date) => `${String(d.getDate()).padStart(2,"0")}-${String(d.getMonth()+1).padStart(2,"0")}-${d.getFullYear()}`;
  return { from: fmt(first), to: fmt(last) };
}

// Moslashuvchan sana parseri
function parseFlexibleDate(input: string): string | null {
  if (!input) return null;
  const s = input.trim().replace(/\s+/g, " ");
  const parts = s.split(/[.\-\/\\ ]+/).filter(Boolean);
  if (parts.length !== 3) return null;
  let d: number, m: number, y: number;
  if (parts[0].length === 4 && /^\d{4}$/.test(parts[0])) {
    y = Number(parts[0]); m = Number(parts[1]); d = Number(parts[2]);
  } else {
    d = Number(parts[0]); m = Number(parts[1]); y = Number(parts[2]);
  }
  if (!Number.isInteger(d) || !Number.isInteger(m) || !Number.isInteger(y)) return null;
  if (y < 100) y += 2000;
  if (y < 1900 || y > 2100) return null;
  if (m < 1 || m > 12) return null;
  if (d < 1 || d > 31) return null;
  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
  return `${String(d).padStart(2,"0")}-${String(m).padStart(2,"0")}-${y}`;
}

function parseFlexibleRange(input: string): { from: string; to: string } | null {
  if (!input) return null;
  const cleaned = input.trim()
    .replace(/\s*(dan|gacha|to|—|–|-|=>|->|,|;)\s*/gi, " | ")
    .replace(/\s+/g, " ");
  let halves: string[];
  if (cleaned.includes("|")) {
    halves = cleaned.split("|").map(s => s.trim()).filter(Boolean);
  } else {
    const tokens = cleaned.split(" ");
    if (tokens.length < 2) return null;
    const mid = Math.floor(tokens.length / 2);
    halves = [tokens.slice(0, mid).join(" "), tokens.slice(mid).join(" ")];
  }
  if (halves.length < 2) return null;
  const from = parseFlexibleDate(halves[0]);
  const to = parseFlexibleDate(halves[1]);
  if (!from || !to) return null;
  return { from, to };
}

async function tgSend(chatId: number, text: string, extra: any = {}) {
  await fetch(`${TG_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", ...extra }),
  });
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
    body: JSON.stringify({
      commands: [
        { command: "start", description: "Botni ishga tushirish / menyu" },
        { command: "menu", description: "Asosiy menyuni ko'rsatish" },
        { command: "today", description: "Bugungi hisobot" },
        { command: "yesterday", description: "Kechagi hisobot" },
        { command: "week", description: "So'nggi 7 kun" },
        { command: "month", description: "Oy tanlash" },
        { command: "stop", description: "Botni to'xtatish (obunani bekor qilish)" },
        { command: "help", description: "Yordam va sana formatlari" },
        { command: "id", description: "Profil ID raqamim" },
      ],
    }),
  });
}

function normPhone(s: string): string {
  let d = (s || "").replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.length === 9) d = "998" + d;
  return "+" + d;
}

async function isAllowed(supabase: any, chatId: number, phone: string | null): Promise<boolean> {
  const { data: byChat } = await supabase.from("telegram_allowed_users")
    .select("id").eq("telegram_chat_id", chatId).maybeSingle();
  if (byChat) return true;
  if (phone) {
    const { data: byPhone } = await supabase.from("telegram_allowed_users")
      .select("id").eq("phone", phone).maybeSingle();
    if (byPhone) {
      await supabase.from("telegram_allowed_users").update({ telegram_chat_id: chatId }).eq("id", byPhone.id);
      return true;
    }
  }
  return false;
}

async function ensureSubscriber(supabase: any, chatId: number, info: any, phone: string | null) {
  await supabase.from("telegram_subscribers").upsert({
    chat_id: chatId,
    phone,
    first_name: info.first_name || null,
    username: info.username || null,
  }, { onConflict: "chat_id" });
}

async function triggerReport(chatId: number, payload: any) {
  // Fire-and-forget — tezroq javob berish uchun await qilmaymiz
  fetch(REPORT_FN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SB_KEY}`,
    },
    body: JSON.stringify({ chat_id: chatId, ...payload }),
  }).catch(err => console.error("triggerReport failed:", err));
}

async function handleMessage(supabase: any, msg: any) {
  const chatId = msg.chat.id;
  const text = (msg.text || "").trim();
  const contact = msg.contact;

  if (contact && contact.phone_number) {
    const phone = normPhone(contact.phone_number);
    await ensureSubscriber(supabase, chatId, msg.from || {}, phone);
    const ok = await isAllowed(supabase, chatId, phone);
    if (ok) {
      await tgSend(chatId, `✅ Tasdiqlandi! Endi quyidagi tugmalar orqali hisobot oling.`, { reply_markup: MAIN_MENU });
    } else {
      await tgSend(chatId, `⏳ Ma'lumotlaringiz adminga yuborildi.\n\n📱 ${phone}\n🆔 <code>${chatId}</code>\n\nAdmin ruxsat bergach, /start yuboring.`, { reply_markup: REMOVE_KB });
    }
    return;
  }

  // Buyruqlar
  if (text === "/start" || text === "/menu") {
    await ensureSubscriber(supabase, chatId, msg.from || {}, null);
    const allowed = await isAllowed(supabase, chatId, null);
    if (allowed) {
      await tgSend(chatId, `👋 Xush kelibsiz!\n\nDavrni tanlang yoki sana yuboring (masalan: <code>1.1.2026</code>).`, { reply_markup: MAIN_MENU });
      return;
    }
    await tgSend(chatId, `👋 Salom! Optica hisobot botiga xush kelibsiz.\n\nDavom etish uchun telefon raqamingizni yuboring.\n\n🆔 Profil ID: <code>${chatId}</code>`, {
      reply_markup: {
        keyboard: [[{ text: "📱 Telefon raqamni yuborish", request_contact: true }]],
        resize_keyboard: true, one_time_keyboard: true,
      },
    });
    return;
  }

  if (text === "/id") {
    await tgSend(chatId, `🆔 Sizning Profil ID: <code>${chatId}</code>`, { reply_markup: MAIN_MENU });
    return;
  }

  if (text === "/stop") {
    await supabase.from("telegram_subscribers").delete().eq("chat_id", chatId);
    await tgSend(chatId, `👋 Obuna bekor qilindi. Qayta yoqish uchun /start yuboring.`, { reply_markup: REMOVE_KB });
    return;
  }

  if (text === "/help") {
    await tgSend(chatId,
      `<b>Buyruqlar:</b>\n` +
      `/start — menyu\n/menu — menyu\n/today — bugun\n/yesterday — kecha\n/week — 7 kun\n/month — oyni tanlash\n/id — profil ID\n/stop — obunani bekor qilish\n\n` +
      `<b>Sana formati:</b> <code>1.1.2026</code>\n` +
      `<b>Oraliq:</b> <code>1.1.2026 - 5.1.2026</code>`,
      { reply_markup: MAIN_MENU });
    return;
  }

  // Quyidagi amallar uchun ruxsat tekshiramiz
  const allowed = await isAllowed(supabase, chatId, null);
  if (!allowed) {
    await tgSend(chatId, `🚫 Sizda ruxsat yo'q. /start yuboring.`);
    return;
  }

  // Buyruq-davrlar
  const cmdMap: Record<string, string> = {
    "/today": "today",
    "/yesterday": "yesterday",
    "/week": "week",
  };
  if (cmdMap[text]) {
    triggerReport(chatId, { period: cmdMap[text] });
    await tgSend(chatId, `⏳ Hisobot tayyorlanmoqda...`, { reply_markup: MAIN_MENU });
    return;
  }

  if (text === "/month" || text === "🗓 Oy") {
    await tgSend(chatId, `🗓 <b>Oyni tanlang:</b>`, { reply_markup: buildMonthsKeyboard() });
    return;
  }

  // Pastki klaviatura tugmalari
  const textMap: Record<string, string> = {
    "📊 Bugun": "today",
    "📅 Kecha": "yesterday",
    "📈 Hafta": "week",
  };
  if (textMap[text]) {
    triggerReport(chatId, { period: textMap[text] });
    await tgSend(chatId, `⏳ Hisobot tayyorlanmoqda...`, { reply_markup: MAIN_MENU });
    return;
  }
  if (text === "🔎 Boshqa sana") {
    await tgSend(chatId, `📅 Sanani yuboring (masalan: <code>15.04.2026</code>)`, { reply_markup: MAIN_MENU });
    return;
  }
  if (text === "📆 Oraliq") {
    await tgSend(chatId, `📆 Oraliqni yuboring (masalan: <code>1.4.2026 - 30.4.2026</code>)`, { reply_markup: MAIN_MENU });
    return;
  }

  // Oraliq parsing
  const range = parseFlexibleRange(text);
  if (range) {
    triggerReport(chatId, { period: "range", from: range.from, to: range.to });
    await tgSend(chatId, `⏳ <b>${range.from}</b> — <b>${range.to}</b> tayyorlanmoqda...`, { reply_markup: MAIN_MENU });
    return;
  }

  const date = parseFlexibleDate(text);
  if (date) {
    triggerReport(chatId, { period: "date", date });
    await tgSend(chatId, `⏳ <b>${date}</b> tayyorlanmoqda...`, { reply_markup: MAIN_MENU });
    return;
  }

  await tgSend(chatId, `Tushunmadim. Tugmalardan birini tanlang yoki sanani yuboring.`, { reply_markup: MAIN_MENU });
}

async function handleCallback(supabase: any, cb: any) {
  const chatId = cb.message?.chat?.id;
  const messageId = cb.message?.message_id;
  const data = cb.data || "";
  if (!chatId) { await tgAnswerCallback(cb.id); return; }

  const allowed = await isAllowed(supabase, chatId, null);
  if (!allowed) {
    await tgAnswerCallback(cb.id, "Ruxsat yo'q");
    return;
  }

  // Oy tanlandi
  if (data.startsWith("m:")) {
    const [, ym] = data.split(":");
    const [yStr, mStr] = ym.split("-");
    const y = Number(yStr); const m = Number(mStr);
    const { from, to } = monthRange(y, m);
    await tgAnswerCallback(cb.id, "Tayyorlanmoqda...");
    // Inline klaviaturani olib tashlash
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

  // Auth: only allow callers that present the service-role key (pg_cron / internal).
  const auth = req.headers.get("Authorization") || "";
  const expected = `Bearer ${SB_KEY}`;
  if (auth !== expected) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const start = Date.now();
  const supabase = createClient(SB_URL, SB_KEY);

  // Bot komandalarini bir marta o'rnatish
  if (!commandsSet) {
    tgSetCommands().catch(e => console.error("setMyCommands:", e));
    commandsSet = true;
  }

  try {
    const { data: state } = await supabase
      .from("telegram_bot_state").select("update_offset").eq("id", 1).single();
    let offset = state?.update_offset || 0;
    let processed = 0;

    while (true) {
      const remaining = MAX_RUNTIME_MS - (Date.now() - start);
      if (remaining < 5000) break;
      const timeout = Math.min(30, Math.floor(remaining / 1000) - 3);
      if (timeout < 1) break;

      const res = await fetch(`${TG_API}/getUpdates`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offset, timeout, allowed_updates: ["message", "callback_query"] }),
      });
      const data = await res.json();
      if (!res.ok) {
        console.error("getUpdates failed:", data);
        return new Response(JSON.stringify({ error: data }), { status: 502, headers: corsHeaders });
      }

      const updates = data.result || [];
      if (updates.length === 0) continue;

      // Parallel handling — tezlik uchun
      await Promise.all(updates.map(async (u: any) => {
        try {
          if (u.message) await handleMessage(supabase, u.message);
          else if (u.callback_query) await handleCallback(supabase, u.callback_query);
        } catch (err) {
          console.error("handler error:", err);
        }
      }));

      processed += updates.length;
      offset = Math.max(...updates.map((u: any) => u.update_id)) + 1;
      await supabase.from("telegram_bot_state")
        .update({ update_offset: offset, updated_at: new Date().toISOString() }).eq("id", 1);
    }

    return new Response(JSON.stringify({ ok: true, processed, offset }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("telegram-poll error:", e);
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500, headers: corsHeaders,
    });
  }
});
