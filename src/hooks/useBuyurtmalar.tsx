import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatUzbekistanDate, getUzbekistanISOString } from "@/lib/utils";
import { BuyurtmaFormData } from "@/components/buyurtmalar/BuyurtmalarForm";
import { safeAdd, safeParsePriceToNumber } from "@/lib/safeCalculations";
import { withRetry } from "@/lib/retryUtils";

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

export const useBuyurtmalar = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [buyurtmalar, setBuyurtmalar] = useState<Buyurtma[]>([]);
  const [loading, setLoading] = useState(true);
  const isLoadingRef = useRef(false);
  const retryCountRef = useRef(0);

  // Debounced load function to prevent multiple simultaneous loads
  const loadBuyurtmalar = useCallback(async () => {
    if (!user || isLoadingRef.current) return;
    
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

      const mapped = data?.map((item) => ({
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
      })) || [];

      setBuyurtmalar(mapped);
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
  }, [user, t]);

  useEffect(() => {
    if (user) {
      loadBuyurtmalar();
    }
  }, [user, loadBuyurtmalar]);

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
          // Debounce realtime updates
          setTimeout(() => loadBuyurtmalar(), 100);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, loadBuyurtmalar]);

  const createBuyurtma = useCallback(async (formData: BuyurtmaFormData, selectedDate: Date) => {
    if (!user) {
      toast.error(t("toast.loginRequired"));
      return;
    }

    // Use safe calculation for total
    const oynaNarxi = safeParsePriceToNumber(formData.oynaNarxi);
    const opravaNarxi = safeParsePriceToNumber(formData.opravaNarxi);
    const jamiSumma = safeAdd(oynaNarxi, opravaNarxi);

    try {
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

      await withRetry(async () => {
        const { error } = await supabase
          .from("buyurtmalar")
          .insert({
            user_id: user.id,
            sana: formatUzbekistanDate(selectedDate),
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
          });

        if (error) throw error;
      });

      await loadBuyurtmalar();
      toast.success(t("orders.addSuccess"));
    } catch (error: any) {
      console.error("Error creating buyurtma:", error);
      toast.error(t("toast.saveError"));
    }
  }, [user, t, loadBuyurtmalar]);

  const updateBuyurtma = useCallback(async (item: Buyurtma) => {
    if (!user) return;

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

      await loadBuyurtmalar();
      toast.success(t("common.updateSuccess"));
    } catch (error: any) {
      console.error("Error updating buyurtma:", error);
      toast.error(t("toast.updateError"));
    }
  }, [user, t, loadBuyurtmalar]);

  const deleteBuyurtma = useCallback(async (id: string) => {
    if (!user) return;

    const itemToDelete = buyurtmalar.find((b) => b.id === id);
    if (!itemToDelete) return;

    try {
      // First backup to trash
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

      // Then delete
      await withRetry(async () => {
        const { error } = await supabase
          .from("buyurtmalar")
          .delete()
          .eq("id", id);

        if (error) throw error;
      });

      await loadBuyurtmalar();
      toast.success(t("orders.deleteSuccess"));
    } catch (error: any) {
      console.error("Error deleting buyurtma:", error);
      toast.error(t("toast.deleteError"));
    }
  }, [user, t, buyurtmalar, loadBuyurtmalar]);

  return {
    buyurtmalar,
    loading,
    createBuyurtma,
    updateBuyurtma,
    deleteBuyurtma,
    refresh: loadBuyurtmalar,
  };
};
