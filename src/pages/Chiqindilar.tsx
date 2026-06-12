import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RotateCcw, Trash2, Loader2 } from "lucide-react";
import { useDataIntegrity } from "@/hooks/useDataIntegrity";
import { useOnlineGuard } from "@/hooks/useNetworkStatus";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatUzbekistanTimestamp } from "@/lib/utils";
import { logger } from "@/lib/logger";
import { fetchAllRows } from "@/lib/supabaseHelpers";
import { usePageMeta } from "@/hooks/usePageMeta";

interface TrashItem {
  id: string;
  type: string;
  data?: any;
  deletedAt: string;
  [key: string]: any;
}

const Chiqindilar = () => {
  const { t } = useLanguage();
  usePageMeta({ title: 'Chiqindi quti — Optika CRM', description: "O'chirilgan yozuvlarni qayta tiklash yoki butunlay o'chirish uchun chiqindi quti.", canonicalPath: '/chiqindilar' });
  const { user } = useAuth();
  const { withDuplicatePrevention, isOperationPending } = useDataIntegrity();
  const { isOnline, guardOperation } = useOnlineGuard();
  const [trashItems, setTrashItems] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    itemId: string;
    action: "restore" | "delete" | "clearAll";
  }>({ open: false, itemId: "", action: "delete" });

  useEffect(() => {
    if (user) {
      loadTrashItems();
    }
  }, [user]);

  const mapToLocal = (item: any): TrashItem => ({
    id: item.id,
    type: item.type,
    data: item.data,
    deletedAt: item.deleted_at,
    itemId: item.item_id,
  });

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('chiqindilar-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chiqindilar',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const newItem = mapToLocal(payload.new);
          setTrashItems(prev => {
            if (prev.some(t => t.id === newItem.id)) return prev;
            return [newItem, ...prev];
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'chiqindilar',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          setTrashItems(prev => prev.filter(t => t.id !== (payload.old as any).id));
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
      const data = await fetchAllRows("chiqindilar", user!.id, {
        orderBy: "deleted_at",
        ascending: false,
      });

      setTrashItems(data.map(mapToLocal));
    } catch (error: any) {
      logger.error("Error loading trash:", error);
      toast.error(t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  const getItemData = (item: TrashItem) => {
    // Always use the data field which contains the complete original record
    return item.data || {};
  };

  // Field mappings from camelCase to snake_case for each table type
  const fieldMappings: Record<string, Record<string, string>> = {
    buyurtmalar: {
      jamiSumma: 'jami_summa',
      oynaNarxi: 'oyna_narxi',
      opravaNarxi: 'oprava_narxi',
      opravaTuri: 'oprava_turi',
      oynaTuri: 'oyna_tури',
      tartibRaqam: 'tartib_raqam',
    },
    tekshiruvlar: {
      jamiSumma: 'jami_summa',
      tartibRaqam: 'tartib_raqam',
    },
    tayyorKozoynaklar: {
      kozoynakTuri: 'kozoynak_turi',
      tartibRaqam: 'tartib_raqam',
    },
    linzaSotuvlari: {
      linzaTuri: 'linza_turi',
      tartibRaqam: 'tartib_raqam',
    },
    linzaRoyxatlari: {
      linzaTuri: 'linza_turi',
      tartibRaqam: 'tartib_raqam',
    },
  };

  // Transform camelCase field names to snake_case
  const transformFieldNames = (data: any, type: string): any => {
    const mapping = fieldMappings[type] || {};
    const transformed: any = {};
    
    for (const [key, value] of Object.entries(data)) {
      const newKey = mapping[key] || key;
      transformed[newKey] = value;
    }
    
    return transformed;
  };

  const handleRestore = useCallback(async (item: TrashItem) => {
    if (!user || isProcessing) return;

    if (isOperationPending(`restore-${item.id}`)) {
      return;
    }

    await guardOperation(async () => {
      return await withDuplicatePrevention(`restore-${item.id}`, async () => {
        setIsProcessing(true);
        try {
          const originalData = getItemData(item);

          // Create a clean copy and remove frontend-only / conflicting fields
          const data: any = { ...originalData };
          delete data.id;
          delete data.createdAt;
          delete data.updatedAt;
          delete data.created_at;
          delete data.updated_at;
          delete data.user_id;

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
            toast.error(t("toast.invalidType"));
            return;
          }

          // Transform field names from camelCase to snake_case
          const transformedData = transformFieldNames(data, item.type);

          // Final data for restoration (ensure user_id for RLS)
          const restoreData = {
            ...transformedData,
            user_id: user.id,
          };

          const { error: restoreError } = await supabase
            .from(tableName as any)
            .insert(restoreData);

          if (restoreError) throw restoreError;

          const { error: deleteError } = await supabase
            .from("chiqindilar")
            .delete()
            .eq("id", item.id);

          if (deleteError) throw deleteError;

          // Darhol ma'lumotlarni yangilash
          await loadTrashItems();
          toast.success(t("trash.restored"));
          setConfirmDialog({ open: false, itemId: "", action: "delete" });
        } catch (error: any) {
          logger.error("Error restoring item:", error);
          toast.error(t("common.error"));
        } finally {
          setIsProcessing(false);
        }
      });
    }, t('network.operationRequiresConnection'));
  }, [user, isProcessing, isOperationPending, guardOperation, withDuplicatePrevention, t, getItemData, transformFieldNames, loadTrashItems]);

  const handlePermanentDelete = useCallback(async (id: string) => {
    if (isProcessing) return;

    if (isOperationPending(`delete-${id}`)) {
      return;
    }

    await guardOperation(async () => {
      return await withDuplicatePrevention(`delete-${id}`, async () => {
        setIsProcessing(true);
        try {
          const { error } = await supabase
            .from("chiqindilar")
            .delete()
            .eq("id", id);

          if (error) throw error;

          // Darhol ma'lumotlarni yangilash
          await loadTrashItems();
          toast.success(t("trash.permanentDeleted"));
          setConfirmDialog({ open: false, itemId: "", action: "delete" });
        } catch (error: any) {
          logger.error("Error deleting permanently:", error);
          toast.error(t("common.error"));
        } finally {
          setIsProcessing(false);
        }
      });
    }, t('network.operationRequiresConnection'));
  }, [isProcessing, isOperationPending, guardOperation, withDuplicatePrevention, t, loadTrashItems]);

  const handleClearAll = useCallback(async () => {
    if (!user || isProcessing) return;

    if (isOperationPending('clearAll')) {
      return;
    }

    await guardOperation(async () => {
      return await withDuplicatePrevention('clearAll', async () => {
        setIsProcessing(true);
        try {
          const { error } = await supabase
            .from("chiqindilar")
            .delete()
            .eq("user_id", user.id);

          if (error) throw error;

          // Darhol ma'lumotlarni yangilash
          await loadTrashItems();
          toast.success(t("trash.clearedAll"));
          setConfirmDialog({ open: false, itemId: "", action: "delete" });
        } catch (error: any) {
          logger.error("Error clearing trash:", error);
          toast.error(t("common.error"));
        } finally {
          setIsProcessing(false);
        }
      });
    }, t('network.operationRequiresConnection'));
  }, [user, isProcessing, isOperationPending, guardOperation, withDuplicatePrevention, t, loadTrashItems]);

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

  const getItemSumma = (item: TrashItem): number => {
    const data = getItemData(item);
    if (item.type === "buyurtmalar" || item.type === "tekshiruvlar") {
      return Number(data.jamiSumma) || Number(data.jami_summa) || 0;
    }
    return Number(data.summa) || 0;
  };

  const totalSumma = trashItems.reduce((acc, item) => acc + getItemSumma(item), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-2">{t("trash.title")}</h1>
          <p className="text-muted-foreground">{t("trash.subtitle")}</p>
        </div>
        {trashItems.length > 0 && (
          <Button
            variant="destructive"
            onClick={() =>
              setConfirmDialog({ open: true, itemId: "", action: "clearAll" })
            }
            disabled={isProcessing || !isOnline}
          >
            {isProcessing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {!isProcessing && <Trash2 className="w-4 h-4 mr-2" />}
            {t("trash.clearAll")}
          </Button>
        )}
      </div>

      {trashItems.length > 0 && (
        <Card className="p-4 bg-muted/50 border-dashed">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{t("trash.totalItems")}: <span className="font-semibold text-foreground">{trashItems.length}</span></p>
            <p className="text-sm text-muted-foreground">{t("trash.totalSum")}: <span className="font-semibold text-foreground">{totalSumma.toLocaleString("uz-UZ")} so'm</span></p>
          </div>
        </Card>
      )}

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
                      {t("trash.deletedAt")}: {formatUzbekistanTimestamp(item.deletedAt)}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {(data && (data.mijoz || data.kliyent)) || t("trash.noName")}
                      {getItemSumma(item) > 0 && (
                        <span className="ml-2 font-medium text-foreground">
                          — {getItemSumma(item).toLocaleString("uz-UZ")} so'm
                        </span>
                      )}
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
          if (confirmDialog.action === "clearAll") {
            handleClearAll();
          } else {
            const item = trashItems.find((t) => t.id === confirmDialog.itemId);
            if (!item) return;

            if (confirmDialog.action === "restore") {
              handleRestore(item);
            } else {
              handlePermanentDelete(confirmDialog.itemId);
            }
          }
        }}
        title={
          confirmDialog.action === "clearAll"
            ? t("trash.confirmClearAll")
            : confirmDialog.action === "restore"
            ? t("trash.confirmRestore")
            : t("trash.confirmDelete")
        }
        description={
          confirmDialog.action === "clearAll"
            ? t("trash.confirmClearAllDesc")
            : confirmDialog.action === "restore"
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
