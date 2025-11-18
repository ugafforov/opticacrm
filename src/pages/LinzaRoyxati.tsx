import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Trash2, Search } from "lucide-react";
import { toast } from "sonner";

interface LinzaRoyxat {
  id: string;
  sana: string;
  mijoz: string;
  od: string;
  os: string;
  telefon: string;
  linzaTuri: string;
}

const LinzaRoyxati = () => {
  const [royxatlar, setRoyxatlar] = useState<LinzaRoyxat[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [form, setForm] = useState({
    mijoz: "",
    od: "",
    os: "",
    telefon: "",
    linzaTuri: "",
  });

  useEffect(() => {
    const saved = localStorage.getItem("linzaRoyxatlari");
    if (saved) {
      setRoyxatlar(JSON.parse(saved));
    }
  }, []);

  const saveRoyxatlar = (data: LinzaRoyxat[]) => {
    localStorage.setItem("linzaRoyxatlari", JSON.stringify(data));
    setRoyxatlar(data);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newRoyxat: LinzaRoyxat = {
      id: Date.now().toString(),
      sana: new Date().toLocaleDateString("uz-UZ"),
      ...form,
    };

    saveRoyxatlar([...royxatlar, newRoyxat]);

    setForm({
      mijoz: "",
      od: "",
      os: "",
      telefon: "",
      linzaTuri: "",
    });

    toast.success("Ro'yxatga qo'shildi!");
  };

  const handleDelete = (id: string) => {
    saveRoyxatlar(royxatlar.filter((r) => r.id !== id));
    toast.success("O'chirildi");
  };

  const filteredRoyxatlar = royxatlar.filter((r) => {
    const query = searchQuery.toLowerCase();
    return (
      r.mijoz.toLowerCase().includes(query) ||
      r.telefon.includes(query) ||
      r.sana.includes(query)
    );
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Linza ro'yxatlari</h2>
        <p className="text-muted-foreground">Linza buyurtmalari ro'yxati</p>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="mijoz">Mijoz familiya va ismi</Label>
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
                  required
                />
              </div>
              <div>
                <Label htmlFor="os">OS (chap)</Label>
                <Input
                  id="os"
                  value={form.os}
                  onChange={(e) => setForm({ ...form, os: e.target.value })}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="telefon">Telefon raqami</Label>
              <Input
                id="telefon"
                value={form.telefon}
                onChange={(e) => setForm({ ...form, telefon: e.target.value })}
                placeholder="+998 90 123 45 67"
                required
              />
            </div>

            <div>
              <Label htmlFor="linzaTuri">Linza turi</Label>
              <Input
                id="linzaTuri"
                value={form.linzaTuri}
                onChange={(e) => setForm({ ...form, linzaTuri: e.target.value })}
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
          <h3 className="text-lg font-semibold">Ro'yxatlar</h3>
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
                <th className="px-4 py-2 text-left">Mijoz</th>
                <th className="px-4 py-2 text-left">OD/OS</th>
                <th className="px-4 py-2 text-left">Telefon</th>
                <th className="px-4 py-2 text-left">Linza turi</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {filteredRoyxatlar.map((r) => (
                <tr key={r.id} className="border-b border-border">
                  <td className="px-4 py-2">{r.sana}</td>
                  <td className="px-4 py-2">{r.mijoz}</td>
                  <td className="px-4 py-2">{r.od} / {r.os}</td>
                  <td className="px-4 py-2">{r.telefon}</td>
                  <td className="px-4 py-2">{r.linzaTuri}</td>
                  <td className="px-4 py-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(r.id)}
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

export default LinzaRoyxati;
