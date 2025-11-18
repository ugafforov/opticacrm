import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

interface Buyurtma {
  id: string;
  sana: string;
  mijoz: string;
  od: string;
  os: string;
  oynaTuri: string;
  oynaNarxi: number;
  opravaNarxi: number;
  opravaTuri: string;
  jamiSumma: number;
}

const Buyurtmalar = () => {
  const { t } = useLanguage();
  const [buyurtmalar, setBuyurtmalar] = useState<Buyurtma[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [form, setForm] = useState({
    mijoz: "",
    od: "",
    os: "",
    oynaTuri: "",
    oynaNarxi: "",
    opravaNarxi: "",
    opravaTuri: "",
  });

  useEffect(() => {
    const saved = localStorage.getItem("buyurtmalar");
    if (saved) {
      setBuyurtmalar(JSON.parse(saved));
    }
  }, []);

  const saveBuyurtmalar = (data: Buyurtma[]) => {
    localStorage.setItem("buyurtmalar", JSON.stringify(data));
    setBuyurtmalar(data);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const jamiSumma = (parseFloat(form.oynaNarxi) || 0) + (parseFloat(form.opravaNarxi) || 0);
    
    const newBuyurtma: Buyurtma = {
      id: Date.now().toString(),
      sana: new Date().toLocaleDateString("uz-UZ"),
      mijoz: form.mijoz,
      od: form.od,
      os: form.os,
      oynaTuri: form.oynaTuri,
      oynaNarxi: parseFloat(form.oynaNarxi) || 0,
      opravaNarxi: parseFloat(form.opravaNarxi) || 0,
      opravaTuri: form.opravaTuri,
      jamiSumma,
    };

    saveBuyurtmalar([...buyurtmalar, newBuyurtma]);
    
    setForm({
      mijoz: "",
      od: "",
      os: "",
      oynaTuri: "",
      oynaNarxi: "",
      opravaNarxi: "",
      opravaTuri: "",
    });
    
    toast.success(t("orders.addSuccess"));
  };

  const handleDelete = (id: string) => {
    saveBuyurtmalar(buyurtmalar.filter((b) => b.id !== id));
    toast.success(t("orders.deleteSuccess"));
  };

  const filteredBuyurtmalar = buyurtmalar.filter((b) => {
    const query = searchQuery.toLowerCase();
    return (
      b.mijoz.toLowerCase().includes(query) ||
      b.sana.includes(query)
    );
  });

  const totalSum = buyurtmalar.reduce((sum, b) => sum + b.jamiSumma, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">{t("orders.title")}</h2>
        <p className="text-muted-foreground">{t("orders.subtitle")}</p>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="mijoz">{t("orders.client")}</Label>
              <Input
                id="mijoz"
                value={form.mijoz}
                onChange={(e) => setForm({ ...form, mijoz: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="od">OD (o'ng)</Label>
                <Input
                  id="od"
                  value={form.od}
                  onChange={(e) => setForm({ ...form, od: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="os">OS (chap)</Label>
                <Input
                  id="os"
                  value={form.os}
                  onChange={(e) => setForm({ ...form, os: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="oynaTuri">Oyna turi</Label>
              <Select value={form.oynaTuri} onValueChange={(value) => setForm({ ...form, oynaTuri: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Tanlang" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3B1 jigarrang">3B1 jigarrang</SelectItem>
                  <SelectItem value="3B1 qora">3B1 qora</SelectItem>
                  <SelectItem value="4B1">4B1</SelectItem>
                  <SelectItem value="420">420</SelectItem>
                  <SelectItem value="SR">SR</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="oynaNarxi">Oyna narxi (so'm)</Label>
              <Input
                id="oynaNarxi"
                type="number"
                value={form.oynaNarxi}
                onChange={(e) => setForm({ ...form, oynaNarxi: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="opravaTuri">Oprava (ramka) turi</Label>
              <Select value={form.opravaTuri} onValueChange={(value) => setForm({ ...form, opravaTuri: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Tanlang" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dumaloq">Dumaloq</SelectItem>
                  <SelectItem value="fabritsio">Fabritsio</SelectItem>
                  <SelectItem value="alaniye">Alaniye</SelectItem>
                  <SelectItem value="titanik">Titanik</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="opravaNarxi">Oprava narxi (so'm)</Label>
              <Input
                id="opravaNarxi"
                type="number"
                value={form.opravaNarxi}
                onChange={(e) => setForm({ ...form, opravaNarxi: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-border">
            <div className="text-lg font-semibold">
              {t("orders.totalAmount")}: {((parseFloat(form.oynaNarxi) || 0) + (parseFloat(form.opravaNarxi) || 0)).toLocaleString()} {t("common.sum")}
            </div>
            <Button type="submit" className="bg-primary hover:bg-primary/90">
              {t("orders.add")}
            </Button>
          </div>
        </form>
      </Card>

      <div className="bg-card rounded-lg p-4 border border-border">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
          <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
            <h3 className="text-lg font-semibold">{t("orders.list")}</h3>
            <div className="text-lg font-bold text-primary">
              {t("orders.total")}: {totalSum.toLocaleString()} {t("common.sum")}
            </div>
          </div>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder={t("orders.search")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-secondary text-secondary-foreground">
              <tr>
                <th className="px-4 py-2 text-left">{t("common.date")}</th>
                <th className="px-4 py-2 text-left">{t("orders.client")}</th>
                <th className="px-4 py-2 text-left">OD/OS</th>
                <th className="px-4 py-2 text-left">Oyna</th>
                <th className="px-4 py-2 text-left">Oprava</th>
                <th className="px-4 py-2 text-right">Summa</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {filteredBuyurtmalar.map((b) => (
                <tr key={b.id} className="border-b border-border">
                  <td className="px-4 py-2">{b.sana}</td>
                  <td className="px-4 py-2">{b.mijoz}</td>
                  <td className="px-4 py-2">{b.od} / {b.os}</td>
                  <td className="px-4 py-2">{b.oynaTuri}</td>
                  <td className="px-4 py-2">{b.opravaTuri}</td>
                  <td className="px-4 py-2 text-right font-semibold">{b.jamiSumma.toLocaleString()}</td>
                  <td className="px-4 py-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(b.id)}
                      className="text-destructive hover:text-destructive/90"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Buyurtmalar;
