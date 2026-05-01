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

// Doimiy pastki klaviatura — har doim ko'rinib turadi
const MAIN_MENU = {
  keyboard: [
    [{ text: "📊 Bugun" }, { text: "📅 Kecha" }],
    [{ text: "📈 Hafta" }, { text: "🗓 Oy" }],
    [{ text: "🔎 Boshqa sana" }],
  ],
  resize_keyboard: true,
  is_persistent: true,
};

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

function normPhone(s: string): string {
  let d = (s || "").replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.length === 9) d = "998" + d;
  return "+" + d;
}

async function isAllowed(supabase: any, chatId: number, phone: string | null): Promise<boolean> {
  // Chat ID bo'yicha
  const { data: byChat } = await supabase.from("telegram_allowed_users")
    .select("id").eq("telegram_chat_id", chatId).maybeSingle();
  if (byChat) return true;
  // Telefon bo'yicha
  if (phone) {
    const { data: byPhone } = await supabase.from("telegram_allowed_users")
      .select("id").eq("phone", phone).maybeSingle();
    if (byPhone) {
      // Chat ID ni bog'lab qo'yamiz
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
  await fetch(REPORT_FN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SB_KEY}`,
    },
    body: JSON.stringify({ chat_id: chatId, ...payload }),
  });
}

async function handleMessage(supabase: any, msg: any) {
  const chatId = msg.chat.id;
  const text = (msg.text || "").trim();
  const contact = msg.contact;

  // Kontakt yuborilgan
  if (contact && contact.phone_number) {
    const phone = normPhone(contact.phone_number);
    // Har doim obunachi sifatida saqlaymiz (admin keyin ruxsat bera oladi)
    await ensureSubscriber(supabase, chatId, msg.from || {}, phone);
    const ok = await isAllowed(supabase, chatId, phone);
    if (ok) {
      await tgSend(chatId, `✅ Tasdiqlandi! Endi quyidagi tugmalar orqali hisobot oling.`, {
        reply_markup: MAIN_MENU,
      });
    } else {
      await tgSend(chatId, `⏳ Sizning ma'lumotlaringiz adminga yuborildi.\n\n📱 Telefon: <code>${phone}</code>\n🆔 Profil ID: <code>${chatId}</code>\n\nAdmin ruxsat bergach, /start yuboring.`, {
        reply_markup: { remove_keyboard: true },
      });
    }
    return;
  }

  if (text === "/start" || text === "/menu") {
    // Har doim obunachi sifatida saqlaymiz
    await ensureSubscriber(supabase, chatId, msg.from || {}, null);
    const allowed = await isAllowed(supabase, chatId, null);
    if (allowed) {
      await tgSend(chatId, `👋 Xush kelibsiz!\n\nHisobot olish uchun davrni tanlang:`, { reply_markup: MAIN_MENU });
      return;
    }
    await tgSend(chatId, `👋 Salom! Optica hisobot botiga xush kelibsiz.\n\nDavom etish uchun telefon raqamingizni yuboring (pastdagi tugma orqali).\n\nAgar admin sizning <b>Profil ID</b> ingizni qo'shgan bo'lsa: <code>${chatId}</code> — bir necha soniyadan so'ng /start ni qayta yuboring.`, {
      reply_markup: {
        keyboard: [[{ text: "📱 Telefon raqamni yuborish", request_contact: true }]],
        resize_keyboard: true, one_time_keyboard: true,
      },
    });
    return;
  }

  // Boshqa har qanday matn — avval ruxsat tekshirish
  const allowed = await isAllowed(supabase, chatId, null);
  if (!allowed) {
    await tgSend(chatId, `🚫 Sizda ruxsat yo'q. /start yuboring.`);
    return;
  }

  // Sana kiritish (DD-MM-YYYY)
  if (/^\d{2}-\d{2}-\d{4}$/.test(text)) {
    await tgSend(chatId, `⏳ <b>${text}</b> sanasi uchun hisobot tayyorlanmoqda...`, { reply_markup: MAIN_MENU });
    await triggerReport(chatId, { period: "date", date: text });
    return;
  }

  // Pastki klaviatura tugmalari
  const textMap: Record<string, string> = {
    "📊 Bugun": "today",
    "📅 Kecha": "yesterday",
    "📈 Hafta": "week",
    "🗓 Oy": "month",
  };
  if (textMap[text]) {
    await tgSend(chatId, `⏳ Hisobot tayyorlanmoqda...`, { reply_markup: MAIN_MENU });
    await triggerReport(chatId, { period: textMap[text] });
    return;
  }
  if (text === "🔎 Boshqa sana") {
    await tgSend(chatId, `📅 Iltimos, sanani <b>DD-MM-YYYY</b> formatida yuboring (masalan: <code>15-04-2026</code>)`, { reply_markup: MAIN_MENU });
    return;
  }

  if (text === "/help") {
    await tgSend(chatId, `<b>Buyruqlar:</b>\n/start — menyu\n/menu — menyu\n\nYoki istalgan sanani <code>DD-MM-YYYY</code> formatida yuboring.`, { reply_markup: MAIN_MENU });
    return;
  }

  await tgSend(chatId, `Quyidagi tugmalardan birini tanlang yoki sanani <code>DD-MM-YYYY</code> formatida yuboring:`, { reply_markup: MAIN_MENU });
}

async function handleCallback(supabase: any, cb: any) {
  const chatId = cb.message?.chat?.id;
  const data = cb.data || "";
  if (!chatId) { await tgAnswerCallback(cb.id); return; }

  const allowed = await isAllowed(supabase, chatId, null);
  if (!allowed) {
    await tgAnswerCallback(cb.id, "Ruxsat yo'q");
    await tgSend(chatId, `🚫 Sizda ruxsat yo'q. /start yuboring.`);
    return;
  }

  if (data === "p:custom") {
    await tgAnswerCallback(cb.id);
    await tgSend(chatId, `📅 Iltimos, sanani <b>DD-MM-YYYY</b> formatida yuboring (masalan: <code>15-04-2026</code>)`);
    return;
  }

  const map: Record<string, string> = {
    "p:today": "today", "p:yesterday": "yesterday", "p:week": "week", "p:month": "month",
  };
  const period = map[data];
  if (!period) { await tgAnswerCallback(cb.id); return; }

  await tgAnswerCallback(cb.id, "Tayyorlanmoqda...");
  await tgSend(chatId, `⏳ Hisobot tayyorlanmoqda...`);
  await triggerReport(chatId, { period });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const start = Date.now();
  const supabase = createClient(SB_URL, SB_KEY);

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

      for (const u of updates) {
        try {
          if (u.message) await handleMessage(supabase, u.message);
          else if (u.callback_query) await handleCallback(supabase, u.callback_query);
        } catch (err) {
          console.error("handler error:", err);
        }
      }

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
