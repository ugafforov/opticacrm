import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion } from "framer-motion";
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
import { safeSum, safeAdd, safeParsePriceToNumber } from "@/lib/safeCalculations";
import { withRetry } from "@/lib/retryUtils";

interface ReportData {
  name: string;
  tushum: number;
  oldatgiTushum?: number;
  isToday?: boolean;
  daysAgo?: number;
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
  const { t, script } = useLanguage();
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

  // Zamonaviy tooltip
  const CustomTooltip = ({ active, payload, label, total, showComparison }: CustomTooltipProps) => {
    if (active && payload && payload.length) {
      const currentIncome = payload[0].value;
      const percentage = total ? ((currentIncome / total) * 100).toFixed(1) : "0";
      const previousIncome = payload[1]?.value;
      const change = previousIncome ? ((currentIncome - previousIncome) / previousIncome * 100).toFixed(1) : null;

      return (
        <div className="bg-card/95 backdrop-blur-sm border border-border rounded-xl shadow-xl p-4 min-w-[180px]">
          <p className="font-semibold text-foreground mb-3 text-sm border-b border-border pb-2">{label}</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ background: "linear-gradient(135deg, #3b82f6, #60a5fa)" }} />
                <span className="text-xs text-muted-foreground">{showComparison ? t("reports.currentPeriod") : t("reports.income")}</span>
              </div>
              <span className="text-sm font-bold text-foreground">{currentIncome.toLocaleString()}</span>
            </div>
            {showComparison && previousIncome !== undefined && (
              <>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-sm" style={{ background: "linear-gradient(135deg, #8b5cf6, #a78bfa)" }} />
                    <span className="text-xs text-muted-foreground">{t("reports.previousPeriod")}</span>
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">{previousIncome.toLocaleString()}</span>
                </div>
                {change && (
                  <div className="pt-2 border-t border-border mt-2">
                    <div className={cn(
                      "flex items-center justify-center gap-1 text-xs font-semibold py-1 px-2 rounded-full",
                      parseFloat(change) > 0 ? "bg-green-500/10 text-green-600" : parseFloat(change) < 0 ? "bg-red-500/10 text-red-600" : "bg-muted text-muted-foreground"
                    )}>
                      {parseFloat(change) > 0 ? "↑" : parseFloat(change) < 0 ? "↓" : "→"} {Math.abs(parseFloat(change))}%
                    </div>
                  </div>
                )}
              </>
            )}
            <div className="text-xs text-muted-foreground text-center pt-1">
              Jami: {percentage}%
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Y-axis formatter - raqamlarni qisqartirish
  const formatYAxis = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K`;
    }
    return value.toString();
  };

  // Boshlang'ich sanalarni o'rnatish
  useEffect(() => {
    const today = new Date();
    setStartDate(today);
    setEndDate(today);
  }, []);

  useEffect(() => {
    if (user) {
      loadReportData();
    }
  }, [user, period, startDate, endDate, showComparison, selectedType]);

  // Haftaning dushanba kunini olish
  const getMonday = (date: Date): Date => {
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(date.getFullYear(), date.getMonth(), diff);
  };

  // Haftaning yakshanba kunini olish
  const getSunday = (date: Date): Date => {
    const monday = getMonday(date);
    return new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
  };

  // Oy boshini olish
  const getFirstDayOfMonth = (date: Date): Date => {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  };

  // Oy oxirini olish
  const getLastDayOfMonth = (date: Date): Date => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
  };

  // Period o'zgarganda sanalarni avtomatik o'rnatish
  const handlePeriodChange = (newPeriod: "daily" | "weekly" | "monthly") => {
    setPeriod(newPeriod);
    const today = new Date();
    
    if (newPeriod === "daily") {
      // Bugun - faqat bugungi kun
      setStartDate(today);
      setEndDate(today);
    } else if (newPeriod === "weekly") {
      // Bu hafta - dushanbadan yakshanbagacha
      setStartDate(getMonday(today));
      setEndDate(getSunday(today));
    } else if (newPeriod === "monthly") {
      // Bu oy - oy boshidan oxirigacha
      setStartDate(getFirstDayOfMonth(today));
      setEndDate(getLastDayOfMonth(today));
    }
  };

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
    const grouped: { [key: string]: { tushum: number; dateObj?: Date } } = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    data.forEach(item => {
      // Sanani normallash
      const normalizedDate = normalizeDateString(item.sana);
      let key = normalizedDate;
      let dateObj: Date | undefined;
      
      // Parse date for daily period
      if (period === "daily") {
        const dateParts = normalizedDate.split("-");
        if (dateParts.length === 3) {
          const day = parseInt(dateParts[0], 10);
          const month = parseInt(dateParts[1], 10) - 1;
          const year = parseInt(dateParts[2], 10);
          dateObj = new Date(year, month, day);
        }
      } else if (period === "weekly") {
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
      
      if (!grouped[key]) {
        grouped[key] = { tushum: 0, dateObj };
      }
      grouped[key].tushum += item.summa;
      if (dateObj && !grouped[key].dateObj) {
        grouped[key].dateObj = dateObj;
      }
    });
    
    return Object.entries(grouped).map(([name, data]) => {
      let daysAgo = 0;
      let isToday = false;
      
      if (period === "daily" && data.dateObj) {
        const itemDate = new Date(data.dateObj);
        itemDate.setHours(0, 0, 0, 0);
        const diffTime = today.getTime() - itemDate.getTime();
        daysAgo = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        isToday = daysAgo === 0;
      }
      
      return {
        name,
        tushum: data.tushum,
        oldatgiTushum: undefined,
        isToday,
        daysAgo
      };
    }).sort((a, b) => {
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

      const doc = await setupPdfDoc('portrait', script);

      if (type === "period") {
        const periodText = period === "daily" ? t("reports.daily") : period === "weekly" ? t("reports.weekly") : t("reports.monthly");
        const startY = addPdfHeader(
          doc,
          t("reports.title"),
          user?.email,
          `Davr: ${periodText}`,
          t("common.exportedBy"),
          t("common.dateAndTime")
        );
        
        const tableData = reportData.map(item => [item.name, `${item.tushum.toLocaleString()} ${t("common.currency")}`]);
        autoTable(doc, {
          startY,
          head: [['Sana', 'Tushum']],
          body: tableData,
          foot: [[' Jami', `${totalTushum.toLocaleString()} ${t("common.currency")}`]],
          styles: { 
            font: script === 'cyrillic' ? 'Roboto' : 'helvetica',
            fontSize: 10,
            cellPadding: 1.5,
            lineWidth: 0.5,
            lineColor: [200, 200, 200],
          },
          headStyles: { 
            fillColor: [231, 76, 60],
            textColor: 255,
            font: script === 'cyrillic' ? 'Roboto' : 'helvetica',
            fontStyle: 'normal',
            lineWidth: 0.5,
          },
          footStyles: {
            fillColor: [192, 57, 43],
            textColor: 255,
            font: script === 'cyrillic' ? 'Roboto' : 'helvetica',
            fontStyle: 'normal',
            fontSize: 11,
            lineWidth: 0.5,
          },
          alternateRowStyles: { 
            fillColor: [245, 245, 245] 
          },
        });
      } else if (type === "section") {
        const startY = addPdfHeader(
          doc,
          t("reports.title"),
          user?.email,
          `Davr: ${t("reports.bySection")}`,
          t("common.exportedBy"),
          t("common.dateAndTime")
        );
        
        const sections = [
          [t("nav.orders"), buyurtmalar.reduce((sum: number, b: any) => sum + b.jami_summa, 0)],
          [t("nav.examination"), tekshiruvlar.reduce((sum: number, tek: any) => sum + tek.jami_summa, 0)],
          [t("nav.readyGlasses"), tayyorKozoynaklar.reduce((sum: number, k: any) => sum + k.summa, 0)],
          [t("nav.lensSales"), linzaSotuvlari.reduce((sum: number, l: any) => sum + l.summa, 0)]
        ];
        const tableData = sections.map(s => [s[0], `${s[1].toLocaleString()} ${t("common.currency")}`]);
        const total = sections.reduce((sum, s) => sum + (s[1] as number), 0);
        autoTable(doc, {
          startY,
          head: [["Bo'lim", "Tushum"]],
          body: tableData,
          foot: [['Jami', `${total.toLocaleString()} ${t("common.currency")}`]],
          styles: { 
            font: script === 'cyrillic' ? 'Roboto' : 'helvetica',
            fontSize: 10,
            cellPadding: 1.5,
            lineWidth: 0.5,
            lineColor: [200, 200, 200],
          },
          headStyles: { 
            fillColor: [142, 68, 173],
            textColor: 255,
            font: script === 'cyrillic' ? 'Roboto' : 'helvetica',
            fontStyle: 'normal',
            lineWidth: 0.5,
          },
          footStyles: {
            fillColor: [123, 36, 163],
            textColor: 255,
            font: script === 'cyrillic' ? 'Roboto' : 'helvetica',
            fontStyle: 'normal',
            fontSize: 11,
            lineWidth: 0.5,
          },
          alternateRowStyles: { 
            fillColor: [245, 245, 245] 
          },
        });
      } else {
        const startY = addPdfHeader(
          doc,
          "Hisobotlar",
          user?.email,
          "Davr: Batafsil",
          t("common.exportedBy"),
          t("common.dateAndTime")
        );
        
        const allData = [
          ...buyurtmalar.map((b: any) => ["Buyurtmalar", formatDisplayDate(b.sana), b.mijoz, `${b.jami_summa.toLocaleString()} ${t("common.currency")}`]),
          ...tekshiruvlar.map((tek: any) => ["Tekshiruvlar", formatDisplayDate(tek.sana), tek.mijoz, `${tek.jami_summa.toLocaleString()} ${t("common.currency")}`]),
          ...tayyorKozoynaklar.map((k: any) => ["Tayyor ko'zoynaklar", formatDisplayDate(k.sana), k.kliyent, `${k.summa.toLocaleString()} ${t("common.currency")}`]),
          ...linzaSotuvlari.map((l: any) => ["Linza sotuvi", formatDisplayDate(l.sana), l.kliyent, `${l.summa.toLocaleString()} ${t("common.currency")}`])
        ];
        autoTable(doc, {
          startY,
          head: [["Bo'lim", "Sana", "Mijoz", "Summa"]],
          body: allData,
          styles: { 
            font: script === 'cyrillic' ? 'Roboto' : 'helvetica',
            fontSize: 10,
            cellPadding: 1.5,
            lineWidth: 0.5,
            lineColor: [200, 200, 200],
          },
          headStyles: { 
            fillColor: [39, 174, 96],
            textColor: 255,
            font: script === 'cyrillic' ? 'Roboto' : 'helvetica',
            fontStyle: 'normal',
            lineWidth: 0.5,
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

      <Card className="p-6 bg-gradient-to-br from-card via-card to-secondary/20 border-border/50">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-primary/10">
              <CalendarIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">{t("reports.dateRange")}</h3>
              <p className="text-xs text-muted-foreground">Hisobot uchun sana oralig'ini tanlang</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Boshlanish sanasi */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("common.from")}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal h-11 bg-background/50 hover:bg-background border-border/50 hover:border-primary/50 transition-colors",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <div className="flex items-center gap-3 w-full">
                      <div className="p-1.5 rounded-md bg-blue-500/10">
                        <CalendarIcon className="h-3.5 w-3.5 text-blue-500" />
                      </div>
                      <span className="flex-1">
                        {startDate ? format(startDate, "dd.MM.yyyy") : t("reports.selectDate")}
                      </span>
                    </div>
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
            
            {/* Tugash sanasi */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("common.to")}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal h-11 bg-background/50 hover:bg-background border-border/50 hover:border-primary/50 transition-colors",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <div className="flex items-center gap-3 w-full">
                      <div className="p-1.5 rounded-md bg-indigo-500/10">
                        <CalendarIcon className="h-3.5 w-3.5 text-indigo-500" />
                      </div>
                      <span className="flex-1">
                        {endDate ? format(endDate, "dd.MM.yyyy") : t("reports.selectDate")}
                      </span>
                    </div>
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
            
            {/* Amallar */}
            <div className="space-y-2 lg:col-span-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Amallar</Label>
              <div className="flex items-center gap-2 h-11">
                <Button 
                  variant="outline" 
                  className="h-full px-4 bg-background/50 hover:bg-background border-border/50 hover:border-red-500/50 hover:text-red-500 transition-colors"
                  onClick={() => {
                    setStartDate(undefined);
                    setEndDate(undefined);
                  }}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {t("reports.reset")}
                </Button>
                <Button
                  className={cn(
                    "h-full px-4 transition-all",
                    showComparison 
                      ? "bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white shadow-md" 
                      : "bg-background/50 hover:bg-background border border-border/50 hover:border-purple-500/50 text-foreground hover:text-purple-500"
                  )}
                  variant={showComparison ? "default" : "outline"}
                  onClick={() => setShowComparison(!showComparison)}
                  disabled={!startDate || !endDate}
                  title={!startDate || !endDate ? t("reports.compareTooltip") : ""}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  {t("reports.compare")}
                  {showComparison && (
                    <span className="ml-2 w-2 h-2 rounded-full bg-white animate-pulse" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div id="printable-report">
        <Tabs value={period} onValueChange={(value) => handlePeriodChange(value as "daily" | "weekly" | "monthly")} className="space-y-4">
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

          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 p-6 shadow-lg">
            {/* Background decorations */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
            <div className="absolute top-1/2 right-1/4 w-16 h-16 bg-white/5 rounded-full" />
            
            <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <p className="text-sm text-blue-100 mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {t("reports.totalIncome")}
                </p>
                <p className="text-4xl md:text-5xl font-bold text-white tracking-tight">
                  {totalTushum.toLocaleString()}
                  <span className="text-lg md:text-xl font-medium text-blue-200 ml-2">{t("common.currency")}</span>
                </p>
              </div>
              
              {showComparison && previousTotalTushum > 0 && (
                <div className="flex flex-col items-end gap-2">
                  <div className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold",
                    totalChange > 0 
                      ? "bg-green-500/20 text-green-100" 
                      : totalChange < 0 
                        ? "bg-red-500/20 text-red-100" 
                        : "bg-white/10 text-white"
                  )}>
                    {totalChange > 0 ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    ) : totalChange < 0 ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6" />
                      </svg>
                    ) : null}
                    {totalChange > 0 ? "+" : ""}{totalChange.toFixed(1)}%
                  </div>
                  <p className="text-xs text-blue-200">
                    {t("reports.previous")}: {previousTotalTushum.toLocaleString()} {t("common.currency")}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Diagrammalar - bir qatorda 50/50 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Ustun diagramma - 50% */}
            <div className="bg-gradient-to-br from-card to-card/80 rounded-xl border border-border p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-base font-semibold text-foreground">{t("reports.income")}</h4>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="w-3 h-3 rounded" style={{ background: "linear-gradient(135deg, #3b82f6, #60a5fa)" }} />
                  <span>{t("reports.income")}</span>
                </div>
              </div>
              
              {/* Gradient definitions for bars with opacity levels */}
              <svg width="0" height="0">
                <defs>
                  {/* Today - full brightness */}
                  <linearGradient id="barGradientToday" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#60a5fa" />
                  </linearGradient>
                  {/* 1 day ago - 80% */}
                  <linearGradient id="barGradient1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.75" />
                    <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.75" />
                  </linearGradient>
                  {/* 2 days ago - 60% */}
                  <linearGradient id="barGradient2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.55" />
                    <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.55" />
                  </linearGradient>
                  {/* 3 days ago - 45% */}
                  <linearGradient id="barGradient3" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.4" />
                  </linearGradient>
                  {/* 4 days ago - 35% */}
                  <linearGradient id="barGradient4" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.3" />
                  </linearGradient>
                  {/* 5 days ago - 25% */}
                  <linearGradient id="barGradient5" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.22" />
                  </linearGradient>
                  {/* 6+ days ago - 18% */}
                  <linearGradient id="barGradient6" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.15" />
                    <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.15" />
                  </linearGradient>
                  {/* Default gradient */}
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#60a5fa" />
                  </linearGradient>
                  <linearGradient id="barGradientPrev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" />
                    <stop offset="100%" stopColor="#a78bfa" />
                  </linearGradient>
                </defs>
              </svg>

              <TabsContent value="daily" className="mt-0">
                <div className="h-[320px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={reportData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis 
                        dataKey="name" 
                        tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} 
                        axisLine={{ stroke: "hsl(var(--border))" }}
                        tickLine={false}
                      />
                      <YAxis 
                        tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} 
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={formatYAxis}
                      />
                      <Tooltip content={<CustomTooltip total={totalTushum} showComparison={showComparison} />} cursor={{ fill: "hsl(var(--muted)/0.1)" }} />
                      <Bar 
                        dataKey="tushum" 
                        name={showComparison ? t("reports.currentPeriod") : t("reports.income")} 
                        radius={[6, 6, 0, 0]}
                        maxBarSize={60}
                        shape={(props: any) => {
                          const { x, y, width, height, payload } = props;
                          const daysAgo = payload?.daysAgo ?? 0;
                          const isToday = payload?.isToday;
                          let gradientId = "barGradient";
                          if (isToday) {
                            gradientId = "barGradientToday";
                          } else if (daysAgo >= 1 && daysAgo <= 6) {
                            gradientId = `barGradient${daysAgo}`;
                          } else if (daysAgo > 6) {
                            gradientId = "barGradient6";
                          }
                          return (
                            <rect
                              x={x}
                              y={y}
                              width={width}
                              height={height}
                              fill={`url(#${gradientId})`}
                              rx={6}
                              ry={6}
                              style={{
                                filter: isToday ? "drop-shadow(0 4px 8px rgba(59, 130, 246, 0.4))" : undefined,
                                transition: "all 0.3s ease"
                              }}
                            />
                          );
                        }}
                      />
                      {showComparison && (
                        <Bar 
                          dataKey="oldatgiTushum" 
                          fill="url(#barGradientPrev)" 
                          name={t("reports.previousPeriod")} 
                          radius={[6, 6, 0, 0]}
                          maxBarSize={60}
                        />
                      )}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </TabsContent>

              <TabsContent value="weekly" className="mt-0">
                <div className="h-[320px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={reportData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis 
                        dataKey="name" 
                        tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} 
                        axisLine={{ stroke: "hsl(var(--border))" }}
                        tickLine={false}
                      />
                      <YAxis 
                        tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} 
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={formatYAxis}
                      />
                      <Tooltip content={<CustomTooltip total={totalTushum} showComparison={showComparison} />} cursor={{ fill: "hsl(var(--muted)/0.1)" }} />
                      <Bar 
                        dataKey="tushum" 
                        fill="url(#barGradient)" 
                        name={showComparison ? t("reports.currentPeriod") : t("reports.income")} 
                        radius={[6, 6, 0, 0]}
                        maxBarSize={60}
                      />
                      {showComparison && (
                        <Bar 
                          dataKey="oldatgiTushum" 
                          fill="url(#barGradientPrev)" 
                          name={t("reports.previousPeriod")} 
                          radius={[6, 6, 0, 0]}
                          maxBarSize={60}
                        />
                      )}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </TabsContent>

              <TabsContent value="monthly" className="mt-0">
                <div className="h-[320px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={reportData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis 
                        dataKey="name" 
                        tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} 
                        axisLine={{ stroke: "hsl(var(--border))" }}
                        tickLine={false}
                      />
                      <YAxis 
                        tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} 
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={formatYAxis}
                      />
                      <Tooltip content={<CustomTooltip total={totalTushum} showComparison={showComparison} />} cursor={{ fill: "hsl(var(--muted)/0.1)" }} />
                      <Bar 
                        dataKey="tushum" 
                        fill="url(#barGradient)" 
                        name={showComparison ? t("reports.currentPeriod") : t("reports.income")} 
                        radius={[6, 6, 0, 0]}
                        maxBarSize={60}
                      />
                      {showComparison && (
                        <Bar 
                          dataKey="oldatgiTushum" 
                          fill="url(#barGradientPrev)" 
                          name={t("reports.previousPeriod")} 
                          radius={[6, 6, 0, 0]}
                          maxBarSize={60}
                        />
                      )}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </TabsContent>
            </div>

            {/* Dumalaq diagramma - 50% */}
            <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
              <h4 className="text-base font-semibold text-foreground mb-4">{t("reports.bySection")}</h4>
              
              {/* Progress bar statistika */}
              <div className="space-y-4">
                {sectionData.map((section, index) => {
                  const maxTotal = Math.max(...sectionData.map(s => s.total));
                  const percentage = maxTotal > 0 ? (section.total / maxTotal) * 100 : 0;
                  const totalPercentage = totalTushum > 0 ? (section.total / totalTushum) * 100 : 0;
                  
                  // Gradient ranglar har bir bo'lim uchun
                  const gradients: Record<string, string> = {
                    "Buyurtmalar": "linear-gradient(90deg, #3b82f6 0%, #60a5fa 50%, #93c5fd 100%)",
                    "Буюртмалар": "linear-gradient(90deg, #3b82f6 0%, #60a5fa 50%, #93c5fd 100%)",
                    "Tekshiruv": "linear-gradient(90deg, #8b5cf6 0%, #a78bfa 50%, #c4b5fd 100%)",
                    "Текширув": "linear-gradient(90deg, #8b5cf6 0%, #a78bfa 50%, #c4b5fd 100%)",
                    "Tayyor ko'zoynaklar": "linear-gradient(90deg, #f59e0b 0%, #fbbf24 50%, #fcd34d 100%)",
                    "Тайёр кўзойнаклар": "linear-gradient(90deg, #f59e0b 0%, #fbbf24 50%, #fcd34d 100%)",
                    "Linza sotuvi": "linear-gradient(90deg, #10b981 0%, #34d399 50%, #6ee7b7 100%)",
                    "Линза сотуви": "linear-gradient(90deg, #10b981 0%, #34d399 50%, #6ee7b7 100%)",
                  };
                  
                  const gradient = gradients[section.name] || `linear-gradient(90deg, ${section.color} 0%, ${section.color}aa 100%)`;
                  
                  return (
                    <motion.div 
                      key={section.name} 
                      className="space-y-2"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: index * 0.1 }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <motion.div 
                            className="w-3 h-3 rounded-full shrink-0" 
                            style={{ background: gradient }}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ duration: 0.3, delay: index * 0.1 + 0.2 }}
                          />
                          <span className="text-sm font-medium text-foreground">{section.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground">{section.count} ta</span>
                          <motion.span 
                            className="text-sm font-bold text-foreground min-w-[100px] text-right"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.5, delay: index * 0.1 + 0.3 }}
                          >
                            {section.total.toLocaleString()} so'm
                          </motion.span>
                          <span className="text-xs font-medium text-muted-foreground min-w-[45px] text-right">
                            {totalPercentage.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      <div className="relative h-3 bg-secondary rounded-full overflow-hidden shadow-inner">
                        <motion.div 
                          className="absolute inset-y-0 left-0 rounded-full shadow-sm"
                          style={{ background: gradient }}
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          transition={{ 
                            duration: 0.8, 
                            delay: index * 0.15,
                            ease: [0.25, 0.46, 0.45, 0.94]
                          }}
                        />
                        {/* Shimmer effekt */}
                        <motion.div 
                          className="absolute inset-y-0 left-0 rounded-full opacity-30"
                          style={{ 
                            background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)",
                            width: `${percentage}%`
                          }}
                          initial={{ x: "-100%" }}
                          animate={{ x: "100%" }}
                          transition={{ 
                            duration: 1.5, 
                            delay: index * 0.15 + 0.8,
                            ease: "easeInOut"
                          }}
                        />
                      </div>
                      {showComparison && section.change !== undefined && section.previousTotal !== undefined && section.previousTotal > 0 && (
                        <motion.div 
                          className="flex items-center gap-2 pl-5"
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.1 + 0.5 }}
                        >
                          <span className="text-xs text-muted-foreground">
                            Oldingi: {section.previousTotal.toLocaleString()} so'm
                          </span>
                          <span className={cn(
                            "text-xs font-semibold",
                            section.change > 0 ? "text-green-600" : section.change < 0 ? "text-red-600" : "text-muted-foreground"
                          )}>
                            {section.change > 0 ? "↑" : section.change < 0 ? "↓" : ""} {Math.abs(section.change).toFixed(1)}%
                          </span>
                        </motion.div>
                      )}
                    </motion.div>
                  );
                })}
              </div>

              {/* Jami */}
              <div className="mt-6 pt-4 border-t border-border">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">Jami tushum</span>
                  <span className="text-lg font-bold text-primary">{totalTushum.toLocaleString()} so'm</span>
                </div>
              </div>
            </div>
          </div>
        </Tabs>
        </div>
      </Card>
    </div>
  );
};

export default Hisobotlar;
