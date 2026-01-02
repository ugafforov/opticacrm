import { useState, useEffect, useCallback, useRef } from "react";
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
  xarajat: number;
  foyda: number;
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
  const { t, script } = useLanguage();
  const { user } = useAuth();
  const [reportData, setReportData] = useState<ReportData[]>([]);
  const [sectionData, setSectionData] = useState<SectionData[]>([]);
  const [expenseCategoryData, setExpenseCategoryData] = useState<SectionData[]>([]);
  const [totalXarajat, setTotalXarajat] = useState(0);
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly">("daily");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [showComparison, setShowComparison] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string>("all");
  const [exportFormat, setExportFormat] = useState<"excel" | "pdf">("excel");
  const [activeTab, setActiveTab] = useState<"income" | "expense" | "compare">("income");

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
                <span className="font-medium">{currentIncome.toLocaleString()}</span> {t("common.sum")}
                <span className="text-muted-foreground ml-1">({percentage}%)</span>
              </p>
            </div>
            {showComparison && previousIncome !== undefined && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: payload[1].color }} />
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium">{previousIncome.toLocaleString()}</span> {t("common.sum")}
                </p>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
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

      // Load all data from Supabase including expenses
      const [buyurtmalarRes, tekshiruvlarRes, tayyorKozoynakRes, linzaSotuvRes, xarajatlarRes] = await Promise.all([
        supabase.from("buyurtmalar").select("*").eq("user_id", user.id),
        supabase.from("tekshiruvlar").select("*").eq("user_id", user.id),
        supabase.from("tayyor_kozoynaklar").select("*").eq("user_id", user.id),
        supabase.from("linza_sotuvlari").select("*").eq("user_id", user.id),
        supabase.from("xarajatlar").select("*").eq("user_id", user.id),
      ]);

      if (buyurtmalarRes.error) throw buyurtmalarRes.error;
      if (tekshiruvlarRes.error) throw tekshiruvlarRes.error;
      if (tayyorKozoynakRes.error) throw tayyorKozoynakRes.error;
      if (linzaSotuvRes.error) throw linzaSotuvRes.error;
      if (xarajatlarRes.error) throw xarajatlarRes.error;

      const buyurtmalar = buyurtmalarRes.data || [];
      const tekshiruvlar = tekshiruvlarRes.data || [];
      const tayyorKozoynaklar = tayyorKozoynakRes.data || [];
      const linzaSotuvlari = linzaSotuvRes.data || [];
      const xarajatlar = xarajatlarRes.data || [];

      // Calculate current period totals
      const currentBuyurtmalar = buyurtmalar.filter((b: any) => !startDate && !endDate ? true : isDateInRange(b.sana));
      const currentTekshiruvlar = tekshiruvlar.filter((t: any) => !startDate && !endDate ? true : isDateInRange(t.sana));
      const currentTayyorKozoynaklar = tayyorKozoynaklar.filter((k: any) => !startDate && !endDate ? true : isDateInRange(k.sana));
      const currentLinzaSotuvlari = linzaSotuvlari.filter((l: any) => !startDate && !endDate ? true : isDateInRange(l.sana));
      const currentXarajatlar = xarajatlar.filter((x: any) => !startDate && !endDate ? true : isDateInRange(x.sana));

      // Calculate total expenses
      const expenseTotal = currentXarajatlar.reduce((sum: number, x: any) => sum + (x.summa || 0), 0);
      setTotalXarajat(expenseTotal);

      // Calculate expense category data
      const expenseCategories: { [key: string]: { total: number; count: number } } = {};
      currentXarajatlar.forEach((x: any) => {
        const category = x.kategoriya || t("expenses.other");
        if (!expenseCategories[category]) {
          expenseCategories[category] = { total: 0, count: 0 };
        }
        expenseCategories[category].total += x.summa || 0;
        expenseCategories[category].count += 1;
      });

      const categoryColors = [
        "hsl(var(--chart-1))",
        "hsl(var(--chart-2))",
        "hsl(var(--chart-3))",
        "hsl(var(--chart-4))",
        "hsl(var(--chart-5))",
        "hsl(var(--destructive))",
      ];

      const expenseCategorySectionData: SectionData[] = Object.entries(expenseCategories).map(([name, data], index) => ({
        name,
        total: data.total,
        count: data.count,
        color: categoryColors[index % categoryColors.length],
      }));
      setExpenseCategoryData(expenseCategorySectionData);

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

      // Group expenses by period
      const expenseData = currentXarajatlar.map((x: any) => ({
        sana: x.sana,
        summa: x.summa,
        tur: "Xarajat"
      }));

      const groupedData = groupByPeriod(allData, expenseData);

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

  const groupByPeriod = (incomeData: any[], expenseData: any[] = []): ReportData[] => {
    const groupedIncome: { [key: string]: number } = {};
    const groupedExpense: { [key: string]: number } = {};
    
    // Group income data
    incomeData.forEach(item => {
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
          key = `${dateParts[1]}-${dateParts[2]}`;
        }
      }
      groupedIncome[key] = (groupedIncome[key] || 0) + item.summa;
    });

    // Group expense data
    expenseData.forEach(item => {
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
          key = `${dateParts[1]}-${dateParts[2]}`;
        }
      }
      groupedExpense[key] = (groupedExpense[key] || 0) + item.summa;
    });

    // Merge all keys
    const allKeys = new Set([...Object.keys(groupedIncome), ...Object.keys(groupedExpense)]);
    
    return Array.from(allKeys).map(name => {
      const tushum = groupedIncome[name] || 0;
      const xarajat = groupedExpense[name] || 0;
      return {
        name,
        tushum,
        xarajat,
        foyda: tushum - xarajat,
        oldatgiTushum: undefined
      };
    }).sort((a, b) => {
      const parseForSort = (dateStr: string) => {
        const parts = dateStr.split("-");
        if (parts.length === 3 && parts[2].length === 4) {
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

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{t("reports.totalIncome")}</p>
                  <p className="text-2xl font-bold text-primary">{totalTushum.toLocaleString()} {t("common.currency")}</p>
                </div>
                {showComparison && previousTotalTushum > 0 && (
                  <div className="text-right">
                    <p className={cn(
                      "text-lg font-bold",
                      totalChange > 0 ? "text-green-600" : totalChange < 0 ? "text-red-600" : "text-muted-foreground"
                    )}>
                      {totalChange > 0 ? "+" : ""}{totalChange.toFixed(1)}%
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <p className="text-sm text-muted-foreground mb-1">{t("reports.totalExpenses")}</p>
              <p className="text-2xl font-bold text-destructive">{totalXarajat.toLocaleString()} {t("common.currency")}</p>
            </div>
            
            <div className={cn(
              "rounded-lg p-4 border",
              (totalTushum - totalXarajat) >= 0 
                ? "bg-green-500/10 border-green-500/20" 
                : "bg-red-500/10 border-red-500/20"
            )}>
              <p className="text-sm text-muted-foreground mb-1">{t("reports.netProfit")}</p>
              <p className={cn(
                "text-2xl font-bold",
                (totalTushum - totalXarajat) >= 0 ? "text-green-600" : "text-red-600"
              )}>
                {(totalTushum - totalXarajat).toLocaleString()} {t("common.currency")}
              </p>
            </div>
          </div>

          {/* Report Type Tabs */}
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "income" | "expense" | "compare")} className="mt-6">
            <TabsList className="grid grid-cols-3 w-full md:w-auto">
              <TabsTrigger value="income">{t("reports.incomeTab")}</TabsTrigger>
              <TabsTrigger value="expense">{t("reports.expenseTab")}</TabsTrigger>
              <TabsTrigger value="compare">{t("reports.compareTab")}</TabsTrigger>
            </TabsList>

            <TabsContent value="income" className="space-y-4 mt-4">
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={reportData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip content={<CustomTooltip total={totalTushum} showComparison={showComparison} />} />
                    <Legend />
                    <Bar dataKey="tushum" fill="hsl(var(--primary))" name={t("reports.income")} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>

            <TabsContent value="expense" className="space-y-4 mt-4">
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={reportData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => `${value.toLocaleString()} ${t("common.currency")}`} />
                    <Legend />
                    <Bar dataKey="xarajat" fill="hsl(var(--destructive))" name={t("reports.expense")} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>

            <TabsContent value="compare" className="space-y-4 mt-4">
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={reportData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => `${value.toLocaleString()} ${t("common.currency")}`} />
                    <Legend />
                    <Bar dataKey="tushum" fill="hsl(var(--primary))" name={t("reports.income")} />
                    <Bar dataKey="xarajat" fill="hsl(var(--destructive))" name={t("reports.expense")} />
                    <Bar dataKey="foyda" fill="hsl(142, 76%, 36%)" name={t("reports.netProfit")} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>
          </Tabs>
        </Tabs>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">{t("reports.bySection")}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {sectionData.map((section) => (
            <div key={section.name} className="bg-secondary rounded-lg p-4">
              <p className="text-sm text-muted-foreground mb-1">{section.name}</p>
              <p className="text-xl font-bold text-foreground">{section.total.toLocaleString()} {t("common.currency")}</p>
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
              <Tooltip formatter={(value: number) => `${value.toLocaleString()} ${t("common.currency")}`} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Expense Categories Section */}
      {expenseCategoryData.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">{t("reports.byExpenseCategory")}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {expenseCategoryData.map((category) => (
              <div key={category.name} className="bg-destructive/5 border border-destructive/10 rounded-lg p-4">
                <p className="text-sm text-muted-foreground mb-1">{category.name}</p>
                <p className="text-xl font-bold text-destructive">{category.total.toLocaleString()} {t("common.currency")}</p>
                <p className="text-xs text-muted-foreground mt-1">{category.count} {t("reports.records")}</p>
              </div>
            ))}
          </div>

          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={expenseCategoryData.filter(s => s.total > 0)}
                  dataKey="total"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={(entry) => `${entry.name}: ${entry.total.toLocaleString()}`}
                >
                  {expenseCategoryData.map((entry, index) => (
                    <Cell key={`expense-cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `${value.toLocaleString()} ${t("common.currency")}`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}
    </div>
  );
};

export default Hisobotlar;
