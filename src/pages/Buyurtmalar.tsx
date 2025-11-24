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
import { formatUzbekistanDate, getUzbekistanISOString, formatPhoneNumber } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Buyurtma {
  id: string;
  sana: string;
  mijoz: string;
  telefon?: string;
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
  const { user } = useAuth();
  const [buyurtmalar, setBuyurtmalar] = useState<Buyurtma[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    mijoz: "",
    telefon: "+998 ",
    od: "",
    os: "",
    oynaTuri: "",
    oynaNarxi: "",
    opravaNarxi: "",
    opravaTuri: "",
  });
  const [editingItem, setEditingItem] = useState<Buyurtma | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadBuyurtmalar();
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('buyurtmalar-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'buyurtmalar',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          loadBuyurtmalar();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const loadBuyurtmalar = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("buyurtmalar")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const mapped = data?.map((item) => ({
        id: item.id,
        sana: item.sana,
        mijoz: item.mijoz,
        telefon: item.telefon,
        od: item.od,
        os: item.os,
        oynaTuri: item.oyna_tури,
        oynaNarxi: item.oyna_narxi,
        opravaNarxi: item.oprava_narxi,
        opravaTuri: item.oprava_turi,
        jamiSumma: item.jami_summa,
      })) || [];

      setBuyurtmalar(mapped);
    } catch (error: any) {
      toast.error("Ma'lumotlarni yuklashda xatolik yuz berdi");
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
    
    const jamiSumma = (parseFloat(form.oynaNarxi) || 0) + (parseFloat(form.opravaNarxi) || 0);
    
    try {
      const { error } = await supabase
        .from("buyurtmalar")
        .insert({
          user_id: user.id,
          sana: formatUzbekistanDate(),
          mijoz: form.mijoz,
          telefon: form.telefon,
          od: form.od,
          os: form.os,
          oyna_tури: form.oynaTuri,
          oyna_narxi: parseFloat(form.oynaNarxi) || 0,
          oprava_narxi: parseFloat(form.opravaNarxi) || 0,
          oprava_turi: form.opravaTuri,
          jami_summa: jamiSumma,
        });

      if (error) throw error;

      await loadBuyurtmalar();
      
      setForm({
        mijoz: "",
        telefon: "+998 ",
        od: "",
        os: "",
        oynaTuri: "",
        oynaNarxi: "",
        opravaNarxi: "",
        opravaTuri: "",
      });
      
      toast.success(t("orders.addSuccess"));
    } catch (error: any) {
      toast.error("Ma'lumotni saqlashda xatolik yuz berdi");
    }
  };

  const handleDelete = async () => {
    if (!deleteId || !user) return;
    
    const itemToDelete = buyurtmalar.find((b) => b.id === deleteId);
    if (!itemToDelete) return;

    try {
      // Save to chiqindilar before deleting
      const { error: trashError } = await supabase.from("chiqindilar").insert([{
        user_id: user.id,
        item_id: deleteId,
        type: "buyurtmalar",
        data: itemToDelete as any,
        deleted_at: getUzbekistanISOString(),
      }]);

      // Delete the buyurtma
      const { error } = await supabase
        .from("buyurtmalar")
        .delete()
        .eq("id", deleteId);

      if (error) throw error;

      await loadBuyurtmalar();
      setDeleteId(null);
      toast.success(t("orders.deleteSuccess"));
    } catch (error: any) {
      toast.error("Ma'lumotni o'chirishda xatolik yuz berdi");
    }
  };

  const handleEdit = (item: Buyurtma) => {
    setEditingItem(item);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !user) return;

    try {
      const { error } = await supabase
        .from("buyurtmalar")
        .update({
          mijoz: editingItem.mijoz,
          telefon: editingItem.telefon,
          od: editingItem.od,
          os: editingItem.os,
          oyna_tури: editingItem.oynaTuri,
          oyna_narxi: editingItem.oynaNarxi,
          oprava_narxi: editingItem.opravaNarxi,
          oprava_turi: editingItem.opravaTuri,
          jami_summa: editingItem.jamiSumma,
        })
        .eq("id", editingItem.id);

      if (error) throw error;

      await loadBuyurtmalar();
      setEditingItem(null);
      toast.success(t("common.updateSuccess"));
    } catch (error: any) {
      toast.error("Ma'lumotni yangilashda xatolik yuz berdi");
    }
  };

  const filteredBuyurtmalar = buyurtmalar.filter((b) => {
    const query = searchQuery.toLowerCase();
    return (
      b.mijoz.toLowerCase().includes(query) ||
      b.sana.includes(query) ||
      (b.telefon && b.telefon.toLowerCase().includes(query))
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
              <Label htmlFor="mijoz">{t("form.clientName")}</Label>
              <Input
                id="mijoz"
                value={form.mijoz}
                onChange={(e) => setForm({ ...form, mijoz: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="telefon">Telefon raqami</Label>
              <Input
                id="telefon"
                type="tel"
                value={form.telefon}
                onChange={(e) => {
                  setForm({ ...form, telefon: formatPhoneNumber(e.target.value) });
                }}
                placeholder="+998 90 123 45 67"
              />
            </div>

            <div>
              <Label htmlFor="od">{t("form.rightEye")}</Label>
              <Input
                id="od"
                value={form.od}
                onChange={(e) => setForm({ ...form, od: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="os">{t("form.leftEye")}</Label>
              <Input
                id="os"
                value={form.os}
                onChange={(e) => setForm({ ...form, os: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="oynaTuri">{t("form.lensType")}</Label>
              <Select value={form.oynaTuri} onValueChange={(value) => setForm({ ...form, oynaTuri: value })}>
                <SelectTrigger>
                  <SelectValue placeholder={t("form.select")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3B1 jigarrang">{t("lens.3b1Brown")}</SelectItem>
                  <SelectItem value="3B1 qora">{t("lens.3b1Black")}</SelectItem>
                  <SelectItem value="4B1">{t("lens.4b1")}</SelectItem>
                  <SelectItem value="420">{t("lens.420")}</SelectItem>
                  <SelectItem value="SR">{t("lens.sr")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="oynaNarxi">{t("form.lensPrice")}</Label>
              <Input
                id="oynaNarxi"
                type="number"
                value={form.oynaNarxi}
                onChange={(e) => setForm({ ...form, oynaNarxi: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="opravaTuri">{t("form.frameType")}</Label>
              <Select value={form.opravaTuri} onValueChange={(value) => setForm({ ...form, opravaTuri: value })}>
                <SelectTrigger>
                  <SelectValue placeholder={t("form.select")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dumaloq">{t("frame.round")}</SelectItem>
                  <SelectItem value="fabritsio">{t("frame.fabritsio")}</SelectItem>
                  <SelectItem value="alaniye">{t("frame.alaniye")}</SelectItem>
                  <SelectItem value="titanik">{t("frame.titanik")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="opravaNarxi">{t("form.framePrice")}</Label>
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
        <div className="flex flex-col gap-4 mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <h3 className="text-lg font-semibold">{t("orders.list")}</h3>
            <div className="text-lg font-bold text-primary">
              {t("orders.total")}: {totalSum.toLocaleString()} {t("common.sum")}
            </div>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder={t("orders.search")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <table className="w-full min-w-[640px]">
            <thead className="bg-secondary text-secondary-foreground">
              <tr>
                <th className="px-2 sm:px-4 py-2 text-left text-sm">{t("common.date")}</th>
                <th className="px-2 sm:px-4 py-2 text-left text-sm">{t("orders.client")}</th>
                <th className="px-2 sm:px-4 py-2 text-left text-sm">Telefon</th>
                <th className="px-2 sm:px-4 py-2 text-left text-sm">OD/OS</th>
                <th className="px-2 sm:px-4 py-2 text-left text-sm">{t("form.lensType")}</th>
                <th className="px-2 sm:px-4 py-2 text-left text-sm">{t("form.frameType")}</th>
                <th className="px-2 sm:px-4 py-2 text-right text-sm">{t("orders.totalAmount")}</th>
                <th className="px-2 sm:px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {filteredBuyurtmalar.map((b) => (
                <tr key={b.id} className="border-b border-border hover:bg-muted/50">
                  <td className="px-2 sm:px-4 py-2 text-sm">{b.sana}</td>
                  <td className="px-2 sm:px-4 py-2 text-sm">{b.mijoz}</td>
                  <td className="px-2 sm:px-4 py-2 text-sm whitespace-nowrap">{b.telefon || "-"}</td>
                  <td className="px-2 sm:px-4 py-2 text-sm whitespace-nowrap">{b.od} / {b.os}</td>
                  <td className="px-2 sm:px-4 py-2 text-sm">{b.oynaTuri}</td>
                  <td className="px-2 sm:px-4 py-2 text-sm">{b.opravaTuri}</td>
                  <td className="px-2 sm:px-4 py-2 text-right font-semibold text-sm whitespace-nowrap">{b.jamiSumma.toLocaleString()}</td>
                  <td className="px-2 sm:px-4 py-2">
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(b)}
                        className="hover:bg-secondary h-8 w-8 p-0"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteId(b.id)}
                        className="text-destructive hover:text-destructive/90 h-8 w-8 p-0"
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
            <Label htmlFor="edit-mijoz">{t("orders.client")}</Label>
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

          <div>
            <Label htmlFor="edit-telefon">Telefon raqami</Label>
            <Input
              id="edit-telefon"
              type="tel"
              value={editingItem?.telefon || "+998 "}
              onChange={(e) => {
                setEditingItem(
                  editingItem ? { ...editingItem, telefon: formatPhoneNumber(e.target.value) } : null
                );
              }}
              placeholder="+998 90 123 45 67"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="edit-od">OD (o'ng)</Label>
              <Input
                id="edit-od"
                value={editingItem?.od || ""}
                onChange={(e) =>
                  setEditingItem(
                    editingItem ? { ...editingItem, od: e.target.value } : null
                  )
                }
              />
            </div>
            <div>
              <Label htmlFor="edit-os">OS (chap)</Label>
              <Input
                id="edit-os"
                value={editingItem?.os || ""}
                onChange={(e) =>
                  setEditingItem(
                    editingItem ? { ...editingItem, os: e.target.value } : null
                  )
                }
              />
            </div>
          </div>

          <div>
            <Label htmlFor="edit-oynaTuri">{t("orders.lensType")}</Label>
            <Select
              value={editingItem?.oynaTuri || ""}
              onValueChange={(value) =>
                setEditingItem(
                  editingItem ? { ...editingItem, oynaTuri: value } : null
                )
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="zreniya">{t("orders.vision")}</SelectItem>
                <SelectItem value="quyoshdan-himoya">{t("orders.sunProtection")}</SelectItem>
                <SelectItem value="hameleon">{t("orders.chameleon")}</SelectItem>
                <SelectItem value="kompyuter">{t("orders.computer")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="edit-oynaNarxi">{t("orders.lensPrice")} ({t("common.sum")})</Label>
            <Input
              id="edit-oynaNarxi"
              type="number"
              value={editingItem?.oynaNarxi || ""}
              onChange={(e) =>
                setEditingItem(
                  editingItem
                    ? { ...editingItem, oynaNarxi: parseFloat(e.target.value), jamiSumma: parseFloat(e.target.value) + (editingItem.opravaNarxi || 0) }
                    : null
                )
              }
              required
            />
          </div>

          <div>
            <Label htmlFor="edit-opravaTuri">{t("orders.frameType")}</Label>
            <Input
              id="edit-opravaTuri"
              value={editingItem?.opravaTuri || ""}
              onChange={(e) =>
                setEditingItem(
                  editingItem ? { ...editingItem, opravaTuri: e.target.value } : null
                )
              }
            />
          </div>

          <div>
            <Label htmlFor="edit-opravaNarxi">{t("orders.framePrice")} ({t("common.sum")})</Label>
            <Input
              id="edit-opravaNarxi"
              type="number"
              value={editingItem?.opravaNarxi || ""}
              onChange={(e) =>
                setEditingItem(
                  editingItem
                    ? { ...editingItem, opravaNarxi: parseFloat(e.target.value), jamiSumma: (editingItem.oynaNarxi || 0) + parseFloat(e.target.value) }
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

export default Buyurtmalar;
