import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Trash2, Search, Edit, Download } from "lucide-react";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EditDialog } from "@/components/EditDialog";
import { formatUzbekistanDate, getUzbekistanISOString, formatPhoneNumber } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

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
  const { t } = useLanguage();
  const { user } = useAuth();
  const [royxatlar, setRoyxatlar] = useState<LinzaRoyxat[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<LinzaRoyxat | null>(null);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, itemId: "" });
  const [form, setForm] = useState({
    mijoz: "",
    od: "",
    os: "",
    telefon: "+998 ",
    linzaTuri: "",
  });

  useEffect(() => {
    if (user) {
      loadRoyxatlar();
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('linza-royxatlari-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'linza_royxatlari',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          loadRoyxatlar();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const loadRoyxatlar = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("linza_royxatlari")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const mapped = data?.map((item) => ({
        id: item.id,
        sana: item.sana,
        mijoz: item.mijoz,
        od: item.od,
        os: item.os,
        telefon: item.telefon,
        linzaTuri: item.linza_turi,
      })) || [];

      setRoyxatlar(mapped);
    } catch (error: any) {
      console.error("Error loading linza royxatlari:", error);
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
        .from("linza_royxatlari")
        .insert({
          user_id: user.id,
          sana: formatUzbekistanDate(),
          mijoz: form.mijoz,
          od: form.od,
          os: form.os,
          telefon: form.telefon,
          linza_turi: form.linzaTuri,
        });

      if (error) throw error;

      await loadRoyxatlar();

      setForm({
        mijoz: "",
        od: "",
        os: "",
        telefon: "+998 ",
        linzaTuri: "",
      });

      toast.success(t("lens.addSuccess"));
    } catch (error: any) {
      console.error("Error adding linza royxat:", error);
      toast.error(t("common.error"));
    }
  };

  const handleDelete = async (id: string) => {
    if (!user) return;

    const itemToDelete = royxatlar.find((r) => r.id === id);
    if (!itemToDelete) return;

    try {
      const { error: trashError } = await supabase.from("chiqindilar").insert([{
        user_id: user.id,
        item_id: id,
        type: "linzaRoyxatlari",
        data: itemToDelete as any,
        deleted_at: getUzbekistanISOString(),
      }]);

      const { error } = await supabase
        .from("linza_royxatlari")
        .delete()
        .eq("id", id);

      if (error) throw error;

      await loadRoyxatlar();
      toast.success(t("lens.deleteSuccess"));
      setConfirmDialog({ open: false, itemId: "" });
    } catch (error: any) {
      console.error("Error deleting linza royxat:", error);
      toast.error(t("common.error"));
    }
  };

  const handleEdit = (item: LinzaRoyxat) => {
    setEditingItem(item);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !user) return;

    try {
      const { error } = await supabase
        .from("linza_royxatlari")
        .update({
          mijoz: editingItem.mijoz,
          od: editingItem.od,
          os: editingItem.os,
          telefon: editingItem.telefon,
          linza_turi: editingItem.linzaTuri,
        })
        .eq("id", editingItem.id);

      if (error) throw error;

      await loadRoyxatlar();
      setEditingItem(null);
      toast.success(t("edit.success"));
    } catch (error: any) {
      console.error("Error updating linza royxat:", error);
      toast.error(t("common.error"));
    }
  };

  const filteredRoyxatlar = royxatlar.filter((r) => {
    const query = searchQuery.toLowerCase();
    const searchDigits = searchQuery.replace(/\D/g, "");
    const phoneDigits = r.telefon.replace(/\D/g, "");
    
    return (
      r.mijoz.toLowerCase().includes(query) ||
      r.sana.includes(query) ||
      (searchDigits && phoneDigits.includes(searchDigits))
    );
  });

  const exportToExcel = () => {
    const data = filteredRoyxatlar.map((r) => ({
      Sana: r.sana,
      Mijoz: r.mijoz,
      "OD (o'ng)": r.od,
      "OS (chap)": r.os,
      Telefon: r.telefon,
      "Linza turi": r.linzaTuri,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Linza Royxati");
    XLSX.writeFile(wb, `Linza_Royxati_${formatUzbekistanDate()}.xlsx`);
    toast.success("Excel fayl yuklab olindi");
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Linza Ro'yxati", 14, 15);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Sana: ${formatUzbekistanDate()}`, 14, 22);

    const tableData = filteredRoyxatlar.map((r) => [
      r.sana,
      r.mijoz,
      `${r.od} / ${r.os}`,
      r.telefon,
      r.linzaTuri,
    ]);

    autoTable(doc, {
      startY: 28,
      head: [['Sana', 'Mijoz', 'OD/OS', 'Telefon', 'Linza turi']],
      body: tableData,
      styles: { font: 'helvetica', fontSize: 9 },
      headStyles: { fillColor: [66, 66, 66] },
    });

    doc.save(`Linza_Royxati_${formatUzbekistanDate()}.pdf`);
    toast.success("PDF fayl yuklab olindi");
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">{t("lens.title")}</h2>
        <p className="text-muted-foreground">{t("lens.subtitle")}</p>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="mijoz">{t("form.clientName")}</Label>
              <Input
                id="mijoz"
                value={form.mijoz}
                onChange={(e) => setForm({ ...form, mijoz: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="od">{t("form.rightEye")}</Label>
                <Input
                  id="od"
                  value={form.od}
                  onChange={(e) => setForm({ ...form, od: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="os">{t("form.leftEye")}</Label>
                <Input
                  id="os"
                  value={form.os}
                  onChange={(e) => setForm({ ...form, os: e.target.value })}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="telefon">{t("form.phone")}</Label>
              <Input
                id="telefon"
                type="tel"
                value={form.telefon}
                onChange={(e) => {
                  setForm({ ...form, telefon: formatPhoneNumber(e.target.value) });
                }}
                placeholder="+998 90 123 45 67"
                required
              />
            </div>

            <div>
              <Label htmlFor="linzaTuri">{t("form.lensTypeRegistry")}</Label>
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
              {t("lens.add")}
            </Button>
          </div>
        </form>
      </Card>

      <div className="bg-card rounded-lg p-4 border border-border">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
          <h3 className="text-lg font-semibold">{t("lensRegistry.list")}</h3>
          <div className="flex flex-col gap-2 items-end">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder={t("lensRegistry.search")}
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
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(r)}
                        className="text-primary hover:text-primary/90"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setConfirmDialog({ open: true, itemId: r.id })}
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
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}
        onConfirm={() => handleDelete(confirmDialog.itemId)}
        title={t("delete.confirm")}
        description={t("delete.confirmDesc")}
        confirmText={t("common.yes")}
        cancelText={t("common.no")}
      />

      <EditDialog
        open={editingItem !== null}
        onOpenChange={(open) => !open && setEditingItem(null)}
        title={t("edit.title")}
      >
        <form onSubmit={handleUpdate} className="space-y-4">
          <div>
            <Label htmlFor="edit-mijoz">{t("form.clientName")}</Label>
            <Input
              id="edit-mijoz"
              value={editingItem?.mijoz || ""}
              onChange={(e) =>
                setEditingItem(editingItem ? { ...editingItem, mijoz: e.target.value } : null)
              }
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="edit-od">{t("form.rightEye")}</Label>
              <Input
                id="edit-od"
                value={editingItem?.od || ""}
                onChange={(e) =>
                  setEditingItem(editingItem ? { ...editingItem, od: e.target.value } : null)
                }
                required
              />
            </div>
            <div>
              <Label htmlFor="edit-os">{t("form.leftEye")}</Label>
              <Input
                id="edit-os"
                value={editingItem?.os || ""}
                onChange={(e) =>
                  setEditingItem(editingItem ? { ...editingItem, os: e.target.value } : null)
                }
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="edit-telefon">{t("form.phone")}</Label>
            <Input
              id="edit-telefon"
              type="tel"
              value={editingItem?.telefon || "+998 "}
              onChange={(e) => {
                setEditingItem(editingItem ? { ...editingItem, telefon: formatPhoneNumber(e.target.value) } : null);
              }}
              placeholder="+998 90 123 45 67"
              required
            />
          </div>

          <div>
            <Label htmlFor="edit-linzaTuri">{t("form.lensTypeRegistry")}</Label>
            <Input
              id="edit-linzaTuri"
              value={editingItem?.linzaTuri || ""}
              onChange={(e) =>
                setEditingItem(editingItem ? { ...editingItem, linzaTuri: e.target.value } : null)
              }
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => setEditingItem(null)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" className="bg-primary hover:bg-primary/90">
              {t("common.save")}
            </Button>
          </div>
        </form>
      </EditDialog>
    </div>
  );
};

export default LinzaRoyxati;
