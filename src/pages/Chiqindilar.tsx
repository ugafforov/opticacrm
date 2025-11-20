import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { ConfirmDialog } from "@/components/ConfirmDialog";

interface TrashItem {
  id: string;
  type: string;
  data?: any;
  deletedAt: string;
  [key: string]: any;
}

const Chiqindilar = () => {
  const { t } = useLanguage();
  const [trashItems, setTrashItems] = useState<TrashItem[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    itemId: string;
    action: "restore" | "delete";
  }>({ open: false, itemId: "", action: "delete" });

  useEffect(() => {
    const saved = localStorage.getItem("chiqindilar");
    if (saved) {
      try {
        const parsed: TrashItem[] = JSON.parse(saved);
        setTrashItems(parsed);
      } catch (error) {
        console.error("Failed to parse trash data", error);
      }
    }
  }, []);

  const saveTrash = (items: TrashItem[]) => {
    localStorage.setItem("chiqindilar", JSON.stringify(items));
    setTrashItems(items);
  };

  const getItemData = (item: TrashItem) => {
    if (item.data) return item.data;
    const { id, type, deletedAt, ...rest } = item;
    return rest;
  };

  const handleRestore = (item: TrashItem) => {
    const data = getItemData(item);
    const existingData = JSON.parse(localStorage.getItem(item.type) || "[]");
    existingData.push(data);
    localStorage.setItem(item.type, JSON.stringify(existingData));
    
    saveTrash(trashItems.filter((t) => t.id !== item.id));
    toast.success(t("trash.restored"));
    setConfirmDialog({ open: false, itemId: "", action: "delete" });
  };

  const handlePermanentDelete = (id: string) => {
    saveTrash(trashItems.filter((t) => t.id !== id));
    toast.success(t("trash.permanentDeleted"));
    setConfirmDialog({ open: false, itemId: "", action: "delete" });
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
          {trashItems.map((item) => (
            <Card key={item.id} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">{getItemLabel(item.type)}</p>
                  <p className="text-sm text-muted-foreground">
                    {t("trash.deletedAt")}: {new Date(item.deletedAt).toLocaleString("uz-UZ", { timeZone: "Asia/Tashkent" })}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {item.data.mijoz || item.data.kliyent || t("trash.noName")}
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
          ))}
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
