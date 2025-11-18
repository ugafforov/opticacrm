import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

  const parseDate = (dateString: string) => {
    const parts = dateString.split(/[./]/);
    if (parts.length === 3) {
      return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    }
    return new Date();
  };

  const isDateInRange = (dateString: string) => {
    if (!startDate && !endDate) return true;
    
    const date = parseDate(dateString);
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    if (start && end) {
      return date >= start && date <= end;
    } else if (start) {
      return date >= start;
    } else if (end) {
      return date <= end;
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
