import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatUzbekistanDate, getUzbekistanISOString } from "@/lib/utils";
import { useDataIntegrity } from "@/hooks/useDataIntegrity";
import { useOnlineGuard } from "@/hooks/useNetworkStatus";

export interface Xarajat {
  id: string;
  sana: string;
  createdAt: string;
  tartibRaqam: number;
  kategoriya: string;
  tavsif: string;
  summa: number;
}

export const useXarajatlar = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [xarajatlar, setXarajatlar] = useState<Xarajat[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { withDuplicatePrevention, isOperationPending } = useDataIntegrity();
  const { isOnline, guardOperation } = useOnlineGuard();

  useEffect(() => {
    if (user) {
      loadXarajatlar();
    }
  }, [user]);

  const mapToLocal = (item: any): Xarajat => ({
    id: item.id,
    sana: item.sana,
    createdAt: item.created_at,
    tartibRaqam: item.tartib_raqam,
    kategoriya: item.kategoriya,
    tavsif: item.tavsif || "",
    summa: item.summa,
  });

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('xarajatlar-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'xarajatlar',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const newItem = mapToLocal(payload.new);
          setXarajatlar(prev => {
            if (prev.some(x => x.id === newItem.id)) return prev;
            return [newItem, ...prev];
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'xarajatlar',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const updatedItem = mapToLocal(payload.new);
          setXarajatlar(prev => prev.map(x => x.id === updatedItem.id ? updatedItem : x));
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'xarajatlar',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          setXarajatlar(prev => prev.filter(x => x.id !== (payload.old as any).id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const loadXarajatlar = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("xarajatlar")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setXarajatlar(data?.map(mapToLocal) || []);
    } catch (error: any) {
      console.error("Error loading xarajatlar:", error);
      toast.error(t("toast.loadError"));
    } finally {
      setLoading(false);
    }
  };

  const addXarajat = useCallback(async (data: {
    sana: Date;
    kategoriya: string;
    tavsif: string;
    summa: number;
  }) => {
    if (!user) {
      toast.error(t("toast.loginRequired"));
      return false;
    }

    if (isSubmitting || isOperationPending('xarajat-add')) {
      return false;
    }

    const result = await guardOperation(async () => {
      return await withDuplicatePrevention('xarajat-add', async () => {
        setIsSubmitting(true);
        try {
          // Get the maximum tartib_raqam for this user
          const { data: maxData, error: maxError } = await supabase
            .from("xarajatlar")
            .select("tartib_raqam")
            .eq("user_id", user.id)
            .order("tartib_raqam", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (maxError) throw maxError;

          const nextTartibRaqam = maxData ? maxData.tartib_raqam + 1 : 1;

          const { error } = await supabase
            .from("xarajatlar")
            .insert({
              user_id: user.id,
              sana: formatUzbekistanDate(data.sana),
              tartib_raqam: nextTartibRaqam,
              kategoriya: data.kategoriya,
              tavsif: data.tavsif,
              summa: data.summa,
            });

          if (error) throw error;

          // Real-time orqali keladi, shuning uchun loadXarajatlar chaqirmaymiz
          toast.success(t("expenses.addSuccess"));
          return true;
        } catch (error: any) {
          console.error("Error adding xarajat:", error);
          toast.error(t("toast.saveError"));
          return false;
        } finally {
          setIsSubmitting(false);
        }
      });
    }, t('network.operationRequiresConnection'));

    return result ?? false;
  }, [user, t, isSubmitting, isOperationPending, guardOperation, withDuplicatePrevention, loadXarajatlar]);

  const updateXarajat = useCallback(async (id: string, data: {
    sana: string;
    kategoriya: string;
    tavsif: string;
    summa: number;
  }) => {
    if (!user) return false;

    if (isOperationPending(`xarajat-update-${id}`)) {
      return false;
    }

    const result = await guardOperation(async () => {
      return await withDuplicatePrevention(`xarajat-update-${id}`, async () => {
        try {
          const { error } = await supabase
            .from("xarajatlar")
            .update({
              sana: data.sana,
              kategoriya: data.kategoriya,
              tavsif: data.tavsif,
              summa: data.summa,
            })
            .eq("id", id);

          if (error) throw error;

          // Real-time orqali yangilanadi
          toast.success(t("common.updateSuccess"));
          return true;
        } catch (error: any) {
          console.error("Error updating xarajat:", error);
          toast.error(t("toast.updateError"));
          return false;
        }
      });
    }, t('network.operationRequiresConnection'));

    return result ?? false;
  }, [user, t, isOperationPending, guardOperation, withDuplicatePrevention, loadXarajatlar]);

  const deleteXarajat = useCallback(async (id: string) => {
    if (!user) return false;

    const itemToDelete = xarajatlar.find((x) => x.id === id);
    if (!itemToDelete) return false;

    if (isOperationPending(`xarajat-delete-${id}`)) {
      return false;
    }

    const result = await guardOperation(async () => {
      return await withDuplicatePrevention(`xarajat-delete-${id}`, async () => {
        try {
          // Move to trash
          await supabase.from("chiqindilar").insert([{
            user_id: user.id,
            item_id: id,
            type: "xarajatlar",
            data: itemToDelete as any,
            deleted_at: getUzbekistanISOString(),
          }]);

          const { error } = await supabase
            .from("xarajatlar")
            .delete()
            .eq("id", id);

          if (error) throw error;

          // Real-time orqali o'chiriladi
          toast.success(t("expenses.deleteSuccess"));
          return true;
        } catch (error: any) {
          console.error("Error deleting xarajat:", error);
          toast.error(t("toast.deleteError"));
          return false;
        }
      });
    }, t('network.operationRequiresConnection'));

    return result ?? false;
  }, [user, t, xarajatlar, isOperationPending, guardOperation, withDuplicatePrevention, loadXarajatlar]);

  return {
    xarajatlar,
    loading,
    isSubmitting,
    isOnline,
    addXarajat,
    updateXarajat,
    deleteXarajat,
    refetch: loadXarajatlar,
  };
};
