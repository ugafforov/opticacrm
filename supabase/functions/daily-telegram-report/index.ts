// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import ExcelJS from "https://esm.sh/exceljs@4.4.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TG_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
const TG_API = `https://api.telegram.org/bot${TG_TOKEN}`;

function uzNow(): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Tashkent" }));
}
function fmtUz(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}-${mm}-${d.getFullYear()}`;
}
function todayUz(): string { return fmtUz(uzNow()); }
function yesterdayUz(): string { const d = uzNow(); d.setDate(d.getDate() - 1); return fmtUz(d); }

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

// DD-MM-YYYY ni Date ga aylantirish
function parseUz(s: string): Date | null {
  const m = s.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!m) return null;
  return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
}

function fmtMoney(n: number): string {
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " so'm";
}

async function tgSend(chatId: number, text: string) {
  const res = await fetch(`${TG_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  });
  if (!res.ok) console.error("sendMessage failed:", await res.text());
}

const MAIN_MENU = {
  keyboard: [
    [{ text: "📊 Bugun" }, { text: "📅 Kecha" }],
    [{ text: "📈 Hafta" }, { text: "🗓 Oy" }],
    [{ text: "🔎 Boshqa sana" }],
  ],
  resize_keyboard: true,
  is_persistent: true,
};

async function tgSendDocument(chatId: number, filename: string, bytes: Uint8Array, caption: string) {
  const fd = new FormData();
  fd.append("chat_id", String(chatId));
  fd.append("caption", caption);
  fd.append("parse_mode", "HTML");
  fd.append("reply_markup", JSON.stringify(MAIN_MENU));
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

async function fetchAllForUser(supabase: any, table: string, userId: string) {
  // Supabase 1000 qator limitini chetlab o'tish uchun sahifalab olamiz
  const PAGE = 1000;
  let from = 0;
  let all: any[] = [];
  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .eq("user_id", userId)
      .range(from, from + PAGE - 1);
    if (error) throw error;
    const rows = data || [];
    all = all.concat(rows);
    if (rows.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

function rangeLabel(from: string, to: string): string {
  return from === to ? from : `${from} – ${to}`;
}

async function buildReport(supabase: any, sourceUserId: string, fromDate: string, toDate: string, periodTitle: string) {
  const fromD = parseUz(fromDate)!;
  const toD = parseUz(toDate)!;
  const inRange = (s: string) => {
    const d = parseUz(normDate(s));
    if (!d) return false;
    return d >= fromD && d <= toD;
  };

  const [allBuyurt, allTeksh, allTayyor, allLinza, allXarajat, allQarz, allTolov] = await Promise.all([
    fetchAllForUser(supabase, "buyurtmalar", sourceUserId),
    fetchAllForUser(supabase, "tekshiruvlar", sourceUserId),
    fetchAllForUser(supabase, "tayyor_kozoynaklar", sourceUserId),
    fetchAllForUser(supabase, "linza_sotuvlari", sourceUserId),
    fetchAllForUser(supabase, "xarajatlar", sourceUserId),
    fetchAllForUser(supabase, "qarzdorlar", sourceUserId),
    fetchAllForUser(supabase, "qarz_tolovlari", sourceUserId),
  ]);

  const buyurtmalar = allBuyurt.filter((r: any) => inRange(r.sana));
  const tekshiruvlar = allTeksh.filter((r: any) => inRange(r.sana));
  const tayyor = allTayyor.filter((r: any) => inRange(r.sana));
  const linza = allLinza.filter((r: any) => inRange(r.sana));
  const xarajatlar = allXarajat.filter((r: any) => inRange(r.sana));
  const qarzdorlar = allQarz.filter((r: any) => inRange(r.sana));
  const qarzTolovlari = allTolov.filter((r: any) => inRange(r.sana));

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

  const periodLabel = rangeLabel(fromDate, toDate);

  const text = `📊 <b>${periodTitle}</b>\n` +
    `📅 ${periodLabel}\n\n` +
    `👁 <b>Buyurtmalar:</b> ${buyurtmalar.length} ta — ${fmtMoney(buyurtmaSum)}\n` +
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

  const wb = new ExcelJS.Workbook();

  // ===== XULOSA =====
  const summary = wb.addWorksheet("Xulosa");
  summary.mergeCells("A1:C1");
  const titleCell = summary.getCell("A1");
  titleCell.value = `Optica — ${periodTitle}`;
  titleCell.font = { bold: true, size: 16, color: { argb: "FF1F4E78" } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  summary.getRow(1).height = 28;

  summary.mergeCells("A2:C2");
  const periodCell = summary.getCell("A2");
  periodCell.value = `📅 ${periodLabel}`;
  periodCell.font = { italic: true, size: 12, color: { argb: "FF555555" } };
  periodCell.alignment = { horizontal: "center" };
  summary.getRow(2).height = 22;

  summary.addRow([]);
  summary.addRow(["Kategoriya", "Soni", "Summa (so'm)"]);
  styleHeader(summary.getRow(4));
  summary.getRow(4).height = 22;

  const addSummaryRow = (label: string, count: number | string, sum: number, fillColor?: string) => {
    const r = summary.addRow([label, count, sum]);
    r.getCell(3).numFmt = '#,##0';
    r.height = 20;
    if (fillColor) {
      r.font = { bold: true };
      r.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fillColor } };
    }
    r.alignment = { vertical: "middle" };
  };

  addSummaryRow("👁 Buyurtmalar", buyurtmalar.length, buyurtmaSum);
  addSummaryRow("🔍 Tekshiruvlar", tekshiruvlar.length, tekshSum);
  addSummaryRow("🕶 Tayyor ko'zoynaklar", tayyor.length, tayyorSum);
  addSummaryRow("🔬 Linza sotuvi", linza.length, linzaSum);
  addSummaryRow("💰 JAMI SAVDO", "", jamiSavdo, "FFC6EFCE");
  addSummaryRow("💸 Xarajatlar", xarajatlar.length, -xarajatSum);
  addSummaryRow("📥 Qarz to'lovlari", qarzTolovlari.length, tolovSum);
  addSummaryRow("📤 Yangi qarzdorlar", qarzdorlar.length, qarzSum);
  addSummaryRow("✅ SOF DAROMAD", "", sofDaromad, "FF9BC2E6");

  // Aniq ustun kengliklari (auto-fit emoji bilan yaxshi ishlamaydi)
  summary.getColumn(1).width = 32;
  summary.getColumn(2).width = 12;
  summary.getColumn(3).width = 22;
  summary.getColumn(2).alignment = { horizontal: "center" };
  summary.getColumn(3).alignment = { horizontal: "right" };

  // Vaqtni HH:MM formatda olish
  const fmtTime = (createdAt: string | null | undefined): string => {
    if (!createdAt) return "-";
    try {
      const d = new Date(createdAt);
      const localStr = d.toLocaleString("en-GB", { timeZone: "Asia/Tashkent", hour: "2-digit", minute: "2-digit", hour12: false });
      return localStr;
    } catch { return "-"; }
  };

  const addDetailSheet = (name: string, headers: string[], rows: any[][], totalIdx?: number, widths?: number[]) => {
    const sh = wb.addWorksheet(name);
    sh.addRow(headers);
    styleHeader(sh.getRow(1));
    sh.getRow(1).height = 22;
    rows.forEach((r) => sh.addRow(r));
    if (totalIdx !== undefined && rows.length > 0) {
      const total = rows.reduce((s, r) => s + (Number(r[totalIdx]) || 0), 0);
      const tr = sh.addRow(headers.map((_, i) => i === totalIdx ? total : (i === totalIdx - 1 ? "JAMI:" : "")));
      tr.font = { bold: true };
      tr.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFE699" } };
      tr.getCell(totalIdx + 1).numFmt = '#,##0';
    }
    // Summa ustunini formatlash
    if (totalIdx !== undefined) {
      sh.getColumn(totalIdx + 1).numFmt = '#,##0';
      sh.getColumn(totalIdx + 1).alignment = { horizontal: "right" };
    }
    // Ustun kengliklari
    if (widths) {
      widths.forEach((w, i) => { sh.getColumn(i + 1).width = w; });
    } else {
      autoWidth(sh);
    }
    // Sarlavha ostida freeze
    sh.views = [{ state: "frozen", ySplit: 1 }];
  };

  addDetailSheet("Buyurtmalar",
    ["№", "Sana", "Vaqt", "Mijoz", "Telefon", "OD", "OS", "Oyna turi", "Oyna narxi", "Oprava turi", "Oprava narxi", "Jami summa"],
    buyurtmalar.map((b: any) => [
      b.tartib_raqam, b.sana, fmtTime(b.created_at), b.mijoz, b.telefon || "-",
      b.od, b.os, b["oyna_tури"], Number(b.oyna_narxi) || 0,
      b.oprava_turi, Number(b.oprava_narxi) || 0, Number(b.jami_summa) || 0,
    ]),
    11,
    [6, 12, 8, 22, 16, 10, 10, 16, 14, 16, 14, 16],
  );

  addDetailSheet("Tekshiruvlar",
    ["№", "Sana", "Vaqt", "Mijoz", "Tanometriya", "Refraksiyametriya", "Jami summa"],
    tekshiruvlar.map((t: any) => [
      t.tartib_raqam, t.sana, fmtTime(t.created_at), t.mijoz,
      t.tanometriya ? "Ha" : "Yo'q", t.refraksiyametriya ? "Ha" : "Yo'q", Number(t.jami_summa) || 0,
    ]),
    6,
    [6, 12, 8, 22, 14, 18, 16],
  );

  addDetailSheet("Tayyor kozoynaklar",
    ["№", "Sana", "Vaqt", "Mijoz", "Ko'zoynak turi", "Summa"],
    tayyor.map((t: any) => [t.tartib_raqam, t.sana, fmtTime(t.created_at), t.kliyent, t.kozoynak_turi, Number(t.summa) || 0]),
    5,
    [6, 12, 8, 22, 22, 16],
  );

  addDetailSheet("Linza sotuvi",
    ["№", "Sana", "Vaqt", "Mijoz", "Linza turi", "Summa"],
    linza.map((l: any) => [l.tartib_raqam, l.sana, fmtTime(l.created_at), l.kliyent, l.linza_turi, Number(l.summa) || 0]),
    5,
    [6, 12, 8, 22, 22, 16],
  );

  addDetailSheet("Xarajatlar",
    ["№", "Sana", "Vaqt", "Kategoriya", "Izoh", "Summa"],
    xarajatlar.map((x: any) => [x.tartib_raqam, x.sana, fmtTime(x.created_at), x.kategoriya, x.tavsif || "-", Number(x.summa) || 0]),
    5,
    [6, 12, 8, 18, 30, 16],
  );

  addDetailSheet("Qarzdorlar (yangi)",
    ["№", "Sana", "Vaqt", "Mijoz", "Telefon", "Qarz summasi", "Qoldiq", "Holat", "Izoh"],
    qarzdorlar.map((q: any) => [
      q.tartib_raqam, q.sana, fmtTime(q.created_at), q.mijoz, q.telefon || "-",
      Number(q.qarz_summasi) || 0, Number(q.qoldiq_summa) || 0, q.holat, q.izoh || "-",
    ]),
    5,
    [6, 12, 8, 22, 16, 16, 16, 14, 26],
  );

  addDetailSheet("Qarz tolovlari",
    ["Sana", "Vaqt", "Qarzdor ID", "Summa", "Izoh"],
    qarzTolovlari.map((q: any) => [q.sana, fmtTime(q.created_at), q.qarzdor_id, Number(q.summa) || 0, q.izoh || "-"]),
    3,
    [12, 8, 38, 16, 30],
  );

  const buf = await wb.xlsx.writeBuffer();
  return { text, excel: new Uint8Array(buf as ArrayBuffer), periodLabel };
}

// Period -> {from, to, title}
function resolvePeriod(period: string, customDate?: string, customFrom?: string, customTo?: string) {
  const today = todayUz();
  switch (period) {
    case "today":     return { from: today, to: today, title: "Bugungi hisobot" };
    case "yesterday": return { from: yesterdayUz(), to: yesterdayUz(), title: "Kechagi hisobot" };
    case "week": {
      const d = uzNow(); d.setDate(d.getDate() - 6);
      return { from: fmtUz(d), to: today, title: "So'nggi 7 kun" };
    }
    case "month": {
      const d = uzNow(); d.setDate(d.getDate() - 29);
      return { from: fmtUz(d), to: today, title: "So'nggi 30 kun" };
    }
    case "date":
      if (!customDate) throw new Error("date kerak");
      return { from: customDate, to: customDate, title: `Hisobot: ${customDate}` };
    case "range":
      if (!customFrom || !customTo) throw new Error("from/to kerak");
      return { from: customFrom, to: customTo, title: "Davr hisoboti" };
    default:
      return { from: today, to: today, title: "Kunlik hisobot" };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let body: any = {};
    try { body = await req.json(); } catch {}
    const { chat_id, period = "today", date, from, to } = body;

    // Source user
    const { data: settings, error: setErr } = await supabase
      .from("telegram_settings").select("source_user_id").eq("id", 1).single();
    if (setErr) throw setErr;
    const sourceUserId = settings?.source_user_id;
    if (!sourceUserId) {
      return new Response(JSON.stringify({ error: "Source user not configured" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { from: fromDate, to: toDate, title } = resolvePeriod(period, date, from, to);
    const report = await buildReport(supabase, sourceUserId, fromDate, toDate, title);

    // Aniq chat_id berilsa faqat o'shanga; aks holda barcha subscribers
    let targets: number[] = [];
    if (chat_id) {
      targets = [Number(chat_id)];
    } else {
      const { data: subs } = await supabase.from("telegram_subscribers").select("chat_id");
      targets = (subs || []).map((s: any) => Number(s.chat_id));
    }

    if (targets.length === 0) {
      return new Response(JSON.stringify({ ok: true, message: "No targets" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sent = 0;
    for (const cid of targets) {
      await tgSend(cid, report.text);
      await tgSendDocument(cid, `Optica_${fromDate}_${toDate}.xlsx`, report.excel, `📎 ${title} — ${report.periodLabel}`);
      sent++;
    }

    return new Response(JSON.stringify({ ok: true, sent, period: report.periodLabel }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("daily-telegram-report error:", e);
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
