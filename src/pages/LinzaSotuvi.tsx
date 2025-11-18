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

interface LinzaSotish {
  id: string;
  sana: string;
  kliyent: string;
  linzaTuri: string;
  summa: number;
}

const LinzaSotuvi = () => {
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

    toast.success("Sotuv qo'shildi!");
  };

  const handleDelete = (id: string) => {
    saveSotuvlar(sotuvlar.filter((s) => s.id !== id));
    toast.success("O'chirildi");
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
        <h2 className="text-2xl font-bold text-foreground mb-2">Linza sotuvi</h2>
        <p className="text-muted-foreground">Linza va aksessuarlar sotuvi</p>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="kliyent">Kliyent</Label>
              <Input
                id="kliyent"
                value={form.kliyent}
                onChange={(e) => setForm({ ...form, kliyent: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="linzaTuri">Linza turi</Label>
              <Select value={form.linzaTuri} onValueChange={(value) => setForm({ ...form, linzaTuri: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Tanlang" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="amerikanskiy">Amerikanskiy</SelectItem>
                  <SelectItem value="koreyskiy">Koreyskiy</SelectItem>
                  <SelectItem value="astigmatik">Astigmatik</SelectItem>
                  <SelectItem value="rangli-zreniya">Rangli zreniya</SelectItem>
                  <SelectItem value="chiroy-uchun">Chiroy uchun</SelectItem>
                  <SelectItem value="linza-suvi">Linza suvi</SelectItem>
                  <SelectItem value="linza-konteyneri">Linza konteyneri</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="summa">Summa (so'm)</Label>
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
              Qo'shish
            </Button>
          </div>
        </form>
      </Card>

      <div className="bg-card rounded-lg p-4 border border-border">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
          <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
            <h3 className="text-lg font-semibold">Sotuvlar ro'yxati</h3>
            <div className="text-lg font-bold text-primary">
              Jami: {totalSum.toLocaleString()} so'm
            </div>
          </div>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Qidirish..."
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
                <th className="px-4 py-2 text-left">Sana</th>
                <th className="px-4 py-2 text-left">Kliyent</th>
                <th className="px-4 py-2 text-left">Linza turi</th>
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
