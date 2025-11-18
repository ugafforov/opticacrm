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

interface LinzaSotish {
  id: string;
  sana: string;
  kliyent: string;
  linzaTuri: string;
  summa: number;
}

const LinzaSotuvi = () => {
  const { t } = useLanguage();
  const [sotuvlar, setSotuvlar] = useState<LinzaSotish[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [form, setForm] = useState({
    kliyent: "",
    linzaTuri: "",
    summa: "",
  });

  useEffect(() => {
    const saved = localStorage.getItem("linzaSotuvlari");
    if (saved) {
      setSotuvlar(JSON.parse(saved));
    }
  }, []);

  const saveSotuvlar = (data: LinzaSotish[]) => {
    localStorage.setItem("linzaSotuvlari", JSON.stringify(data));
    setSotuvlar(data);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newSotuv: LinzaSotish = {
      id: Date.now().toString(),
      sana: new Date().toLocaleDateString("uz-UZ"),
      kliyent: form.kliyent,
      linzaTuri: form.linzaTuri,
      summa: parseFloat(form.summa),
    };

    saveSotuvlar([...sotuvlar, newSotuv]);

    setForm({
      kliyent: "",
      linzaTuri: "",
      summa: "",
    });

    toast.success(t("lensSale.addSuccess"));
  };

  const handleDelete = (id: string) => {
    saveSotuvlar(sotuvlar.filter((s) => s.id !== id));
    toast.success(t("lensSale.deleteSuccess"));
  };

  const filteredSotuvlar = sotuvlar.filter((s) => {
    const query = searchQuery.toLowerCase();
    return (
      s.kliyent.toLowerCase().includes(query) ||
      s.sana.includes(query)
    );
  });

  const totalSum = sotuvlar.reduce((sum, s) => sum + s.summa, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">{t("lensSale.title")}</h2>
        <p className="text-muted-foreground">{t("lensSale.subtitle")}</p>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="kliyent">{t("lensSale.client")}</Label>
              <Input
                id="kliyent"
                value={form.kliyent}
                onChange={(e) => setForm({ ...form, kliyent: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="linzaTuri">{t("lensSale.type")}</Label>
              <Select value={form.linzaTuri} onValueChange={(value) => setForm({ ...form, linzaTuri: value })}>
                <SelectTrigger>
                  <SelectValue placeholder={t("lensSale.select")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="amerikanskiy">{t("lensSale.american")}</SelectItem>
                  <SelectItem value="koreyskiy">{t("lensSale.korean")}</SelectItem>
                  <SelectItem value="astigmatik">{t("lensSale.astigmatic")}</SelectItem>
                  <SelectItem value="rangli-zreniya">{t("lensSale.coloredVision")}</SelectItem>
                  <SelectItem value="chiroy-uchun">{t("lensSale.beauty")}</SelectItem>
                  <SelectItem value="linza-suvi">{t("lensSale.solution")}</SelectItem>
                  <SelectItem value="linza-konteyneri">{t("lensSale.container")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="summa">{t("lensSale.amount")} ({t("common.sum")})</Label>
              <Input
                id="summa"
                type="number"
                value={form.summa}
                onChange={(e) => setForm({ ...form, summa: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-border">
            <Button type="submit" className="bg-primary hover:bg-primary/90">
              {t("lensSale.add")}
            </Button>
          </div>
        </form>
      </Card>

      <div className="bg-card rounded-lg p-4 border border-border">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
          <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
            <h3 className="text-lg font-semibold">{t("lensSale.list")}</h3>
            <div className="text-lg font-bold text-primary">
              {t("orders.total")}: {totalSum.toLocaleString()} {t("common.sum")}
            </div>
          </div>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder={t("lensSale.search")}
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
                <th className="px-4 py-2 text-left">{t("lensSale.client")}</th>
                <th className="px-4 py-2 text-left">{t("lensSale.type")}</th>
                <th className="px-4 py-2 text-right">Summa</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {filteredSotuvlar.map((s) => (
                <tr key={s.id} className="border-b border-border">
                  <td className="px-4 py-2">{s.sana}</td>
                  <td className="px-4 py-2">{s.kliyent}</td>
                  <td className="px-4 py-2">{s.linzaTuri}</td>
                  <td className="px-4 py-2 text-right font-semibold">
                    {s.summa.toLocaleString()}
                  </td>
                  <td className="px-4 py-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(s.id)}
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

export default LinzaSotuvi;
