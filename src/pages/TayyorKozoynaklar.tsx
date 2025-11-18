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

interface TayyorKozoynak {
  id: string;
  sana: string;
  tartibRaqam: number;
  kliyent: string;
  kozoynakTuri: string;
  summa: number;
}

const TayyorKozoynaklar = () => {
  const { t } = useLanguage();
  const [kozoynaklar, setKozoynaklar] = useState<TayyorKozoynak[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [form, setForm] = useState({
    kliyent: "",
    kozoynakTuri: "",
    summa: "",
  });

  useEffect(() => {
    const saved = localStorage.getItem("tayyorKozoynaklar");
    if (saved) {
      setKozoynaklar(JSON.parse(saved));
    }
  }, []);

  const saveKozoynaklar = (data: TayyorKozoynak[]) => {
    localStorage.setItem("tayyorKozoynaklar", JSON.stringify(data));
    setKozoynaklar(data);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newKozoynak: TayyorKozoynak = {
      id: Date.now().toString(),
      sana: new Date().toLocaleDateString("uz-UZ"),
      tartibRaqam: kozoynaklar.length + 1,
      kliyent: form.kliyent,
      kozoynakTuri: form.kozoynakTuri,
      summa: parseFloat(form.summa),
    };

    saveKozoynaklar([...kozoynaklar, newKozoynak]);

    setForm({
      kliyent: "",
      kozoynakTuri: "",
      summa: "",
    });

    toast.success(t("ready.addSuccess"));
  };

  const handleDelete = (id: string) => {
    saveKozoynaklar(kozoynaklar.filter((k) => k.id !== id));
    toast.success(t("ready.deleteSuccess"));
  };

  const filteredKozoynaklar = kozoynaklar.filter((k) => {
    const query = searchQuery.toLowerCase();
    return (
      k.kliyent.toLowerCase().includes(query) ||
      k.sana.includes(query)
    );
  });

  const totalSum = kozoynaklar.reduce((sum, k) => sum + k.summa, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">{t("ready.title")}</h2>
        <p className="text-muted-foreground">{t("ready.subtitle")}</p>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="kliyent">{t("ready.client")}</Label>
              <Input
                id="kliyent"
                value={form.kliyent}
                onChange={(e) => setForm({ ...form, kliyent: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="kozoynakTuri">{t("ready.type")}</Label>
              <Select value={form.kozoynakTuri} onValueChange={(value) => setForm({ ...form, kozoynakTuri: value })}>
                <SelectTrigger>
                  <SelectValue placeholder={t("lensSale.select")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="quyoshdan-himoya">{t("ready.sunProtection")}</SelectItem>
                  <SelectItem value="kompyuter-hameleon">{t("ready.computerChameleon")}</SelectItem>
                  <SelectItem value="kompyuter">{t("ready.computer")}</SelectItem>
                  <SelectItem value="zreniya">{t("ready.vision")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="summa">{t("ready.amount")} ({t("common.sum")})</Label>
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
              {t("ready.add")}
            </Button>
          </div>
        </form>
      </Card>

      <div className="bg-card rounded-lg p-4 border border-border">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
          <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
            <h3 className="text-lg font-semibold">{t("ready.list")}</h3>
            <div className="text-lg font-bold text-primary">
              {t("orders.total")}: {totalSum.toLocaleString()} {t("common.sum")}
            </div>
          </div>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder={t("ready.search")}
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
                <th className="px-4 py-2 text-left">{t("orders.number")}</th>
                <th className="px-4 py-2 text-left">{t("common.date")}</th>
                <th className="px-4 py-2 text-left">{t("ready.client")}</th>
                <th className="px-4 py-2 text-left">{t("ready.type")}</th>
                <th className="px-4 py-2 text-right">Summa</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {filteredKozoynaklar.map((k) => (
                <tr key={k.id} className="border-b border-border">
                  <td className="px-4 py-2">{k.tartibRaqam}</td>
                  <td className="px-4 py-2">{k.sana}</td>
                  <td className="px-4 py-2">{k.kliyent}</td>
                  <td className="px-4 py-2">{k.kozoynakTuri}</td>
                  <td className="px-4 py-2 text-right font-semibold">
                    {k.summa.toLocaleString()}
                  </td>
                  <td className="px-4 py-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(k.id)}
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

export default TayyorKozoynaklar;
