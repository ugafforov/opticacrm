// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import ExcelJS from "https://esm.sh/exceljs@4.4.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TG_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
const TG_API = `https://api.telegram.org/bot${TG_TOKEN}`;

// Toshkent vaqti bilan bugungi sana DD-MM-YYYY
function todayUz(): string {
  const now = new Date();
  const uz = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Tashkent" }));
  const d = String(uz.getDate()).padStart(2, "0");
  const m = String(uz.getMonth() + 1).padStart(2, "0");
  return `${d}-${m}-${uz.getFullYear()}`;
}

// Sana DD-MM-YYYY ga normalizatsiya (DB da turli format bo'lishi mumkin)
function normDate(s: string | null | undefined): string {
  if (!s) return "";
  if (/^\d{2}-\d{2}-\d{4}$/.test(s)) return s;
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(s)) return s.replace(/\./g, "-");
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split("-");
    return `${d}-${m}-${y}`;
  }
  return s;
}

function fmtMoney(n: number): string {
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " so'm";
}

async function fetchAllForUserOnDate(supabase: any, table: string, userId: string, date: string) {
  const { data, error } = await supabase.from(table).select("*").eq("user_id", userId);
  if (error) throw error;
  return (data || []).filter((r: any) => normDate(r.sana) === date);
}

async function tgSend(chatId: number, text: string) {
  const res = await fetch(`${TG_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  });
  if (!res.ok) console.error("sendMessage failed:", await res.text());
}

async function tgSendDocument(chatId: number, filename: string, bytes: Uint8Array, caption: string) {
  const fd = new FormData();
  fd.append("chat_id", String(chatId));
  fd.append("caption", caption);
  fd.append("parse_mode", "HTML");
  fd.append("document", new Blob([bytes], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  }), filename);

  const res = await fetch(`${TG_API}/sendDocument`, { method: "POST", body: fd });
  if (!res.ok) console.error("sendDocument failed:", await res.text());
}

function styleHeader(row: any) {
  row.font = { bold: true, color: { argb: "FFFFFFFF" } };
  row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F4E78" } };
  row.alignment = { vertical: "middle", horizontal: "center" };
}

function autoWidth(sheet: any) {
  sheet.columns.forEach((col: any) => {
    let max = 10;
    col.eachCell?.({ includeEmpty: true }, (cell: any) => {
      const v = cell.value ? String(cell.value).length : 0;
      if (v > max) max = v;
    });
    col.width = Math.min(max + 2, 50);
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: subs, error: subsErr } = await supabase
      .from("telegram_subscribers").select("chat_id, user_id, email");
    if (subsErr) throw subsErr;

    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ ok: true, message: "No subscribers" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const date = todayUz();
    let sentCount = 0;

    // Har bir admin uchun alohida hisobot (chunki ma'lumotlar user_id ga bog'liq)
    const cache = new Map<string, any>();

    for (const sub of subs) {
      let report = cache.get(sub.user_id);
      if (!report) {
        const [buyurtmalar, tekshiruvlar, tayyor, linza, xarajatlar, qarzdorlar, qarzTolovlari] = await Promise.all([
          fetchAllForUserOnDate(supabase, "buyurtmalar", sub.user_id, date),
          fetchAllForUserOnDate(supabase, "tekshiruvlar", sub.user_id, date),
          fetchAllForUserOnDate(supabase, "tayyor_kozoynaklar", sub.user_id, date),
          fetchAllForUserOnDate(supabase, "linza_sotuvlari", sub.user_id, date),
          fetchAllForUserOnDate(supabase, "xarajatlar", sub.user_id, date),
          fetchAllForUserOnDate(supabase, "qarzdorlar", sub.user_id, date),
          fetchAllForUserOnDate(supabase, "qarz_tolovlari", sub.user_id, date),
        ]);

        const sumBy = (arr: any[], key: string) => arr.reduce((s, r) => s + (Number(r[key]) || 0), 0);

        const buyurtmaSum = sumBy(buyurtmalar, "jami_summa");
        const tekshSum = sumBy(tekshiruvlar, "jami_summa");
        const tayyorSum = sumBy(tayyor, "summa");
        const linzaSum = sumBy(linza, "summa");
        const xarajatSum = sumBy(xarajatlar, "summa");
        const qarzSum = sumBy(qarzdorlar, "qarz_summasi");
        const tolovSum = sumBy(qarzTolovlari, "summa");

        const jamiSavdo = buyurtmaSum + tekshSum + tayyorSum + linzaSum;
        const sofDaromad = jamiSavdo + tolovSum - xarajatSum;

        // Matnli xulosa
        const text = `📊 <b>Kunlik hisobot — ${date}</b>\n\n` +
          `👁 <b>Buyurtmalar (ko'zoynak):</b> ${buyurtmalar.length} ta — ${fmtMoney(buyurtmaSum)}\n` +
          `🔍 <b>Tekshiruvlar:</b> ${tekshiruvlar.length} ta — ${fmtMoney(tekshSum)}\n` +
          `🕶 <b>Tayyor ko'zoynaklar:</b> ${tayyor.length} ta — ${fmtMoney(tayyorSum)}\n` +
          `🔬 <b>Linza sotuvi:</b> ${linza.length} ta — ${fmtMoney(linzaSum)}\n\n` +
          `━━━━━━━━━━━━━━━\n` +
          `💰 <b>Jami savdo:</b> ${fmtMoney(jamiSavdo)}\n` +
          `💸 <b>Xarajatlar:</b> ${xarajatlar.length} ta — ${fmtMoney(xarajatSum)}\n` +
          `📥 <b>Qarz to'lovlari:</b> ${qarzTolovlari.length} ta — ${fmtMoney(tolovSum)}\n` +
          `📤 <b>Yangi qarzdorlar:</b> ${qarzdorlar.length} ta — ${fmtMoney(qarzSum)}\n\n` +
          `✅ <b>Sof daromad:</b> ${fmtMoney(sofDaromad)}\n\n` +
          `📎 Batafsil ma'lumot Excel faylda.`;

        // Excel
        const wb = new ExcelJS.Workbook();

        const addSheet = (name: string, headers: string[], rows: any[][], totalIdx?: number) => {
          const sh = wb.addWorksheet(name);
          sh.addRow(headers);
          styleHeader(sh.getRow(1));
          rows.forEach((r) => sh.addRow(r));
          if (totalIdx !== undefined && rows.length > 0) {
            const total = rows.reduce((s, r) => s + (Number(r[totalIdx]) || 0), 0);
            const totalRow = sh.addRow(headers.map((_, i) => i === totalIdx ? total : (i === totalIdx - 1 ? "JAMI:" : "")));
            totalRow.font = { bold: true };
            totalRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFE699" } };
          }
          autoWidth(sh);
        };

        // Xulosa sahifasi
        const summary = wb.addWorksheet("Xulosa");
        summary.addRow(["Optica — Kunlik hisobot", date]);
        summary.getRow(1).font = { bold: true, size: 14 };
        summary.addRow([]);
        summary.addRow(["Kategoriya", "Soni", "Summa (so'm)"]);
        styleHeader(summary.getRow(3));
        summary.addRow(["Buyurtmalar", buyurtmalar.length, buyurtmaSum]);
        summary.addRow(["Tekshiruvlar", tekshiruvlar.length, tekshSum]);
        summary.addRow(["Tayyor ko'zoynaklar", tayyor.length, tayyorSum]);
        summary.addRow(["Linza sotuvi", linza.length, linzaSum]);
        const jamiRow = summary.addRow(["Jami savdo", "", jamiSavdo]);
        jamiRow.font = { bold: true };
        jamiRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFC6EFCE" } };
        summary.addRow(["Xarajatlar", xarajatlar.length, -xarajatSum]);
        summary.addRow(["Qarz to'lovlari (kirim)", qarzTolovlari.length, tolovSum]);
        summary.addRow(["Yangi qarzdorlar", qarzdorlar.length, qarzSum]);
        const sofRow = summary.addRow(["Sof daromad", "", sofDaromad]);
        sofRow.font = { bold: true };
        sofRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF9BC2E6" } };
        autoWidth(summary);

        addSheet("Buyurtmalar",
          ["№", "Sana", "Mijoz", "Telefon", "OD", "OS", "Oyna turi", "Oyna narxi", "Oprava turi", "Oprava narxi", "Jami summa"],
          buyurtmalar.map((b: any) => [b.tartib_raqam, b.sana, b.mijoz, b.telefon || "-", b.od, b.os, b["oyna_tури"], Number(b.oyna_narxi) || 0, b.oprava_turi, Number(b.oprava_narxi) || 0, Number(b.jami_summa) || 0]),
          10);

        addSheet("Tekshiruvlar",
          ["№", "Sana", "Mijoz", "Tanometriya", "Refraksiyametriya", "Jami summa"],
          tekshiruvlar.map((t: any) => [t.tartib_raqam, t.sana, t.mijoz, t.tanometriya ? "Ha" : "Yo'q", t.refraksiyametriya ? "Ha" : "Yo'q", Number(t.jami_summa) || 0]),
          5);

        addSheet("Tayyor kozoynaklar",
          ["№", "Sana", "Mijoz", "Ko'zoynak turi", "Summa"],
          tayyor.map((t: any) => [t.tartib_raqam, t.sana, t.kliyent, t.kozoynak_turi, Number(t.summa) || 0]),
          4);

        addSheet("Linza sotuvi",
          ["№", "Sana", "Mijoz", "Linza turi", "Summa"],
          linza.map((l: any) => [l.tartib_raqam, l.sana, l.kliyent, l.linza_turi, Number(l.summa) || 0]),
          4);

        addSheet("Xarajatlar",
          ["№", "Sana", "Kategoriya", "Izoh", "Summa"],
          xarajatlar.map((x: any) => [x.tartib_raqam, x.sana, x.kategoriya, x.tavsif || "-", Number(x.summa) || 0]),
          4);

        addSheet("Qarzdorlar (yangi)",
          ["№", "Sana", "Mijoz", "Telefon", "Qarz summasi", "Qoldiq", "Holat", "Izoh"],
          qarzdorlar.map((q: any) => [q.tartib_raqam, q.sana, q.mijoz, q.telefon || "-", Number(q.qarz_summasi) || 0, Number(q.qoldiq_summa) || 0, q.holat, q.izoh || "-"]),
          4);

        addSheet("Qarz tolovlari",
          ["Sana", "Qarzdor ID", "Summa", "Izoh"],
          qarzTolovlari.map((q: any) => [q.sana, q.qarzdor_id, Number(q.summa) || 0, q.izoh || "-"]),
          2);

        const buf = await wb.xlsx.writeBuffer();
        report = { text, excel: new Uint8Array(buf as ArrayBuffer) };
        cache.set(sub.user_id, report);
      }

      await tgSend(sub.chat_id, report.text);
      await tgSendDocument(sub.chat_id, `Optica_hisobot_${date}.xlsx`, report.excel, `📎 Optica kunlik hisobot — ${date}`);
      sentCount++;
    }

    return new Response(JSON.stringify({ ok: true, sent: sentCount, date }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("daily-telegram-report error:", e);
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
