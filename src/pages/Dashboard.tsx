import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { DollarSign, Eye, Glasses, ShoppingBag } from "lucide-react";
import { formatDisplayDate } from "@/lib/utils";

interface DashboardData {
  buyurtmalar: number;
  tekshiruvlar: number;
  tayyorKozoynaklar: number;
  linzaSotuvlari: number;
  total: number;
}

interface ChartData {
  name: string;
  summa: number;
}

const Dashboard = () => {
  const { user } = useAuth();
  const [todayData, setTodayData] = useState<DashboardData>({
    buyurtmalar: 0,
    tekshiruvlar: 0,
    tayyorKozoynaklar: 0,
    linzaSotuvlari: 0,
    total: 0,
  });
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [pieData, setPieData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly">("daily");

  const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user, period]);

  const loadDashboardData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const today = formatDisplayDate(new Date().toISOString());
      const now = new Date();
      
      let startDate = new Date();
      if (period === "weekly") {
        startDate.setDate(now.getDate() - 7);
      } else if (period === "monthly") {
        startDate.setMonth(now.getMonth() - 1);
      }

      // Fetch buyurtmalar
      const { data: buyurtmalarData } = await supabase
        .from("buyurtmalar")
        .select("*")
        .eq("user_id", user.id);

      // Fetch tekshiruvlar
      const { data: tekshiruvlarData } = await supabase
        .from("tekshiruvlar")
        .select("*")
        .eq("user_id", user.id);

      // Fetch tayyor_kozoynaklar
      const { data: tayyorKozoynakData } = await supabase
        .from("tayyor_kozoynaklar")
        .select("*")
        .eq("user_id", user.id);

      // Fetch linza_sotuvlari
      const { data: linzaSotuvlariData } = await supabase
        .from("linza_sotuvlari")
        .select("*")
        .eq("user_id", user.id);

      // Calculate today's totals
      const buyurtmalarToday = buyurtmalarData?.filter(item => formatDisplayDate(item.sana) === today)
        .reduce((sum, item) => sum + Number(item.jami_summa), 0) || 0;

      const tekshiruvlarToday = tekshiruvlarData?.filter(item => formatDisplayDate(item.sana) === today)
        .reduce((sum, item) => sum + Number(item.jami_summa), 0) || 0;

      const tayyorToday = tayyorKozoynakData?.filter(item => formatDisplayDate(item.sana) === today)
        .reduce((sum, item) => sum + Number(item.summa), 0) || 0;

      const linzaToday = linzaSotuvlariData?.filter(item => formatDisplayDate(item.sana) === today)
        .reduce((sum, item) => sum + Number(item.summa), 0) || 0;

      setTodayData({
        buyurtmalar: buyurtmalarToday,
        tekshiruvlar: tekshiruvlarToday,
        tayyorKozoynaklar: tayyorToday,
        linzaSotuvlari: linzaToday,
        total: buyurtmalarToday + tekshiruvlarToday + tayyorToday + linzaToday,
      });

      // Prepare chart data based on period
      const groupedData = new Map<string, number>();

      const processData = (data: any[], summaField: string) => {
        data?.forEach(item => {
          const itemDate = new Date(formatDisplayDate(item.sana).split('-').reverse().join('-'));
          if (itemDate >= startDate && itemDate <= now) {
            let key: string;
            if (period === "daily") {
              key = formatDisplayDate(item.sana);
            } else if (period === "weekly") {
              const weekNum = Math.ceil((now.getTime() - itemDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
              key = `${weekNum} hafta oldin`;
            } else {
              key = new Date(itemDate).toLocaleDateString('uz-UZ', { month: 'short' });
            }
            
            const currentSum = groupedData.get(key) || 0;
            groupedData.set(key, currentSum + Number(item[summaField]));
          }
        });
      };

      processData(buyurtmalarData || [], "jami_summa");
      processData(tekshiruvlarData || [], "jami_summa");
      processData(tayyorKozoynakData || [], "summa");
      processData(linzaSotuvlariData || [], "summa");

      const chartDataArray: ChartData[] = Array.from(groupedData.entries())
        .map(([name, summa]) => ({ name, summa }))
        .sort((a, b) => {
          if (period === "daily") {
            const dateA = new Date(a.name.split('-').reverse().join('-'));
            const dateB = new Date(b.name.split('-').reverse().join('-'));
            return dateA.getTime() - dateB.getTime();
          }
          return 0;
        })
        .slice(-10);

      setChartData(chartDataArray);

      // Prepare pie chart data
      setPieData([
        { name: "Buyurtmalar", value: buyurtmalarToday, color: COLORS[0] },
        { name: "Tekshiruvlar", value: tekshiruvlarToday, color: COLORS[1] },
        { name: "Tayyor ko'zoynaklar", value: tayyorToday, color: COLORS[2] },
        { name: "Linza sotuvlari", value: linzaToday, color: COLORS[3] },
      ].filter(item => item.value > 0));

    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('uz-UZ').format(value) + " so'm";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Yuklanmoqda...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Statistika</h1>
        <p className="text-muted-foreground">Bugungi daromadlar va tendentsiyalar</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Jami daromad</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(todayData.total)}</div>
            <p className="text-xs text-muted-foreground">Bugungi kun</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Buyurtmalar</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(todayData.buyurtmalar)}</div>
            <p className="text-xs text-muted-foreground">Bugungi kun</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tekshiruvlar</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(todayData.tekshiruvlar)}</div>
            <p className="text-xs text-muted-foreground">Bugungi kun</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tayyor ko'zoynaklar</CardTitle>
            <Glasses className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(todayData.tayyorKozoynaklar)}</div>
            <p className="text-xs text-muted-foreground">Bugungi kun</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Linza sotuvlari</CardTitle>
            <Glasses className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(todayData.linzaSotuvlari)}</div>
            <p className="text-xs text-muted-foreground">Bugungi kun</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs value={period} onValueChange={(value) => setPeriod(value as any)} className="space-y-4">
        <TabsList>
          <TabsTrigger value="daily">Kunlik</TabsTrigger>
          <TabsTrigger value="weekly">Haftalik</TabsTrigger>
          <TabsTrigger value="monthly">Oylik</TabsTrigger>
        </TabsList>

        <TabsContent value={period} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Daromadlar diagrammasi</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                    />
                    <Bar dataKey="summa" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Bugungi daromadlar taqsimoti</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => entry.name}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Dashboard;