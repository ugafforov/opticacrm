import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useLanguage } from "@/contexts/LanguageContext";

interface ReportData {
  name: string;
  tushum: number;
}

const Hisobotlar = () => {
  const { t } = useLanguage();
  const [reportData, setReportData] = useState<ReportData[]>([]);
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly">("daily");

  useEffect(() => {
    loadReportData();
  }, [period]);

  const loadReportData = () => {
    // Load all data from localStorage
    const buyurtmalar = JSON.parse(localStorage.getItem("buyurtmalar") || "[]");
    const tekshiruvlar = JSON.parse(localStorage.getItem("tekshiruvlar") || "[]");
    const tayyorKozoynaklar = JSON.parse(localStorage.getItem("tayyorKozoynaklar") || "[]");
    const linzaSotuvlari = JSON.parse(localStorage.getItem("linzaSotuvlari") || "[]");

    const allData = [
      ...buyurtmalar.map((b: any) => ({ sana: b.sana, summa: b.jamiSumma, tur: "Buyurtmalar" })),
      ...tekshiruvlar.map((t: any) => ({ sana: t.sana, summa: t.jamiSumma, tur: "Tekshiruv" })),
      ...tayyorKozoynaklar.map((k: any) => ({ sana: k.sana, summa: k.summa, tur: "Tayyor ko'zoynaklar" })),
      ...linzaSotuvlari.map((l: any) => ({ sana: l.sana, summa: l.summa, tur: "Linza sotuvi" })),
    ];

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
