import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface TrashItem {
  id: string;
  type: string;
  data?: any;
  deletedAt: string;
  [key: string]: any;
}

const Chiqindilar = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [trashItems, setTrashItems] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    itemId: string;
    action: "restore" | "delete";
  }>({ open: false, itemId: "", action: "delete" });

  useEffect(() => {
    if (user) {
      loadTrashItems();
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('chiqindilar-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chiqindilar',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          loadTrashItems();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const loadTrashItems = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("chiqindilar")
        .select("*")
        .order("deleted_at", { ascending: false });

      if (error) throw error;

      const mapped = data?.map((item) => ({
        id: item.id,
        type: item.type,
        data: item.data,
        deletedAt: item.deleted_at,
        itemId: item.item_id,
      })) || [];

      setTrashItems(mapped);
    } catch (error: any) {
      console.error("Error loading trash:", error);
      toast.error(t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  const getItemData = (item: TrashItem) => {
    if (item.data) return item.data;
    const { id, type, deletedAt, ...rest } = item;
    return rest;
  };

  const handleRestore = async (item: TrashItem) => {
    if (!user) return;

    try {
      const data = getItemData(item);
      
      // Map type to correct table name
      const tableMap: Record<string, string> = {
        buyurtmalar: "buyurtmalar",
        tekshiruvlar: "tekshiruvlar",
        tayyorKozoynaklar: "tayyor_kozoynaklar",
        linzaSotuvlari: "linza_sotuvlari",
        linzaRoyxatlari: "linza_royxatlari",
      };

      const tableName = tableMap[item.type];
      if (!tableName) {
        toast.error("Noto'g'ri ma'lumot turi");
        return;
      }

      // Restore to original table
      const { error: restoreError } = await supabase
        .from(tableName as any)
        .insert(data);

      if (restoreError) throw restoreError;

      // Delete from trash
      const { error: deleteError } = await supabase
        .from("chiqindilar")
        .delete()
        .eq("id", item.id);

      if (deleteError) throw deleteError;

      await loadTrashItems();
      toast.success(t("trash.restored"));
      setConfirmDialog({ open: false, itemId: "", action: "delete" });
    } catch (error: any) {
      console.error("Error restoring item:", error);
      toast.error(t("common.error"));
    }
  };

  const handlePermanentDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("chiqindilar")
        .delete()
        .eq("id", id);

      if (error) throw error;

      await loadTrashItems();
      toast.success(t("trash.permanentDeleted"));
      setConfirmDialog({ open: false, itemId: "", action: "delete" });
    } catch (error: any) {
      console.error("Error deleting permanently:", error);
      toast.error(t("common.error"));
    }
  };

  const getItemLabel = (type: string) => {
    const labels: Record<string, string> = {
      buyurtmalar: t("trash.orders"),
      tekshiruvlar: t("trash.examinations"),
      tayyorKozoynaklar: t("trash.readyGlasses"),
      linzaSotuvlari: t("trash.lensSales"),
      linzaRoyxatlari: t("trash.lensLists"),
    };
    return labels[type] || type;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">{t("trash.title")}</h2>
        <p className="text-muted-foreground">{t("trash.subtitle")}</p>
      </div>

      {trashItems.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground text-lg">{t("trash.empty")}</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {trashItems.map((item) => {
            const data = getItemData(item);

            return (
              <Card key={item.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{getItemLabel(item.type)}</p>
                    <p className="text-sm text-muted-foreground">
                      {t("trash.deletedAt")}: {new Date(item.deletedAt).toLocaleString("uz-UZ", { timeZone: "Asia/Tashkent" })}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {(data && (data.mijoz || data.kliyent)) || t("trash.noName")}
                    </p>
                  </div>
                  <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setConfirmDialog({ open: true, itemId: item.id, action: "restore" })
                    }
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    {t("trash.restore")}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() =>
                      setConfirmDialog({ open: true, itemId: item.id, action: "delete" })
                    }
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {t("trash.deletePermanent")}
                  </Button>
                </div>
              </div>
            </Card>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}
        onConfirm={() => {
          const item = trashItems.find((t) => t.id === confirmDialog.itemId);
          if (!item) return;

          if (confirmDialog.action === "restore") {
            handleRestore(item);
          } else {
            handlePermanentDelete(confirmDialog.itemId);
          }
        }}
        title={
          confirmDialog.action === "restore"
            ? t("trash.confirmRestore")
            : t("trash.confirmDelete")
        }
        description={
          confirmDialog.action === "restore"
            ? t("trash.confirmRestoreDesc")
            : t("trash.confirmDeleteDesc")
        }
        confirmText={t("common.yes")}
        cancelText={t("common.no")}
      />
    </div>
  );
};

export default Chiqindilar;
