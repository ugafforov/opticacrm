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
import { Trash2, Search, Pencil, Download } from "lucide-react";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EditDialog } from "@/components/EditDialog";
import { formatUzbekistanDate, getUzbekistanISOString } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface LinzaSotish {
  id: string;
  sana: string;
  kliyent: string;
  linzaTuri: string;
  summa: number;
}

const LinzaSotuvi = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [sotuvlar, setSotuvlar] = useState<LinzaSotish[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    kliyent: "",
    linzaTuri: "",
    summa: "",
  });
  const [editingItem, setEditingItem] = useState<LinzaSotish | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadSotuvlar();
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('linza-sotuvlari-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'linza_sotuvlari',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          loadSotuvlar();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const loadSotuvlar = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("linza_sotuvlari")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const mapped = data?.map((item) => ({
        id: item.id,
        sana: item.sana,
        kliyent: item.kliyent,
        linzaTuri: item.linza_turi,
        summa: item.summa,
      })) || [];

      setSotuvlar(mapped);
    } catch (error: any) {
      console.error("Error loading linza sotuvlari:", error);
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

    try {
      const { error } = await supabase
        .from("linza_sotuvlari")
        .insert({
          user_id: user.id,
          sana: formatUzbekistanDate(),
          kliyent: form.kliyent,
          linza_turi: form.linzaTuri,
          summa: parseFloat(form.summa),
        });

      if (error) throw error;

      await loadSotuvlar();

      setForm({
        kliyent: "",
        linzaTuri: "",
        summa: "",
      });

      toast.success(t("lensSale.addSuccess"));
    } catch (error: any) {
      console.error("Error adding linza sotuvi:", error);
      toast.error(t("common.error"));
    }
  };

  const handleDelete = async () => {
    if (!deleteId || !user) return;
    
    const itemToDelete = sotuvlar.find((s) => s.id === deleteId);
    if (!itemToDelete) return;

    try {
      const { error: trashError } = await supabase.from("chiqindilar").insert([{
        user_id: user.id,
        item_id: deleteId,
        type: "linzaSotuvlari",
        data: itemToDelete as any,
        deleted_at: getUzbekistanISOString(),
      }]);

      const { error } = await supabase
        .from("linza_sotuvlari")
        .delete()
        .eq("id", deleteId);

      if (error) throw error;

      await loadSotuvlar();
      setDeleteId(null);
      toast.success(t("lensSale.deleteSuccess"));
    } catch (error: any) {
      console.error("Error deleting linza sotuvi:", error);
      toast.error(t("common.error"));
    }
  };

  const handleEdit = (item: LinzaSotish) => {
    setEditingItem(item);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !user) return;

    try {
      const { error } = await supabase
        .from("linza_sotuvlari")
        .update({
          kliyent: editingItem.kliyent,
          linza_turi: editingItem.linzaTuri,
          summa: editingItem.summa,
        })
        .eq("id", editingItem.id);

      if (error) throw error;

      await loadSotuvlar();
      setEditingItem(null);
      toast.success(t("common.updateSuccess"));
    } catch (error: any) {
      console.error("Error updating linza sotuvi:", error);
      toast.error(t("common.error"));
    }
  };

  const filteredSotuvlar = sotuvlar.filter((s) => {
    const query = searchQuery.toLowerCase();
    return (
      s.kliyent.toLowerCase().includes(query) ||
      s.sana.includes(query)
    );
  });

  const totalSum = sotuvlar.reduce((sum, s) => sum + s.summa, 0);

  const exportToExcel = () => {
    const data = filteredSotuvlar.map((s) => ({
      Sana: s.sana,
      Kliyent: s.kliyent,
      "Linza turi": s.linzaTuri,
      Summa: s.summa,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Linza Sotuvi");
    XLSX.writeFile(wb, `Linza_Sotuvi_${formatUzbekistanDate()}.xlsx`);
    toast.success("Excel fayl yuklab olindi");
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Linza Sotuvi", 14, 15);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Sana: ${formatUzbekistanDate()}`, 14, 22);
    doc.text(`Jami summa: ${totalSum.toLocaleString()} so'm`, 14, 28);

    const tableData = filteredSotuvlar.map((s) => [
      s.sana,
      s.kliyent,
      s.linzaTuri,
      s.summa.toLocaleString(),
    ]);

    autoTable(doc, {
      startY: 35,
      head: [['Sana', 'Kliyent', 'Linza turi', 'Summa']],
      body: tableData,
      styles: { font: 'helvetica', fontSize: 9 },
      headStyles: { fillColor: [66, 66, 66] },
    });

    doc.save(`Linza_Sotuvi_${formatUzbekistanDate()}.pdf`);
    toast.success("PDF fayl yuklab olindi");
  };

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
        <div className="flex flex-col gap-4 mb-4">
          <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
            <h3 className="text-lg font-semibold">{t("lensSale.list")}</h3>
            <div className="text-lg font-bold text-primary">
              {t("orders.total")}: {totalSum.toLocaleString()} {t("common.sum")}
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <div className="relative flex-1 sm:max-w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder={t("lensSale.search")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={exportToExcel}
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                Excel
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={exportToPDF}
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                PDF
              </Button>
            </div>
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
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(s)}
                        className="hover:bg-secondary"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteId(s.id)}
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
            <Label htmlFor="edit-kliyent">{t("lensSale.client")}</Label>
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
            <Label htmlFor="edit-linzaTuri">{t("lensSale.type")}</Label>
            <Select
              value={editingItem?.linzaTuri || ""}
              onValueChange={(value) =>
                setEditingItem(
                  editingItem ? { ...editingItem, linzaTuri: value } : null
                )
              }
            >
              <SelectTrigger>
                <SelectValue />
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
            <Label htmlFor="edit-summa">{t("lensSale.amount")} ({t("common.sum")})</Label>
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

export default LinzaSotuvi;
