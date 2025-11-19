import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Trash2, Search, Edit } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EditDialog } from "@/components/EditDialog";
import { formatUzbekistanDate, getUzbekistanISOString } from "@/lib/utils";

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
  const [royxatlar, setRoyxatlar] = useState<LinzaRoyxat[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingItem, setEditingItem] = useState<LinzaRoyxat | null>(null);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, itemId: "" });
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
      sana: formatUzbekistanDate(),
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

    toast.success(t("lens.addSuccess"));
  };

  const handleDelete = (id: string) => {
    const itemToDelete = royxatlar.find((r) => r.id === id);
    if (!itemToDelete) return;

    const trash = JSON.parse(localStorage.getItem("trash") || "[]");
    trash.push({
      id: Date.now().toString(),
      type: "linzaRoyxatlari",
      data: itemToDelete,
      deletedAt: getUzbekistanISOString(),
    });
    localStorage.setItem("trash", JSON.stringify(trash));

    saveRoyxatlar(royxatlar.filter((r) => r.id !== id));
    toast.success(t("lens.deleteSuccess"));
    setConfirmDialog({ open: false, itemId: "" });
  };

  const handleEdit = (item: LinzaRoyxat) => {
    setEditingItem(item);
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    const updatedRoyxatlar = royxatlar.map((r) =>
      r.id === editingItem.id ? { ...editingItem } : r
    );
    saveRoyxatlar(updatedRoyxatlar);
    setEditingItem(null);
    toast.success(t("edit.success"));
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
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  +998
                </span>
                <Input
                  id="telefon"
                  value={form.telefon}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^\d]/g, "");
                    if (value.length <= 9) {
                      setForm({ ...form, telefon: value });
                    }
                  }}
                  placeholder="90 123 45 67"
                  className="pl-14"
                  required
                />
              </div>
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
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
          <h3 className="text-lg font-semibold">{t("lens.list")}</h3>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder={t("lens.search")}
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
                  <td className="px-4 py-2">+998 {r.telefon}</td>
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
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                +998
              </span>
              <Input
                id="edit-telefon"
                value={editingItem?.telefon || ""}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^\d]/g, "");
                  if (value.length <= 9 && editingItem) {
                    setEditingItem({ ...editingItem, telefon: value });
                  }
                }}
                placeholder="90 123 45 67"
                className="pl-14"
                required
              />
            </div>
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
