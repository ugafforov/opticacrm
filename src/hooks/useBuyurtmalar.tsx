import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatUzbekistanDate, getUzbekistanISOString } from "@/lib/utils";
import { BuyurtmaFormData } from "@/components/buyurtmalar/BuyurtmalarForm";
import { safeAdd, safeParsePriceToNumber } from "@/lib/safeCalculations";
import { withRetry } from "@/lib/retryUtils";
import { useDataIntegrity } from "@/hooks/useDataIntegrity";
import { useOnlineGuard } from "@/hooks/useNetworkStatus";

export interface Buyurtma {
  id: string;
  sana: string;
  createdAt: string;
  tartibRaqam: number;
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

// Map database row to local format
const mapToLocal = (item: any): Buyurtma => ({
  id: item.id,
  sana: item.sana,
  createdAt: item.created_at,
  tartibRaqam: item.tartib_raqam,
  mijoz: item.mijoz,
  telefon: item.telefon,
  od: item.od,
  os: item.os,
  oynaTuri: item.oyna_tури,
  oynaNarxi: Number(item.oyna_narxi) || 0,
  opravaNarxi: Number(item.oprava_narxi) || 0,
  opravaTuri: item.oprava_turi,
  jamiSumma: Number(item.jami_summa) || 0,
});

export const useBuyurtmalar = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [buyurtmalar, setBuyurtmalar] = useState<Buyurtma[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isLoadingRef = useRef(false);
  const hasLoadedRef = useRef(false);
  const retryCountRef = useRef(0);
  const { withDuplicatePrevention, isOperationPending } = useDataIntegrity();
  const { isOnline, guardOperation } = useOnlineGuard();

  // Load buyurtmalar from database - only once per session
  const loadBuyurtmalar = useCallback(async (force = false) => {
    if (!user || isLoadingRef.current) return;
    
    // Skip if already loaded and not forced
    if (hasLoadedRef.current && !force) {
      setLoading(false);
      return;
    }
    
    isLoadingRef.current = true;
    try {
      setLoading(true);
      
      const data = await withRetry(async () => {
        const { data, error } = await supabase
          .from("buyurtmalar")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;
        return data;
      }, { maxRetries: 3 });

      setBuyurtmalar(data?.map(mapToLocal) || []);
      hasLoadedRef.current = true;
      retryCountRef.current = 0;
    } catch (error: any) {
      console.error("Error loading buyurtmalar:", error);
      if (retryCountRef.current < 2) {
        retryCountRef.current++;
        toast.error(t("toast.loadError") + ` (${retryCountRef.current}/3)`);
      }
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadBuyurtmalar();
    }
  }, [user, loadBuyurtmalar]);

  // Real-time subscription with incremental updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('buyurtmalar-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'buyurtmalar',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const newItem = mapToLocal(payload.new);
          setBuyurtmalar(prev => {
            // Check if item already exists (from optimistic update)
            if (prev.some(b => b.id === newItem.id)) {
              return prev;
            }
            // Also check for temp IDs that might match
            const withoutTemp = prev.filter(b => !b.id.startsWith('temp-'));
            return [newItem, ...withoutTemp];
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'buyurtmalar',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const updatedItem = mapToLocal(payload.new);
          setBuyurtmalar(prev => 
            prev.map(b => b.id === updatedItem.id ? updatedItem : b)
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'buyurtmalar',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          setBuyurtmalar(prev => 
            prev.filter(b => b.id !== (payload.old as any).id)
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Optimistic create with background sync and duplicate prevention
  const createBuyurtma = useCallback(async (formData: BuyurtmaFormData, selectedDate: Date) => {
    if (!user) {
      toast.error(t("toast.loginRequired"));
      return;
    }

    // Check if already submitting
    if (isSubmitting || isOperationPending('buyurtma-add')) {
      return;
    }

    // Guard against offline operations
    await guardOperation(async () => {
      return await withDuplicatePrevention('buyurtma-add', async () => {
        setIsSubmitting(true);

        const oynaNarxi = safeParsePriceToNumber(formData.oynaNarxi);
        const opravaNarxi = safeParsePriceToNumber(formData.opravaNarxi);
        const jamiSumma = safeAdd(oynaNarxi, opravaNarxi);

        // Generate temp ID for optimistic update
        const tempId = `temp-${Date.now()}`;
        const sana = formatUzbekistanDate(selectedDate);

        // Optimistic item
        const optimisticItem: Buyurtma = {
          id: tempId,
          sana,
          createdAt: new Date().toISOString(),
          tartibRaqam: buyurtmalar.length + 1,
          mijoz: formData.mijoz.trim(),
          telefon: formData.telefon?.trim() || undefined,
          od: formData.od.trim(),
          os: formData.os.trim(),
          oynaTuri: formData.oynaTuri,
          oynaNarxi,
          opravaNarxi,
          opravaTuri: formData.opravaTuri,
          jamiSumma,
        };

        // Immediately add to UI
        setBuyurtmalar(prev => [optimisticItem, ...prev]);
        toast.success(t("orders.addSuccess"));

        try {
          // Get next tartibRaqam
          const maxData = await withRetry(async () => {
            const { data, error } = await supabase
              .from("buyurtmalar")
              .select("tartib_raqam")
              .eq("user_id", user.id)
              .order("tartib_raqam", { ascending: false })
              .limit(1)
              .maybeSingle();

            if (error) throw error;
            return data;
          });

          const nextTartibRaqam = maxData ? maxData.tartib_raqam + 1 : 1;

          // Insert to database
          const result = await withRetry(async () => {
            const { data, error } = await supabase
              .from("buyurtmalar")
              .insert({
                user_id: user.id,
                sana,
                tartib_raqam: nextTartibRaqam,
                mijoz: formData.mijoz.trim(),
                telefon: formData.telefon?.trim() || null,
                od: formData.od.trim(),
                os: formData.os.trim(),
                oyna_tури: formData.oynaTuri,
                oyna_narxi: oynaNarxi,
                oprava_narxi: opravaNarxi,
                oprava_turi: formData.opravaTuri,
                jami_summa: jamiSumma,
              })
              .select()
              .single();

            if (error) throw error;
            return data;
          });

          // Replace temp ID with real ID
          setBuyurtmalar(prev => 
            prev.map(b => b.id === tempId ? mapToLocal(result) : b)
          );
          return true;
        } catch (error: any) {
          console.error("Error creating buyurtma:", error);
          // Rollback optimistic update
          setBuyurtmalar(prev => prev.filter(b => b.id !== tempId));
          toast.error(t("toast.saveError"));
          return false;
        } finally {
          setIsSubmitting(false);
        }
      });
    }, t('network.operationRequiresConnection') || 'Bu amal internet aloqasini talab qiladi');
  }, [user, t, buyurtmalar.length, isSubmitting, guardOperation, withDuplicatePrevention, isOperationPending]);

  // Optimistic update with protection
  const updateBuyurtma = useCallback(async (item: Buyurtma) => {
    if (!user) return;

    if (isOperationPending(`buyurtma-update-${item.id}`)) {
      return;
    }

    await guardOperation(async () => {
      return await withDuplicatePrevention(`buyurtma-update-${item.id}`, async () => {
        const previousItem = buyurtmalar.find(b => b.id === item.id);
        
        // Optimistic update
        setBuyurtmalar(prev => 
          prev.map(b => b.id === item.id ? item : b)
        );

        try {
          await withRetry(async () => {
            const { error } = await supabase
              .from("buyurtmalar")
              .update({
                sana: item.sana,
                mijoz: item.mijoz.trim(),
                telefon: item.telefon?.trim() || null,
                od: item.od.trim(),
                os: item.os.trim(),
                oyna_tури: item.oynaTuri,
                oyna_narxi: Number(item.oynaNarxi) || 0,
                oprava_narxi: Number(item.opravaNarxi) || 0,
                oprava_turi: item.opravaTuri,
                jami_summa: Number(item.jamiSumma) || 0,
              })
              .eq("id", item.id);

            if (error) throw error;
          });

          toast.success(t("common.updateSuccess"));
        } catch (error: any) {
          console.error("Error updating buyurtma:", error);
          // Rollback
          if (previousItem) {
            setBuyurtmalar(prev => 
              prev.map(b => b.id === item.id ? previousItem : b)
            );
          }
          toast.error(t("toast.updateError"));
        }
      });
    }, t('network.operationRequiresConnection'));
  }, [user, t, buyurtmalar, isOperationPending, guardOperation, withDuplicatePrevention]);

  // Optimistic delete with protection
  const deleteBuyurtma = useCallback(async (id: string) => {
    if (!user) return;

    if (isOperationPending(`buyurtma-delete-${id}`)) {
      return;
    }

    await guardOperation(async () => {
      return await withDuplicatePrevention(`buyurtma-delete-${id}`, async () => {
        const itemToDelete = buyurtmalar.find((b) => b.id === id);
        if (!itemToDelete) return;

        // Optimistic delete
        setBuyurtmalar(prev => prev.filter(b => b.id !== id));

        try {
          // Backup to trash
          await withRetry(async () => {
            const { error } = await supabase.from("chiqindilar").insert([{
              user_id: user.id,
              item_id: id,
              type: "buyurtmalar",
              data: itemToDelete as any,
              deleted_at: getUzbekistanISOString(),
            }]);
            if (error) throw error;
          });

          // Delete from table
          await withRetry(async () => {
            const { error } = await supabase
              .from("buyurtmalar")
              .delete()
              .eq("id", id);

            if (error) throw error;
          });

          toast.success(t("orders.deleteSuccess"));
        } catch (error: any) {
          console.error("Error deleting buyurtma:", error);
          // Rollback
          setBuyurtmalar(prev => [itemToDelete, ...prev]);
          toast.error(t("toast.deleteError"));
        }
      });
    }, t('network.operationRequiresConnection'));
  }, [user, t, buyurtmalar, isOperationPending, guardOperation, withDuplicatePrevention]);

  return {
    buyurtmalar,
    loading,
    isSubmitting,
    isOnline,
    createBuyurtma,
    updateBuyurtma,
    deleteBuyurtma,
    refresh: () => loadBuyurtmalar(true),
  };
};
