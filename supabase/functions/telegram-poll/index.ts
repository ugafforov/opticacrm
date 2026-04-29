// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TG_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
const TG_API = `https://api.telegram.org/bot${TG_TOKEN}`;

const MAX_RUNTIME_MS = 50_000;

async function tgSend(chatId: number, text: string) {
  await fetch(`${TG_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const start = Date.now();
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

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
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offset, timeout, allowed_updates: ["message"] }),
      });
      const data = await res.json();
      if (!res.ok) {
        console.error("getUpdates failed:", data);
        return new Response(JSON.stringify({ error: data }), { status: 502, headers: corsHeaders });
      }

      const updates = data.result || [];
      if (updates.length === 0) continue;

      for (const u of updates) {
        const msg = u.message;
        if (!msg || !msg.text) continue;
        const chatId = msg.chat.id;
        const text = msg.text.trim();

        // /start — emailni so'raymiz
        if (text === "/start" || text.toLowerCase() === "/start@bot") {
          // Allaqachon obuna bo'lganmi?
          const { data: existing } = await supabase
            .from("telegram_subscribers").select("email").eq("chat_id", chatId).maybeSingle();
          if (existing) {
            await tgSend(chatId, `✅ Siz allaqachon obuna bo'lgansiz (<b>${existing.email}</b>).\n\nHar kuni soat 20:00 da kunlik hisobot yuboriladi.`);
            continue;
          }
          await supabase.from("telegram_pending_auth").upsert({ chat_id: chatId });
          await tgSend(chatId, `👋 Salom! Optica hisobot botiga xush kelibsiz.\n\nDavom etish uchun tizimdagi <b>admin</b> emailingizni yuboring.`);
          continue;
        }

        if (text === "/stop") {
          await supabase.from("telegram_subscribers").delete().eq("chat_id", chatId);
          await supabase.from("telegram_pending_auth").delete().eq("chat_id", chatId);
          await tgSend(chatId, `❌ Obuna bekor qilindi. Qayta obuna bo'lish uchun /start yuboring.`);
          continue;
        }

        // Pending auth — email kutyapmiz
        const { data: pending } = await supabase
          .from("telegram_pending_auth").select("chat_id").eq("chat_id", chatId).maybeSingle();

        if (pending) {
          const email = text.toLowerCase().trim();
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            await tgSend(chatId, `❗ Noto'g'ri email format. Iltimos, to'g'ri emailni yuboring.`);
            continue;
          }

          // Auth user topish
          const { data: usersList, error: listErr } = await supabase.auth.admin.listUsers();
          if (listErr) {
            await tgSend(chatId, `⚠️ Xatolik. Keyinroq urinib ko'ring.`);
            continue;
          }
          const user = usersList.users.find((u: any) => u.email?.toLowerCase() === email);
          if (!user) {
            await tgSend(chatId, `❌ Bu email tizimda topilmadi.`);
            continue;
          }

          // Admin tekshirish
          const { data: roleData } = await supabase
            .from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
          if (!roleData) {
            await tgSend(chatId, `🚫 Bu foydalanuvchi admin emas. Faqat adminlar hisobot ola oladi.`);
            continue;
          }

          await supabase.from("telegram_subscribers").upsert({
            chat_id: chatId, user_id: user.id, email,
          }, { onConflict: "chat_id" });
          await supabase.from("telegram_pending_auth").delete().eq("chat_id", chatId);

          await tgSend(chatId, `✅ Tasdiqlandi!\n\nXush kelibsiz, <b>${email}</b>.\nHar kuni Toshkent vaqti bilan soat <b>20:00</b> da kunlik hisobot va Excel fayl yuboriladi.\n\nObunani bekor qilish uchun /stop`);
          continue;
        }

        await tgSend(chatId, `Buyruqni tushunmadim. /start yuboring.`);
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
