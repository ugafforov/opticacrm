import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileDown } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface ReportData {
  name: string;
  tushum: number;
}

interface SectionData {
  name: string;
  total: number;
  count: number;
  color: string;
}

const Hisobotlar = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [reportData, setReportData] = useState<ReportData[]>([]);
  const [sectionData, setSectionData] = useState<SectionData[]>([]);
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly">("daily");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadReportData();
    }
  }, [user, period, startDate, endDate]);

  const parseDate = (dateString: string): Date => {
    if (!dateString) return new Date();

    // ISO-like format: yyyy-MM-dd (from input type="date")
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const [year, month, day] = dateString.split("-").map(p => parseInt(p, 10));
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
      const start = parseDate(startDate);
      const end = parseDate(endDate);
      const startDateOnly = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      const endDateOnly = new Date(end.getFullYear(), end.getMonth(), end.getDate());
      return itemDateOnly >= startDateOnly && itemDateOnly <= endDateOnly;
    } else if (startDate) {
      const start = parseDate(startDate);
      const startDateOnly = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      return itemDateOnly >= startDateOnly;
    } else if (endDate) {
      const end = parseDate(endDate);
      const endDateOnly = new Date(end.getFullYear(), end.getMonth(), end.getDate());
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

      // Calculate section totals
      const sections: SectionData[] = [
        {
          name: t("nav.orders"),
          total: buyurtmalar.reduce((sum, b) => sum + (b.jami_summa || 0), 0),
          count: buyurtmalar.length,
          color: "hsl(var(--primary))",
        },
        {
          name: t("nav.examination"),
          total: tekshiruvlar.reduce((sum, t) => sum + (t.jami_summa || 0), 0),
          count: tekshiruvlar.length,
          color: "hsl(var(--chart-2))",
        },
        {
          name: t("nav.readyGlasses"),
          total: tayyorKozoynaklar.reduce((sum, k) => sum + (k.summa || 0), 0),
          count: tayyorKozoynaklar.length,
          color: "hsl(var(--chart-3))",
        },
        {
          name: t("nav.lensSales"),
          total: linzaSotuvlari.reduce((sum, l) => sum + (l.summa || 0), 0),
          count: linzaSotuvlari.length,
          color: "hsl(var(--chart-4))",
        },
      ];

      setSectionData(sections);

      // Combine all data for time-based report
      let allData = [
        ...buyurtmalar.map((b: any) => ({
          sana: b.sana,
          summa: b.jami_summa,
          tur: "Buyurtmalar"
        })),
        ...tekshiruvlar.map((t: any) => ({
          sana: t.sana,
          summa: t.jami_summa,
          tur: "Tekshiruv"
        })),
        ...tayyorKozoynaklar.map((k: any) => ({
          sana: k.sana,
          summa: k.summa,
          tur: "Tayyor ko'zoynaklar"
        })),
        ...linzaSotuvlari.map((l: any) => ({
          sana: l.sana,
          summa: l.summa,
          tur: "Linza sotuvi"
        }))
      ];

      // Filter by date range
      if (startDate || endDate) {
        allData = allData.filter(item => isDateInRange(item.sana));
      }

      const groupedData = groupByPeriod(allData);
      setReportData(groupedData);
    } catch (error: any) {
      toast.error("Ma'lumotlarni yuklashda xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  const groupByPeriod = (data: any[]) => {
    const grouped: { [key: string]: number } = {};
    data.forEach(item => {
      let key = item.sana;
      if (period === "weekly") {
        const dateParts = item.sana.split(".");
        if (dateParts.length === 3) {
          const weekNum = Math.ceil(parseInt(dateParts[0]) / 7);
          key = `${dateParts[1]}-oy, ${weekNum}-hafta`;
        }
      } else if (period === "monthly") {
        const dateParts = item.sana.split(".");
        if (dateParts.length === 3) {
          key = `${dateParts[1]}.${dateParts[2]}`;
        }
      }
      grouped[key] = (grouped[key] || 0) + item.summa;
    });
    return Object.entries(grouped).map(([name, tushum]) => ({
      name,
      tushum
    })).sort((a, b) => a.name.localeCompare(b.name));
  };

  const totalTushum = reportData.reduce((sum, item) => sum + item.tushum, 0);
  
  const exportToExcel = async (type: "period" | "section" | "detailed") => {
    if (!user) return;

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

      let data: any[] = [];
      let sheetName = "";

      if (type === "period") {
        data = reportData.map(item => ({
          [t("common.date")]: item.name,
          [t("reports.income")]: item.tushum
        }));
        sheetName = `${t("reports.title")} - ${period === "daily" ? t("reports.daily") : period === "weekly" ? t("reports.weekly") : t("reports.monthly")}`;
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
      } else {
        const allData = [
          ...buyurtmalar.map((b: any) => ({
            [t("reports.bySection")]: t("nav.orders"),
            [t("common.date")]: b.sana,
            [t("orders.client")]: b.mijoz,
            [t("reports.income")]: b.jami_summa
          })),
          ...tekshiruvlar.map((tek: any) => ({
            [t("reports.bySection")]: t("nav.examination"),
            [t("common.date")]: tek.sana,
            [t("exam.patient")]: tek.mijoz,
            [t("reports.income")]: tek.jami_summa
          })),
          ...tayyorKozoynaklar.map((k: any) => ({
            [t("reports.bySection")]: t("nav.readyGlasses"),
            [t("common.date")]: k.sana,
            [t("orders.client")]: k.kliyent,
            [t("reports.income")]: k.summa
          })),
          ...linzaSotuvlari.map((l: any) => ({
            [t("reports.bySection")]: t("nav.lensSales"),
            [t("common.date")]: l.sana,
            [t("orders.client")]: l.kliyent,
            [t("reports.income")]: l.summa
          }))
        ];
        data = allData.filter(item => {
          if (!startDate && !endDate) return true;
          return isDateInRange(item[t("common.date")]);
        });
        sheetName = `${t("reports.title")} - ${t("common.total")}`;
      }

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
      XLSX.writeFile(wb, `${sheetName}.xlsx`);
      toast.success(t("reports.exportExcel"));
    } catch (error: any) {
      toast.error("Eksport qilishda xatolik yuz berdi");
    }
  };

  const exportToPDF = async (type: "period" | "section" | "detailed") => {
    if (!user) return;

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

      const doc = new jsPDF();
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text(t("reports.title"), 14, 15);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`${t("common.date")}: ${new Date().toLocaleDateString("uz-UZ", { timeZone: "Asia/Tashkent" })}`, 14, 22);

      if (type === "period") {
        const tableData = reportData.map(item => [item.name, item.tushum.toLocaleString()]);
        autoTable(doc, {
          startY: 30,
          head: [[t("common.date"), t("reports.income")]],
          body: tableData,
          foot: [[t("common.total"), totalTushum.toLocaleString()]]
        });
      } else if (type === "section") {
        const sections = [
          [t("nav.orders"), buyurtmalar.reduce((sum: number, b: any) => sum + b.jami_summa, 0)],
          [t("nav.examination"), tekshiruvlar.reduce((sum: number, t: any) => sum + t.jami_summa, 0)],
          [t("nav.readyGlasses"), tayyorKozoynaklar.reduce((sum: number, k: any) => sum + k.summa, 0)],
          [t("nav.lensSales"), linzaSotuvlari.reduce((sum: number, l: any) => sum + l.summa, 0)]
        ];
        const tableData = sections.map(s => [s[0], s[1].toLocaleString()]);
        const total = sections.reduce((sum, s) => sum + (s[1] as number), 0);
        autoTable(doc, {
          startY: 30,
          head: [[t("reports.bySection"), t("reports.income")]],
          body: tableData,
          foot: [[t("common.total"), total.toLocaleString()]]
        });
      } else {
        const allData = [
          ...buyurtmalar.map((b: any) => [t("nav.orders"), b.sana, b.mijoz, b.jami_summa.toLocaleString()]),
          ...tekshiruvlar.map((tek: any) => [t("nav.examination"), tek.sana, tek.mijoz, tek.jami_summa.toLocaleString()]),
          ...tayyorKozoynaklar.map((k: any) => [t("nav.readyGlasses"), k.sana, k.kliyent, k.summa.toLocaleString()]),
          ...linzaSotuvlari.map((l: any) => [t("nav.lensSales"), l.sana, l.kliyent, l.summa.toLocaleString()])
        ];
        autoTable(doc, {
          startY: 30,
          head: [[t("reports.bySection"), t("common.date"), t("orders.client"), t("reports.income")]],
          body: allData
        });
      }

      doc.save(`${t("reports.title")}.pdf`);
      toast.success(t("reports.exportPDF"));
    } catch (error: any) {
      toast.error("Eksport qilishda xatolik yuz berdi");
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
              <Label htmlFor="startDate">{t("common.from")}</Label>
              <Input 
                id="startDate" 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)} 
              />
            </div>
            <div>
              <Label htmlFor="endDate">{t("common.to")}</Label>
              <Input 
                id="endDate" 
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)} 
              />
            </div>
            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                }}
              >
                {t("reports.reset")}
              </Button>
            </div>
          </div>
        </div>

        <Tabs value={period} onValueChange={(value) => setPeriod(value as any)} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
            <TabsTrigger value="daily">{t("reports.daily")}</TabsTrigger>
            <TabsTrigger value="weekly">{t("reports.weekly")}</TabsTrigger>
            <TabsTrigger value="monthly">{t("reports.monthly")}</TabsTrigger>
          </TabsList>

          <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
            <p className="text-sm text-muted-foreground mb-1">{t("reports.totalIncome")}</p>
            <p className="text-3xl font-bold text-primary">{totalTushum.toLocaleString()} {t("common.sum")}</p>
          </div>

          <TabsContent value="daily" className="space-y-4">
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={reportData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: number) => `${value.toLocaleString()} ${t("common.sum")}`}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                  />
                  <Legend />
                  <Bar dataKey="tushum" fill="hsl(var(--primary))" name={t("reports.income")} />
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
                  <Tooltip 
                    formatter={(value: number) => `${value.toLocaleString()} ${t("common.sum")}`}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                  />
                  <Legend />
                  <Bar dataKey="tushum" fill="hsl(var(--primary))" name={t("reports.income")} />
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
                  <Tooltip 
                    formatter={(value: number) => `${value.toLocaleString()} ${t("common.sum")}`}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                  />
                  <Legend />
                  <Bar dataKey="tushum" fill="hsl(var(--primary))" name={t("reports.income")} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
        </Tabs>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">{t("reports.bySection")}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {sectionData.map((section) => (
            <div key={section.name} className="bg-secondary rounded-lg p-4">
              <p className="text-sm text-muted-foreground mb-1">{section.name}</p>
              <p className="text-xl font-bold text-foreground">{section.total.toLocaleString()} {t("common.sum")}</p>
              <p className="text-xs text-muted-foreground mt-1">{section.count} ta yozuv</p>
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

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Ma'lumotlarni eksport qilish</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <Button onClick={() => exportToExcel("period")} variant="outline" className="w-full">
            <FileDown className="w-4 h-4 mr-2" />
            Excel - {period === "daily" ? t("reports.daily") : period === "weekly" ? t("reports.weekly") : t("reports.monthly")}
          </Button>
          <Button onClick={() => exportToExcel("section")} variant="outline" className="w-full">
            <FileDown className="w-4 h-4 mr-2" />
            Excel - {t("reports.bySection")}
          </Button>
          <Button onClick={() => exportToExcel("detailed")} variant="outline" className="w-full">
            <FileDown className="w-4 h-4 mr-2" />
            Excel - Batafsil
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button onClick={() => exportToPDF("period")} variant="outline" className="w-full">
            <FileDown className="w-4 h-4 mr-2" />
            PDF - {period === "daily" ? t("reports.daily") : period === "weekly" ? t("reports.weekly") : t("reports.monthly")}
          </Button>
          <Button onClick={() => exportToPDF("section")} variant="outline" className="w-full">
            <FileDown className="w-4 h-4 mr-2" />
            PDF - {t("reports.bySection")}
          </Button>
          <Button onClick={() => exportToPDF("detailed")} variant="outline" className="w-full">
            <FileDown className="w-4 h-4 mr-2" />
            PDF - Batafsil
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default Hisobotlar;
