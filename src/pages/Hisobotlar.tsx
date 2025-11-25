import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, FileDown, Printer } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { setupPdfDoc, addPdfHeader } from "@/lib/pdfHelpers";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { cn, formatUzbekistanDateTime, formatDisplayDate } from "@/lib/utils";

interface ReportData {
  name: string;
  tushum: number;
  oldatgiTushum?: number;
}

interface SectionData {
  name: string;
  total: number;
  count: number;
  color: string;
  previousTotal?: number;
  change?: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  total?: number;
  showComparison?: boolean;
}

const Hisobotlar = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [reportData, setReportData] = useState<ReportData[]>([]);
  const [sectionData, setSectionData] = useState<SectionData[]>([]);
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly">("daily");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [showComparison, setShowComparison] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string>("all");
  const [exportFormat, setExportFormat] = useState<"excel" | "pdf">("excel");

  const CustomTooltip = ({ active, payload, label, total, showComparison }: CustomTooltipProps) => {
    if (active && payload && payload.length) {
      const currentIncome = payload[0].value;
      const percentage = total ? ((currentIncome / total) * 100).toFixed(1) : "0";
      const previousIncome = payload[1]?.value;

      return (
        <div className="bg-popover border border-border rounded-lg shadow-lg p-3">
          <p className="font-semibold text-foreground mb-2">{label}</p>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: payload[0].color }} />
              <p className="text-sm text-foreground">
                <span className="font-medium">{currentIncome.toLocaleString()}</span> so'm
                <span className="text-muted-foreground ml-1">({percentage}%)</span>
              </p>
            </div>
            {showComparison && previousIncome !== undefined && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: payload[1].color }} />
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium">{previousIncome.toLocaleString()}</span> so'm
                </p>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  useEffect(() => {
    if (user) {
      loadReportData();
    }
  }, [user, period, startDate, endDate, showComparison, selectedType]);

  const parseDate = (dateString: string): Date => {
    if (!dateString) return new Date();

    // ISO-like format: yyyy-MM-dd (from input type="date")
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const [year, month, day] = dateString.split("-").map(p => parseInt(p, 10));
      const date = new Date(Date.UTC(year, month - 1, day));
      date.setUTCHours(date.getUTCHours() - 5); // Adjust for UTC+5
      return date;
    }

    // DD-MM-YYYY format with dashes (25-11-2025)
    if (/^\d{2}-\d{2}-\d{4}$/.test(dateString)) {
      const [day, month, year] = dateString.split("-").map(p => parseInt(p, 10));
      const date = new Date(Date.UTC(year, month - 1, day));
      date.setUTCHours(date.getUTCHours() - 5); // Adjust for UTC+5
      return date;
    }

    // dd.MM.yyyy format (stored format)
    const parts = dateString.split(".");
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      const date = new Date(Date.UTC(year, month, day));
      date.setUTCHours(date.getUTCHours() - 5); // Adjust for UTC+5
      return date;
    }
    return new Date(dateString);
  };

  const isDateInRange = (dateString: string) => {
    if (!startDate && !endDate) return true;
    
    const itemDate = parseDate(dateString);
    const itemDateOnly = new Date(itemDate.getFullYear(), itemDate.getMonth(), itemDate.getDate());

    if (startDate && endDate) {
      const startDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
      const endDateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
      return itemDateOnly >= startDateOnly && itemDateOnly <= endDateOnly;
    } else if (startDate) {
      const startDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
      return itemDateOnly >= startDateOnly;
    } else if (endDate) {
      const endDateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
      return itemDateOnly <= endDateOnly;
    }
    return true;
  };

  const loadReportData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);

      // Load all data from Supabase
      const [buyurtmalarRes, tekshiruvlarRes, tayyorKozoynakRes, linzaSotuvRes] = await Promise.all([
        supabase.from("buyurtmalar").select("*").eq("user_id", user.id),
        supabase.from("tekshiruvlar").select("*").eq("user_id", user.id),
        supabase.from("tayyor_kozoynaklar").select("*").eq("user_id", user.id),
        supabase.from("linza_sotuvlari").select("*").eq("user_id", user.id),
      ]);

      if (buyurtmalarRes.error) throw buyurtmalarRes.error;
      if (tekshiruvlarRes.error) throw tekshiruvlarRes.error;
      if (tayyorKozoynakRes.error) throw tayyorKozoynakRes.error;
      if (linzaSotuvRes.error) throw linzaSotuvRes.error;

      const buyurtmalar = buyurtmalarRes.data || [];
      const tekshiruvlar = tekshiruvlarRes.data || [];
      const tayyorKozoynaklar = tayyorKozoynakRes.data || [];
      const linzaSotuvlari = linzaSotuvRes.data || [];

      // Calculate current period totals
      const currentBuyurtmalar = buyurtmalar.filter((b: any) => !startDate && !endDate ? true : isDateInRange(b.sana));
      const currentTekshiruvlar = tekshiruvlar.filter((t: any) => !startDate && !endDate ? true : isDateInRange(t.sana));
      const currentTayyorKozoynaklar = tayyorKozoynaklar.filter((k: any) => !startDate && !endDate ? true : isDateInRange(k.sana));
      const currentLinzaSotuvlari = linzaSotuvlari.filter((l: any) => !startDate && !endDate ? true : isDateInRange(l.sana));

      // Calculate previous period data if comparison is enabled
      let previousBuyurtmalar: any[] = [];
      let previousTekshiruvlar: any[] = [];
      let previousTayyorKozoynaklar: any[] = [];
      let previousLinzaSotuvlari: any[] = [];

      if (showComparison && (startDate || endDate)) {
        const { prevStart, prevEnd } = getPreviousPeriod(startDate, endDate);
        previousBuyurtmalar = buyurtmalar.filter((b: any) => isDateInPreviousRange(b.sana, prevStart, prevEnd));
        previousTekshiruvlar = tekshiruvlar.filter((t: any) => isDateInPreviousRange(t.sana, prevStart, prevEnd));
        previousTayyorKozoynaklar = tayyorKozoynaklar.filter((k: any) => isDateInPreviousRange(k.sana, prevStart, prevEnd));
        previousLinzaSotuvlari = linzaSotuvlari.filter((l: any) => isDateInPreviousRange(l.sana, prevStart, prevEnd));
      }

      // Calculate section totals with comparison
      const sections: SectionData[] = [
        {
          name: t("nav.orders"),
          total: currentBuyurtmalar.reduce((sum, b) => sum + (b.jami_summa || 0), 0),
          count: currentBuyurtmalar.length,
          color: "hsl(var(--chart-1))",
          previousTotal: showComparison ? previousBuyurtmalar.reduce((sum, b) => sum + (b.jami_summa || 0), 0) : undefined,
        },
        {
          name: t("nav.examination"),
          total: currentTekshiruvlar.reduce((sum, t) => sum + (t.jami_summa || 0), 0),
          count: currentTekshiruvlar.length,
          color: "hsl(var(--chart-2))",
          previousTotal: showComparison ? previousTekshiruvlar.reduce((sum, t) => sum + (t.jami_summa || 0), 0) : undefined,
        },
        {
          name: t("nav.readyGlasses"),
          total: currentTayyorKozoynaklar.reduce((sum, k) => sum + (k.summa || 0), 0),
          count: currentTayyorKozoynaklar.length,
          color: "hsl(var(--chart-3))",
          previousTotal: showComparison ? previousTayyorKozoynaklar.reduce((sum, k) => sum + (k.summa || 0), 0) : undefined,
        },
        {
          name: t("nav.lensSales"),
          total: currentLinzaSotuvlari.reduce((sum, l) => sum + (l.summa || 0), 0),
          count: currentLinzaSotuvlari.length,
          color: "hsl(var(--chart-4))",
          previousTotal: showComparison ? previousLinzaSotuvlari.reduce((sum, l) => sum + (l.summa || 0), 0) : undefined,
        },
      ];

      // Calculate change percentages
      sections.forEach(section => {
        if (section.previousTotal !== undefined && section.previousTotal > 0) {
          section.change = ((section.total - section.previousTotal) / section.previousTotal) * 100;
        }
      });

      setSectionData(sections);

      // Combine all data for time-based report with filter
      let allData = [];
      
      if (selectedType === "all" || selectedType === "buyurtmalar") {
        allData.push(...currentBuyurtmalar.map((b: any) => ({
          sana: b.sana,
          summa: b.jami_summa,
          tur: "Buyurtmalar"
        })));
      }
      
      if (selectedType === "all" || selectedType === "tekshiruvlar") {
        allData.push(...currentTekshiruvlar.map((t: any) => ({
          sana: t.sana,
          summa: t.jami_summa,
          tur: "Tekshiruv"
        })));
      }
      
      if (selectedType === "all" || selectedType === "tayyor_kozoynaklar") {
        allData.push(...currentTayyorKozoynaklar.map((k: any) => ({
          sana: k.sana,
          summa: k.summa,
          tur: "Tayyor ko'zoynaklar"
        })));
      }
      
      if (selectedType === "all" || selectedType === "linza_sotuvlari") {
        allData.push(...currentLinzaSotuvlari.map((l: any) => ({
          sana: l.sana,
          summa: l.summa,
          tur: "Linza sotuvi"
        })));
      }

      const groupedData = groupByPeriod(allData);

      // Add previous period data if comparison is enabled with filter
      if (showComparison && (startDate || endDate)) {
        let previousData = [];
        
        if (selectedType === "all" || selectedType === "buyurtmalar") {
          previousData.push(...previousBuyurtmalar.map((b: any) => ({
            sana: b.sana,
            summa: b.jami_summa,
            tur: "Buyurtmalar"
          })));
        }
        
        if (selectedType === "all" || selectedType === "tekshiruvlar") {
          previousData.push(...previousTekshiruvlar.map((t: any) => ({
            sana: t.sana,
            summa: t.jami_summa,
            tur: "Tekshiruv"
          })));
        }
        
        if (selectedType === "all" || selectedType === "tayyor_kozoynaklar") {
          previousData.push(...previousTayyorKozoynaklar.map((k: any) => ({
            sana: k.sana,
            summa: k.summa,
            tur: "Tayyor ko'zoynaklar"
          })));
        }
        
        if (selectedType === "all" || selectedType === "linza_sotuvlari") {
          previousData.push(...previousLinzaSotuvlari.map((l: any) => ({
            sana: l.sana,
            summa: l.summa,
            tur: "Linza sotuvi"
          })));
        }

        const groupedPreviousData = groupByPeriod(previousData);
        
        // Merge current and previous data
        groupedData.forEach(current => {
          const previous = groupedPreviousData.find(p => p.name === current.name);
          current.oldatgiTushum = previous ? previous.tushum : 0;
        });
      }

      setReportData(groupedData);
    } catch (error: any) {
      toast.error(t("toast.loadError"));
    } finally {
      setLoading(false);
    }
  };

  // Sanani DD-MM-YYYY formatiga normallash
  const normalizeDateString = (dateString: string): string => {
    if (!dateString) return "";
    
    // Agar ISO formatda (yyyy-MM-dd) bo'lsa, DD-MM-YYYY ga o'zgartirish
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const [year, month, day] = dateString.split("-");
      return `${day}-${month}-${year}`;
    }
    
    // Agar DD.MM.YYYY formatda bo'lsa, DD-MM-YYYY ga o'zgartirish
    if (/^\d{2}\.\d{2}\.\d{4}$/.test(dateString)) {
      return dateString.replace(/\./g, '-');
    }
    
    return dateString;
  };

  const groupByPeriod = (data: any[]): ReportData[] => {
    const grouped: { [key: string]: number } = {};
    data.forEach(item => {
      // Sanani normallash
      const normalizedDate = normalizeDateString(item.sana);
      let key = normalizedDate;
      
      if (period === "weekly") {
        const dateParts = normalizedDate.split("-");
        if (dateParts.length === 3) {
          const weekNum = Math.ceil(parseInt(dateParts[0]) / 7);
          key = `${dateParts[1]}-oy, ${weekNum}-hafta`;
        }
      } else if (period === "monthly") {
        const dateParts = normalizedDate.split("-");
        if (dateParts.length === 3) {
          key = `${dateParts[1]}-${dateParts[2]}`; // OY-YIL
        }
      }
      grouped[key] = (grouped[key] || 0) + item.summa;
    });
    
    return Object.entries(grouped).map(([name, tushum]) => ({
      name,
      tushum,
      oldatgiTushum: undefined
    })).sort((a, b) => {
      // Sanalarni to'g'ri tartiblash (DD-MM-YYYY formatida)
      const parseForSort = (dateStr: string) => {
        const parts = dateStr.split("-");
        if (parts.length === 3 && parts[2].length === 4) {
          // DD-MM-YYYY -> YYYY-MM-DD formatga o'zgartirish tartiblash uchun
          return `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
        return dateStr;
      };
      return parseForSort(a.name).localeCompare(parseForSort(b.name));
    });
  };

  const getPreviousPeriod = (start: Date | undefined, end: Date | undefined) => {
    if (!start || !end) {
      const today = new Date();
      const daysAgo = period === "daily" ? 1 : period === "weekly" ? 7 : 30;
      return {
        prevStart: new Date(today.getTime() - daysAgo * 2 * 24 * 60 * 60 * 1000),
        prevEnd: new Date(today.getTime() - daysAgo * 24 * 60 * 60 * 1000)
      };
    }

    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
    const prevEnd = new Date(start.getTime() - 24 * 60 * 60 * 1000);
    const prevStart = new Date(prevEnd.getTime() - daysDiff * 24 * 60 * 60 * 1000);

    return { prevStart, prevEnd };
  };

  const isDateInPreviousRange = (dateString: string, prevStart: Date, prevEnd: Date) => {
    const itemDate = parseDate(dateString);
    const itemDateOnly = new Date(itemDate.getFullYear(), itemDate.getMonth(), itemDate.getDate());
    const prevStartOnly = new Date(prevStart.getFullYear(), prevStart.getMonth(), prevStart.getDate());
    const prevEndOnly = new Date(prevEnd.getFullYear(), prevEnd.getMonth(), prevEnd.getDate());
    return itemDateOnly >= prevStartOnly && itemDateOnly <= prevEndOnly;
  };

  const totalTushum = reportData.reduce((sum, item) => sum + item.tushum, 0);
  const previousTotalTushum = showComparison ? reportData.reduce((sum, item) => sum + (item.oldatgiTushum || 0), 0) : 0;
  const totalChange = previousTotalTushum > 0 ? ((totalTushum - previousTotalTushum) / previousTotalTushum) * 100 : 0;
  
  const exportToExcel = async (type: "period" | "section" | "detailed") => {
    if (!user) return;

    try {
      const dateTime = formatUzbekistanDateTime();
      
      const [buyurtmalarRes, tekshiruvlarRes, tayyorKozoynakRes, linzaSotuvRes] = await Promise.all([
        supabase.from("buyurtmalar").select("*").eq("user_id", user.id),
        supabase.from("tekshiruvlar").select("*").eq("user_id", user.id),
        supabase.from("tayyor_kozoynaklar").select("*").eq("user_id", user.id),
        supabase.from("linza_sotuvlari").select("*").eq("user_id", user.id),
      ]);

      const buyurtmalar = buyurtmalarRes.data || [];
      const tekshiruvlar = tekshiruvlarRes.data || [];
      const tayyorKozoynaklar = tayyorKozoynakRes.data || [];
      const linzaSotuvlari = linzaSotuvRes.data || [];

      // Metadata
      const metadata = [
        { [t("export.info")]: t("export.exportedBy"), [t("export.value")]: user?.email || t("export.unknown") },
        { [t("export.info")]: t("export.dateTime"), [t("export.value")]: dateTime },
      ];

      let data: any[] = [];
      let sheetName = "";

      if (type === "period") {
        data = reportData.map(item => ({
          [t("common.date")]: item.name,
          [t("reports.income")]: item.tushum
        }));
        sheetName = `${t("reports.title")} - ${period === "daily" ? t("reports.daily") : period === "weekly" ? t("reports.weekly") : t("reports.monthly")}`;
        metadata.push({ "Ma'lumot": "Jami tushum", "Qiymat": `${totalTushum.toLocaleString()} so'm` });
      } else if (type === "section") {
        const sections = [
          { name: t("nav.orders"), data: buyurtmalar, key: "jami_summa" },
          { name: t("nav.examination"), data: tekshiruvlar, key: "jami_summa" },
          { name: t("nav.readyGlasses"), data: tayyorKozoynaklar, key: "summa" },
          { name: t("nav.lensSales"), data: linzaSotuvlari, key: "summa" }
        ];
        data = sections.map(section => ({
          [t("reports.bySection")]: section.name,
          [t("reports.income")]: section.data.reduce((sum: number, item: any) => sum + (item[section.key] || 0), 0)
        }));
        sheetName = `${t("reports.title")} - ${t("reports.bySection")}`;
        const totalIncome = sectionData.reduce((sum, s) => sum + s.total, 0);
        metadata.push({ "Ma'lumot": "Jami tushum", "Qiymat": `${totalIncome.toLocaleString()} so'm` });
      } else {
        const allData = [
          ...buyurtmalar.map((b: any) => ({
            [t("reports.bySection")]: t("nav.orders"),
            [t("common.date")]: formatDisplayDate(b.sana),
            [t("orders.client")]: b.mijoz,
            [t("reports.income")]: b.jami_summa
          })),
          ...tekshiruvlar.map((tek: any) => ({
            [t("reports.bySection")]: t("nav.examination"),
            [t("common.date")]: formatDisplayDate(tek.sana),
            [t("exam.patient")]: tek.mijoz,
            [t("reports.income")]: tek.jami_summa
          })),
          ...tayyorKozoynaklar.map((k: any) => ({
            [t("reports.bySection")]: t("nav.readyGlasses"),
            [t("common.date")]: formatDisplayDate(k.sana),
            [t("orders.client")]: k.kliyent,
            [t("reports.income")]: k.summa
          })),
          ...linzaSotuvlari.map((l: any) => ({
            [t("reports.bySection")]: t("nav.lensSales"),
            [t("common.date")]: formatDisplayDate(l.sana),
            [t("orders.client")]: l.kliyent,
            [t("reports.income")]: l.summa
          }))
        ];
        data = allData.filter(item => {
          if (!startDate && !endDate) return true;
          return isDateInRange(item[t("common.date")]);
        });
        sheetName = `${t("reports.title")} - ${t("common.total")}`;
        const totalIncome = data.reduce((sum, item) => sum + item[t("reports.income")], 0);
        metadata.push({ "Ma'lumot": "Jami tushum", "Qiymat": `${totalIncome.toLocaleString()} so'm` });
      }

      const metaWs = XLSX.utils.json_to_sheet(metadata);
      const dataWs = XLSX.utils.json_to_sheet(data);
      
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, dataWs, "Ma'lumotlar");
      XLSX.utils.book_append_sheet(wb, metaWs, "Metadata");
      
      XLSX.writeFile(wb, `${sheetName}.xlsx`);
      toast.success(t("toast.excelSuccess"));
    } catch (error: any) {
      toast.error(t("toast.exportError"));
    }
  };

  const exportToPDF = async (type: "period" | "section" | "detailed") => {
    if (!user) {
      toast.error(t("toast.loginRequired"));
      return;
    }

    try {
      const [buyurtmalarRes, tekshiruvlarRes, tayyorKozoynakRes, linzaSotuvRes] = await Promise.all([
        supabase.from("buyurtmalar").select("*").eq("user_id", user.id),
        supabase.from("tekshiruvlar").select("*").eq("user_id", user.id),
        supabase.from("tayyor_kozoynaklar").select("*").eq("user_id", user.id),
        supabase.from("linza_sotuvlari").select("*").eq("user_id", user.id),
      ]);

      const buyurtmalar = buyurtmalarRes.data || [];
      const tekshiruvlar = tekshiruvlarRes.data || [];
      const tayyorKozoynaklar = tayyorKozoynakRes.data || [];
      const linzaSotuvlari = linzaSotuvRes.data || [];

      const doc = setupPdfDoc();

      if (type === "period") {
        const periodText = period === "daily" ? t("reports.daily") : period === "weekly" ? t("reports.weekly") : t("reports.monthly");
        const startY = addPdfHeader(
          doc,
          t("reports.title"),
          user?.email,
          `Davr: ${periodText}`
        );
        
        const tableData = reportData.map(item => [item.name, item.tushum.toLocaleString()]);
        autoTable(doc, {
          startY,
          head: [['Sana', 'Tushum']],
          body: tableData,
          foot: [['Jami', totalTushum.toLocaleString()]],
          styles: { 
            font: 'helvetica', 
            fontSize: 9,
            cellPadding: 3,
          },
          headStyles: { 
            fillColor: [66, 66, 66],
            textColor: 255,
            fontStyle: 'bold',
          },
          footStyles: {
            fillColor: [66, 66, 66],
            textColor: 255,
            fontStyle: 'bold',
            fontSize: 10,
          },
          alternateRowStyles: { 
            fillColor: [245, 245, 245] 
          },
          columnStyles: {
            1: { halign: 'right' },
          },
        });
      } else if (type === "section") {
        const startY = addPdfHeader(
          doc,
          t("reports.title"),
          user?.email,
          `Davr: ${t("reports.bySection")}`
        );
        
        const sections = [
          [t("nav.orders"), buyurtmalar.reduce((sum: number, b: any) => sum + b.jami_summa, 0)],
          [t("nav.examination"), tekshiruvlar.reduce((sum: number, tek: any) => sum + tek.jami_summa, 0)],
          [t("nav.readyGlasses"), tayyorKozoynaklar.reduce((sum: number, k: any) => sum + k.summa, 0)],
          [t("nav.lensSales"), linzaSotuvlari.reduce((sum: number, l: any) => sum + l.summa, 0)]
        ];
        const tableData = sections.map(s => [s[0], s[1].toLocaleString()]);
        const total = sections.reduce((sum, s) => sum + (s[1] as number), 0);
        autoTable(doc, {
          startY,
          head: [["Bo'lim", "Tushum"]],
          body: tableData,
          foot: [['Jami', total.toLocaleString()]],
          styles: { 
            font: 'helvetica', 
            fontSize: 10,
            cellPadding: 3,
          },
          headStyles: { 
            fillColor: [66, 66, 66],
            textColor: 255,
            fontStyle: 'bold',
          },
          footStyles: {
            fillColor: [66, 66, 66],
            textColor: 255,
            fontStyle: 'bold',
            fontSize: 11,
          },
          alternateRowStyles: { 
            fillColor: [245, 245, 245] 
          },
          columnStyles: {
            1: { halign: 'right' },
          },
        });
      } else {
        const startY = addPdfHeader(
          doc,
          "Hisobotlar",
          user?.email,
          "Davr: Batafsil"
        );
        
        const allData = [
          ...buyurtmalar.map((b: any) => ["Buyurtmalar", formatDisplayDate(b.sana), b.mijoz, b.jami_summa.toLocaleString()]),
          ...tekshiruvlar.map((tek: any) => ["Tekshiruvlar", formatDisplayDate(tek.sana), tek.mijoz, tek.jami_summa.toLocaleString()]),
          ...tayyorKozoynaklar.map((k: any) => ["Tayyor ko'zoynaklar", formatDisplayDate(k.sana), k.kliyent, k.summa.toLocaleString()]),
          ...linzaSotuvlari.map((l: any) => ["Linza sotuvi", formatDisplayDate(l.sana), l.kliyent, l.summa.toLocaleString()])
        ];
        autoTable(doc, {
          startY,
          head: [["Bo'lim", "Sana", "Mijoz", "Summa"]],
          body: allData,
          styles: { 
            font: 'helvetica', 
            fontSize: 8,
            cellPadding: 2,
          },
          headStyles: { 
            fillColor: [66, 66, 66],
            textColor: 255,
            fontStyle: 'bold',
          },
          alternateRowStyles: { 
            fillColor: [245, 245, 245] 
          },
          columnStyles: {
            3: { halign: 'right' },
          },
        });
      }

      const currentDate = new Date().toLocaleDateString("uz-UZ", { timeZone: "Asia/Tashkent" });
      doc.save(`Hisobotlar_${currentDate}.pdf`);
      toast.success(t("toast.pdfSuccess"));
    } catch (error: any) {
      console.error("PDF eksport xatosi:", error);
      toast.error(t("toast.exportError"));
    }
  };

  const handlePrint = () => {
    const printContent = document.getElementById('printable-report');
    if (!printContent) {
      toast.error(t("toast.printTableNotFound"));
      return;
    }
    
    // Yashirin iframe yaratish
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);
    
    const doc = iframe.contentWindow?.document;
    if (!doc) {
      toast.error(t("toast.printError"));
      document.body.removeChild(iframe);
      return;
    }
    
    const dateRange = startDate && endDate 
      ? `${format(startDate, "dd.MM.yyyy")} - ${format(endDate, "dd.MM.yyyy")}`
      : "Barcha ma'lumotlar";
    
    doc.open();
    doc.write(`
      <html>
        <head>
          <title>Hisobotlar</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { text-align: center; margin-bottom: 10px; font-size: 18px; }
            .print-date { text-align: center; color: #666; margin-bottom: 20px; font-size: 14px; }
            .section { margin-bottom: 30px; page-break-inside: avoid; }
            .section-title { font-size: 16px; font-weight: bold; margin-bottom: 10px; padding: 10px; background: #f0f0f0; border-radius: 5px; }
            .section-stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 15px; }
            .stat-card { padding: 10px; border: 1px solid #ddd; border-radius: 5px; }
            .stat-label { font-size: 12px; color: #666; margin-bottom: 5px; }
            .stat-value { font-size: 16px; font-weight: bold; }
            .total-income { text-align: center; margin-bottom: 20px; padding: 15px; background: #e8f4fd; border-radius: 8px; }
            .total-income .label { font-size: 14px; color: #666; margin-bottom: 5px; }
            .total-income .value { font-size: 24px; font-weight: bold; color: #0066cc; }
            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .section { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <h1>Hisobotlar</h1>
          <p class="print-date">Davr: ${dateRange}</p>
          <p class="print-date">Chop etilgan: ${formatDisplayDate(formatUzbekistanDateTime().split(' ')[0])}</p>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    doc.close();
    
    // Print dialogni ochish
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    
    // Iframeni o'chirish
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 1000);
  };

  const handleExport = (type: "period" | "section" | "detailed") => {
    if (exportFormat === "excel") {
      exportToExcel(type);
    } else {
      exportToPDF(type);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">{t("reports.title")}</h2>
        <p className="text-muted-foreground">{t("reports.subtitle")}</p>
      </div>

      <Card className="p-6">
        <div className="mb-6 space-y-4">
          <h3 className="text-lg font-semibold">{t("reports.dateRange")}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>{t("common.from")}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "dd.MM.yyyy") : <span>{t("reports.selectDate")}</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label>{t("common.to")}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "dd.MM.yyyy") : <span>{t("reports.selectDate")}</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    disabled={(date) => startDate ? date < startDate : false}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex items-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setStartDate(undefined);
                  setEndDate(undefined);
                }}
              >
                {t("reports.reset")}
              </Button>
              <Button
                variant={showComparison ? "default" : "outline"}
                onClick={() => setShowComparison(!showComparison)}
                disabled={!startDate || !endDate}
                title={!startDate || !endDate ? t("reports.compareTooltip") : ""}
              >
                {t("reports.compare")}
              </Button>
            </div>
          </div>
          
          <div className="mt-4">
            <Label>{t("reports.productServiceType")}</Label>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-full md:w-[300px]">
                <SelectValue placeholder="Turni tanlang" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("dateFilter.all")}</SelectItem>
                <SelectItem value="buyurtmalar">{t("nav.orders")}</SelectItem>
                <SelectItem value="tekshiruvlar">{t("nav.examination")}</SelectItem>
                <SelectItem value="tayyor_kozoynaklar">{t("nav.readyGlasses")}</SelectItem>
                <SelectItem value="linza_sotuvlari">{t("nav.lensSales")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

        </div>

        <div id="printable-report">
        <Tabs value={period} onValueChange={(value) => setPeriod(value as any)} className="space-y-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
            {/* Chap tomon - Davr tanlash */}
            <TabsList className="grid grid-cols-3 w-full md:w-auto">
              <TabsTrigger value="daily">{t("reports.daily")}</TabsTrigger>
              <TabsTrigger value="weekly">{t("reports.weekly")}</TabsTrigger>
              <TabsTrigger value="monthly">{t("reports.monthly")}</TabsTrigger>
            </TabsList>

            {/* O'ng tomon - Format va eksport tugmalari */}
            <div className="flex flex-wrap items-center gap-2">
              <Select value={exportFormat} onValueChange={(value: "excel" | "pdf") => setExportFormat(value)}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="excel">Excel</SelectItem>
                  <SelectItem value="pdf">PDF</SelectItem>
                </SelectContent>
              </Select>
              
              <Button variant="outline" size="sm" onClick={() => handleExport("period")}>
                <FileDown className="h-4 w-4 mr-2" />
                {t("reports.exportByPeriod")}
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleExport("section")}>
                <FileDown className="h-4 w-4 mr-2" />
                {t("reports.exportBySection")}
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleExport("detailed")}>
                <FileDown className="h-4 w-4 mr-2" />
                {t("reports.exportDetailed")}
              </Button>
              
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
            </div>
          </div>

          <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-muted-foreground mb-1">{t("reports.totalIncome")}</p>
                <p className="text-3xl font-bold text-primary">{totalTushum.toLocaleString()} {t("common.sum")}</p>
              </div>
              {showComparison && previousTotalTushum > 0 && (
                <div className="text-right">
                  <p className="text-sm text-muted-foreground mb-1">{t("reports.change")}</p>
                  <p className={cn(
                    "text-2xl font-bold",
                    totalChange > 0 ? "text-green-600" : totalChange < 0 ? "text-red-600" : "text-muted-foreground"
                  )}>
                    {totalChange > 0 ? "+" : ""}{totalChange.toFixed(1)}%
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("reports.previous")} {previousTotalTushum.toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          </div>

          <TabsContent value="daily" className="space-y-4">
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={reportData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip content={<CustomTooltip total={totalTushum} showComparison={showComparison} />} />
                  <Legend />
                  <Bar dataKey="tushum" fill="hsl(var(--primary))" name={showComparison ? t("reports.currentPeriod") : t("reports.income")} />
                  {showComparison && (
                    <Bar dataKey="oldatgiTushum" fill="hsl(var(--chart-2))" name={t("reports.previousPeriod")} />
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="weekly" className="space-y-4">
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={reportData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip content={<CustomTooltip total={totalTushum} showComparison={showComparison} />} />
                  <Legend />
                  <Bar dataKey="tushum" fill="hsl(var(--primary))" name={showComparison ? t("reports.currentPeriod") : t("reports.income")} />
                  {showComparison && (
                    <Bar dataKey="oldatgiTushum" fill="hsl(var(--chart-2))" name={t("reports.previousPeriod")} />
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="monthly" className="space-y-4">
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={reportData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip content={<CustomTooltip total={totalTushum} showComparison={showComparison} />} />
                  <Legend />
                  <Bar dataKey="tushum" fill="hsl(var(--primary))" name={showComparison ? t("reports.currentPeriod") : t("reports.income")} />
                  {showComparison && (
                    <Bar dataKey="oldatgiTushum" fill="hsl(var(--chart-2))" name={t("reports.previousPeriod")} />
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
        </Tabs>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">{t("reports.bySection")}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {sectionData.map((section) => (
            <div key={section.name} className="bg-secondary rounded-lg p-4">
              <p className="text-sm text-muted-foreground mb-1">{section.name}</p>
              <p className="text-xl font-bold text-foreground">{section.total.toLocaleString()} {t("common.sum")}</p>
              <p className="text-xs text-muted-foreground mt-1">{section.count} {t("reports.records")}</p>
              {showComparison && section.previousTotal !== undefined && (
                <div className="mt-2 pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground">{t("reports.previous")} {section.previousTotal.toLocaleString()}</p>
                  {section.change !== undefined && section.previousTotal > 0 && (
                    <p className={cn(
                      "text-sm font-semibold",
                      section.change > 0 ? "text-green-600" : section.change < 0 ? "text-red-600" : "text-muted-foreground"
                    )}>
                      {section.change > 0 ? "+" : ""}{section.change.toFixed(1)}%
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={sectionData.filter(s => s.total > 0)}
                dataKey="total"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={(entry) => `${entry.name}: ${entry.total.toLocaleString()}`}
              >
                {sectionData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => `${value.toLocaleString()} ${t("common.sum")}`} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
};

export default Hisobotlar;
