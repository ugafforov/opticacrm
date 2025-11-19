import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileDown } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface ReportData {
  name: string;
  tushum: number;
}

const Hisobotlar = () => {
  const { t } = useLanguage();
  const [reportData, setReportData] = useState<ReportData[]>([]);
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly">("daily");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    loadReportData();
  }, [period, startDate, endDate]);

  const parseDate = (dateString: string): Date => {
    // Parse dd.MM.yyyy or dd/MM/yyyy format
    const parts = dateString.split(/[./]/);
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
      const year = parseInt(parts[2], 10);
      
      // Create date at midnight (start of day)
      return new Date(year, month, day, 0, 0, 0, 0);
    }
    return new Date();
  };

  const isDateInRange = (dateString: string) => {
    if (!startDate && !endDate) return true;
    
    const itemDate = parseDate(dateString);
    // Reset time to compare only dates
    itemDate.setHours(0, 0, 0, 0);
    
    let start: Date | null = null;
    let end: Date | null = null;
    
    if (startDate) {
      start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
    }
    
    if (endDate) {
      end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
    }

    if (start && end) {
      return itemDate >= start && itemDate <= end;
    } else if (start) {
      return itemDate >= start;
    } else if (end) {
      return itemDate <= end;
    }
    return true;
  };

  const loadReportData = () => {
    // Load all data from localStorage
    const buyurtmalar = JSON.parse(localStorage.getItem("buyurtmalar") || "[]");
    const tekshiruvlar = JSON.parse(localStorage.getItem("tekshiruvlar") || "[]");
    const tayyorKozoynaklar = JSON.parse(localStorage.getItem("tayyorKozoynaklar") || "[]");
    const linzaSotuvlari = JSON.parse(localStorage.getItem("linzaSotuvlari") || "[]");

    let allData = [
      ...buyurtmalar.map((b: any) => ({ sana: b.sana, summa: b.jamiSumma, tur: "Buyurtmalar" })),
      ...tekshiruvlar.map((t: any) => ({ sana: t.sana, summa: t.jamiSumma, tur: "Tekshiruv" })),
      ...tayyorKozoynaklar.map((k: any) => ({ sana: k.sana, summa: k.summa, tur: "Tayyor ko'zoynaklar" })),
      ...linzaSotuvlari.map((l: any) => ({ sana: l.sana, summa: l.summa, tur: "Linza sotuvi" })),
    ];

    // Filter by date range
    if (startDate || endDate) {
      allData = allData.filter((item) => isDateInRange(item.sana));
    }

    const groupedData = groupByPeriod(allData);
    setReportData(groupedData);
  };

  const groupByPeriod = (data: any[]) => {
    const grouped: { [key: string]: number } = {};

    data.forEach((item) => {
      let key = item.sana;

      if (period === "weekly") {
        // Group by week - simple approximation
        const dateParts = item.sana.split(".");
        if (dateParts.length === 3) {
          const weekNum = Math.ceil(parseInt(dateParts[0]) / 7);
          key = `${dateParts[1]}-oy, ${weekNum}-hafta`;
        }
      } else if (period === "monthly") {
        // Group by month
        const dateParts = item.sana.split(".");
        if (dateParts.length === 3) {
          key = `${dateParts[1]}.${dateParts[2]}`;
        }
      }

      grouped[key] = (grouped[key] || 0) + item.summa;
    });

    return Object.entries(grouped)
      .map(([name, tushum]) => ({ name, tushum }))
      .sort((a, b) => a.name.localeCompare(b.name));
  };

  const totalTushum = reportData.reduce((sum, item) => sum + item.tushum, 0);

  const exportToExcel = (type: "period" | "section" | "detailed") => {
    const buyurtmalar = JSON.parse(localStorage.getItem("buyurtmalar") || "[]");
    const tekshiruvlar = JSON.parse(localStorage.getItem("tekshiruvlar") || "[]");
    const tayyorKozoynaklar = JSON.parse(localStorage.getItem("tayyorKozoynaklar") || "[]");
    const linzaSotuvlari = JSON.parse(localStorage.getItem("linzaSotuvlari") || "[]");

    let data: any[] = [];
    let sheetName = "";

    if (type === "period") {
      data = reportData.map(item => ({
        [t("common.date")]: item.name,
        [t("reports.income")]: item.tushum,
      }));
      sheetName = `${t("reports.title")} - ${period === "daily" ? t("reports.daily") : period === "weekly" ? t("reports.weekly") : t("reports.monthly")}`;
    } else if (type === "section") {
      const sections = [
        { name: t("nav.orders"), data: buyurtmalar, key: "jamiSumma" },
        { name: t("nav.examination"), data: tekshiruvlar, key: "jamiSumma" },
        { name: t("nav.readyGlasses"), data: tayyorKozoynaklar, key: "summa" },
        { name: t("nav.lensSales"), data: linzaSotuvlari, key: "summa" },
      ];
      
      data = sections.map(section => ({
        [t("reports.bySection")]: section.name,
        [t("reports.income")]: section.data.reduce((sum: number, item: any) => sum + (item[section.key] || 0), 0),
      }));
      sheetName = `${t("reports.title")} - ${t("reports.bySection")}`;
    } else {
      const allData = [
        ...buyurtmalar.map((b: any) => ({ 
          [t("reports.bySection")]: t("nav.orders"),
          [t("common.date")]: b.sana, 
          [t("orders.client")]: b.mijoz, 
          [t("reports.income")]: b.jamiSumma 
        })),
        ...tekshiruvlar.map((tek: any) => ({ 
          [t("reports.bySection")]: t("nav.examination"),
          [t("common.date")]: tek.sana, 
          [t("exam.patient")]: tek.mijoz, 
          [t("reports.income")]: tek.jamiSumma 
        })),
        ...tayyorKozoynaklar.map((k: any) => ({ 
          [t("reports.bySection")]: t("nav.readyGlasses"),
          [t("common.date")]: k.sana, 
          [t("orders.client")]: k.mijoz, 
          [t("reports.income")]: k.summa 
        })),
        ...linzaSotuvlari.map((l: any) => ({ 
          [t("reports.bySection")]: t("nav.lensSales"),
          [t("common.date")]: l.sana, 
          [t("orders.client")]: l.mijoz, 
          [t("reports.income")]: l.summa 
        })),
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
  };

  const exportToPDF = (type: "period" | "section" | "detailed") => {
    const doc = new jsPDF();
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(t("reports.title"), 14, 15);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`${t("common.date")}: ${new Date().toLocaleDateString("uz-UZ", { timeZone: "Asia/Tashkent" })}`, 14, 22);

    const buyurtmalar = JSON.parse(localStorage.getItem("buyurtmalar") || "[]");
    const tekshiruvlar = JSON.parse(localStorage.getItem("tekshiruvlar") || "[]");
    const tayyorKozoynaklar = JSON.parse(localStorage.getItem("tayyorKozoynaklar") || "[]");
    const linzaSotuvlari = JSON.parse(localStorage.getItem("linzaSotuvlari") || "[]");

    if (type === "period") {
      const tableData = reportData.map(item => [item.name, item.tushum.toLocaleString()]);
      autoTable(doc, {
        startY: 30,
        head: [[t("common.date"), t("reports.income")]],
        body: tableData,
        foot: [[t("common.total"), totalTushum.toLocaleString()]],
      });
    } else if (type === "section") {
      const sections = [
        [t("nav.orders"), buyurtmalar.reduce((sum: number, b: any) => sum + b.jamiSumma, 0)],
        [t("nav.examination"), tekshiruvlar.reduce((sum: number, t: any) => sum + t.jamiSumma, 0)],
        [t("nav.readyGlasses"), tayyorKozoynaklar.reduce((sum: number, k: any) => sum + k.summa, 0)],
        [t("nav.lensSales"), linzaSotuvlari.reduce((sum: number, l: any) => sum + l.summa, 0)],
      ];
      const tableData = sections.map(s => [s[0], s[1].toLocaleString()]);
      const total = sections.reduce((sum, s) => sum + (s[1] as number), 0);
      
      autoTable(doc, {
        startY: 30,
        head: [[t("reports.bySection"), t("reports.income")]],
        body: tableData,
        foot: [[t("common.total"), total.toLocaleString()]],
      });
    } else {
      const allData = [
        ...buyurtmalar.map((b: any) => [t("nav.orders"), b.sana, b.mijoz, b.jamiSumma.toLocaleString()]),
        ...tekshiruvlar.map((tek: any) => [t("nav.examination"), tek.sana, tek.mijoz, tek.jamiSumma.toLocaleString()]),
        ...tayyorKozoynaklar.map((k: any) => [t("nav.readyGlasses"), k.sana, k.mijoz, k.summa.toLocaleString()]),
        ...linzaSotuvlari.map((l: any) => [t("nav.lensSales"), l.sana, l.mijoz, l.summa.toLocaleString()]),
      ];
      
      autoTable(doc, {
        startY: 30,
        head: [[t("reports.bySection"), t("common.date"), t("orders.client"), t("reports.income")]],
        body: allData,
      });
    }

    doc.save(`${t("reports.title")}.pdf`);
    toast.success(t("reports.exportPDF"));
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
        <h3 className="text-lg font-semibold mb-4">Bo'limlar bo'yicha tushum</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { name: "Buyurtmalar", key: "buyurtmalar", field: "jamiSumma" },
            { name: "Tekshiruv", key: "tekshiruvlar", field: "jamiSumma" },
            { name: "Tayyor ko'zoynaklar", key: "tayyorKozoynaklar", field: "summa" },
            { name: "Linza sotuvi", key: "linzaSotuvlari", field: "summa" },
          ].map((section) => {
            const data = JSON.parse(localStorage.getItem(section.key) || "[]");
            const total = data.reduce((sum: number, item: any) => sum + (item[section.field] || 0), 0);
            
            return (
              <div key={section.key} className="bg-secondary rounded-lg p-4">
                <p className="text-sm text-muted-foreground mb-1">{section.name}</p>
                <p className="text-xl font-bold text-foreground">{total.toLocaleString()} so'm</p>
                <p className="text-xs text-muted-foreground mt-1">{data.length} ta yozuv</p>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};

export default Hisobotlar;
