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
import { Trash2, Search, Pencil } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EditDialog } from "@/components/EditDialog";
import { formatUzbekistanDate, getUzbekistanISOString } from "@/lib/utils";

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
  const [editingItem, setEditingItem] = useState<TayyorKozoynak | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

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
      sana: formatUzbekistanDate(),
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

  const handleDelete = () => {
    if (!deleteId) return;
    
    const itemToDelete = kozoynaklar.find((k) => k.id === deleteId);
    if (!itemToDelete) return;

    // Move to trash
    const trash = JSON.parse(localStorage.getItem("chiqindilar") || "[]");
    trash.push({ ...itemToDelete, type: "tayyor-kozoynak", deletedAt: getUzbekistanISOString() });
    localStorage.setItem("chiqindilar", JSON.stringify(trash));

    // Remove from main list
    saveKozoynaklar(kozoynaklar.filter((k) => k.id !== deleteId));
    setDeleteId(null);
    toast.success(t("ready.deleteSuccess"));
  };

  const handleEdit = (item: TayyorKozoynak) => {
    setEditingItem(item);
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    const updated = kozoynaklar.map((k) =>
      k.id === editingItem.id ? editingItem : k
    );
    saveKozoynaklar(updated);
    setEditingItem(null);
    toast.success(t("common.updateSuccess"));
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
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(k)}
                        className="hover:bg-secondary"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteId(k.id)}
                        className="text-destructive hover:text-destructive/90"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={handleDelete}
        title={t("common.confirmDelete")}
        description={t("common.confirmDeleteDesc")}
      />

      <EditDialog
        open={!!editingItem}
        onOpenChange={(open) => !open && setEditingItem(null)}
        title={t("common.edit")}
      >
        <form onSubmit={handleUpdate} className="space-y-4">
          <div>
            <Label htmlFor="edit-kliyent">{t("ready.client")}</Label>
            <Input
              id="edit-kliyent"
              value={editingItem?.kliyent || ""}
              onChange={(e) =>
                setEditingItem(
                  editingItem ? { ...editingItem, kliyent: e.target.value } : null
                )
              }
              required
            />
          </div>

          <div>
            <Label htmlFor="edit-kozoynakTuri">{t("ready.type")}</Label>
            <Select
              value={editingItem?.kozoynakTuri || ""}
              onValueChange={(value) =>
                setEditingItem(
                  editingItem ? { ...editingItem, kozoynakTuri: value } : null
                )
              }
            >
              <SelectTrigger>
                <SelectValue />
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
            <Label htmlFor="edit-summa">{t("ready.amount")} ({t("common.sum")})</Label>
            <Input
              id="edit-summa"
              type="number"
              value={editingItem?.summa || ""}
              onChange={(e) =>
                setEditingItem(
                  editingItem
                    ? { ...editingItem, summa: parseFloat(e.target.value) }
                    : null
                )
              }
              required
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditingItem(null)}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit">{t("common.save")}</Button>
          </div>
        </form>
      </EditDialog>
    </div>
  );
};

export default TayyorKozoynaklar;
