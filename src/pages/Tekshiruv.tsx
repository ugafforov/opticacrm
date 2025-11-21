import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Trash2, Search, Pencil } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EditDialog } from "@/components/EditDialog";
import { formatUzbekistanDate, getUzbekistanISOString } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Tekshiruv {
  id: string;
  sana: string;
  tartibRaqam: number;
  mijoz: string;
  refraksiyametriya: boolean;
  tanometriya: boolean;
  jamiSumma: number;
}

const Tekshiruv = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [tekshiruvlar, setTekshiruvlar] = useState<Tekshiruv[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    mijoz: "",
    refraksiyametriya: false,
    tanometriya: false,
  });
  const [editingItem, setEditingItem] = useState<Tekshiruv | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadTekshiruvlar();
    }
  }, [user]);

  const loadTekshiruvlar = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("tekshiruvlar")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const mapped = data?.map((item) => ({
        id: item.id,
        sana: item.sana,
        tartibRaqam: item.tartib_raqam,
        mijoz: item.mijoz,
        refraksiyametriya: item.refraksiyametriya,
        tanometriya: item.tanometriya,
        jamiSumma: item.jami_summa,
      })) || [];

      setTekshiruvlar(mapped);
    } catch (error: any) {
      console.error("Error loading tekshiruvlar:", error);
      toast.error(t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error("Iltimos, tizimga kiring");
      return;
    }

    let summa = 0;
    if (form.refraksiyametriya) summa += 50000;
    if (form.tanometriya) summa += 15000;

    try {
      const { error } = await supabase
        .from("tekshiruvlar")
        .insert({
          user_id: user.id,
          sana: formatUzbekistanDate(),
          tartib_raqam: tekshiruvlar.length + 1,
          mijoz: form.mijoz,
          refraksiyametriya: form.refraksiyametriya,
          tanometriya: form.tanometriya,
          jami_summa: summa,
        });

      if (error) throw error;

      await loadTekshiruvlar();

      setForm({
        mijoz: "",
        refraksiyametriya: false,
        tanometriya: false,
      });

      toast.success(t("exam.addSuccess"));
    } catch (error: any) {
      console.error("Error adding tekshiruv:", error);
      toast.error(t("common.error"));
    }
  };

  const handleDelete = async () => {
    if (!deleteId || !user) return;
    
    const itemToDelete = tekshiruvlar.find((t) => t.id === deleteId);
    if (!itemToDelete) return;

    try {
      const { error: trashError } = await supabase.from("chiqindilar").insert([{
        user_id: user.id,
        item_id: deleteId,
        type: "tekshiruvlar",
        data: itemToDelete as any,
        deleted_at: getUzbekistanISOString(),
      }]);

      const { error } = await supabase
        .from("tekshiruvlar")
        .delete()
        .eq("id", deleteId);

      if (error) throw error;

      await loadTekshiruvlar();
      setDeleteId(null);
      toast.success(t("exam.deleteSuccess"));
    } catch (error: any) {
      console.error("Error deleting tekshiruv:", error);
      toast.error(t("common.error"));
    }
  };

  const handleEdit = (item: Tekshiruv) => {
    setEditingItem(item);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !user) return;

    // Recalculate sum based on selected services
    let summa = 0;
    if (editingItem.refraksiyametriya) summa += 50000;
    if (editingItem.tanometriya) summa += 15000;

    try {
      const { error } = await supabase
        .from("tekshiruvlar")
        .update({
          mijoz: editingItem.mijoz,
          refraksiyametriya: editingItem.refraksiyametriya,
          tanometriya: editingItem.tanometriya,
          jami_summa: summa,
        })
        .eq("id", editingItem.id);

      if (error) throw error;

      await loadTekshiruvlar();
      setEditingItem(null);
      toast.success(t("common.updateSuccess"));
    } catch (error: any) {
      console.error("Error updating tekshiruv:", error);
      toast.error(t("common.error"));
    }
  };

  const filteredTekshiruvlar = tekshiruvlar.filter((t) => {
    const query = searchQuery.toLowerCase();
    return (
      t.mijoz.toLowerCase().includes(query) ||
      t.sana.includes(query)
    );
  });

  const totalSum = tekshiruvlar.reduce((sum, t) => sum + t.jamiSumma, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">{t("exam.title")}</h2>
        <p className="text-muted-foreground">{t("exam.subtitle")}</p>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="mijoz">{t("exam.patient")}</Label>
            <Input
              id="mijoz"
              value={form.mijoz}
              onChange={(e) => setForm({ ...form, mijoz: e.target.value })}
              required
            />
          </div>

          <div className="space-y-3 border border-border rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="refraksiyametriya"
                checked={form.refraksiyametriya}
                onCheckedChange={(checked) =>
                  setForm({ ...form, refraksiyametriya: checked as boolean })
                }
              />
              <label
                htmlFor="refraksiyametriya"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {t("exam.refractometry")}
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="tanometriya"
                checked={form.tanometriya}
                onCheckedChange={(checked) =>
                  setForm({ ...form, tanometriya: checked as boolean })
                }
              />
              <label
                htmlFor="tanometriya"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {t("exam.tonometry")}
              </label>
            </div>
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-border">
            <div className="text-lg font-semibold">
              {t("orders.totalAmount")}:{" "}
              {((form.refraksiyametriya ? 50000 : 0) + (form.tanometriya ? 15000 : 0)).toLocaleString()}{" "}
              {t("common.sum")}
            </div>
            <Button type="submit" className="bg-primary hover:bg-primary/90">
              {t("exam.add")}
            </Button>
          </div>
        </form>
      </Card>

      <div className="bg-card rounded-lg p-4 border border-border">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
          <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
            <h3 className="text-lg font-semibold">Tekshiruvlar ro'yxati</h3>
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
                <th className="px-4 py-2 text-left">№</th>
                <th className="px-4 py-2 text-left">Sana</th>
                <th className="px-4 py-2 text-left">Mijoz</th>
                <th className="px-4 py-2 text-left">Tekshiruvlar</th>
                <th className="px-4 py-2 text-right">Summa</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {filteredTekshiruvlar.map((t) => (
                <tr key={t.id} className="border-b border-border">
                  <td className="px-4 py-2">{t.tartibRaqam}</td>
                  <td className="px-4 py-2">{t.sana}</td>
                  <td className="px-4 py-2">{t.mijoz}</td>
                  <td className="px-4 py-2">
                    {t.refraksiyametriya && "Refraksiyametriya"}
                    {t.refraksiyametriya && t.tanometriya && ", "}
                    {t.tanometriya && "Tanometriya"}
                  </td>
                  <td className="px-4 py-2 text-right font-semibold">
                    {t.jamiSumma.toLocaleString()}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(t)}
                        className="hover:bg-secondary"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteId(t.id)}
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
            <Label htmlFor="edit-mijoz">{t("exam.patient")}</Label>
            <Input
              id="edit-mijoz"
              value={editingItem?.mijoz || ""}
              onChange={(e) =>
                setEditingItem(
                  editingItem ? { ...editingItem, mijoz: e.target.value } : null
                )
              }
              required
            />
          </div>

          <div className="space-y-3 border border-border rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="edit-refraksiyametriya"
                checked={editingItem?.refraksiyametriya || false}
                onCheckedChange={(checked) =>
                  setEditingItem(
                    editingItem
                      ? { ...editingItem, refraksiyametriya: checked as boolean }
                      : null
                  )
                }
              />
              <label
                htmlFor="edit-refraksiyametriya"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {t("exam.refractometry")}
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="edit-tanometriya"
                checked={editingItem?.tanometriya || false}
                onCheckedChange={(checked) =>
                  setEditingItem(
                    editingItem
                      ? { ...editingItem, tanometriya: checked as boolean }
                      : null
                  )
                }
              />
              <label
                htmlFor="edit-tanometriya"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {t("exam.tonometry")}
              </label>
            </div>
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

export default Tekshiruv;
