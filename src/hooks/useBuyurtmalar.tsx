import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatUzbekistanDate, getUzbekistanISOString } from "@/lib/utils";
import { BuyurtmaFormData } from "@/components/buyurtmalar/BuyurtmalarForm";

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
        createdAt: item.created_at,
        tartibRaqam: item.tartib_raqam,
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
      toast.error(t("toast.loadError"));
    } finally {
      setLoading(false);
    }
  };

  const createBuyurtma = async (formData: BuyurtmaFormData, selectedDate: Date) => {
    if (!user) {
      toast.error(t("toast.loginRequired"));
      return;
    }

    const jamiSumma = (parseFloat(formData.oynaNarxi) || 0) + (parseFloat(formData.opravaNarxi) || 0);

    try {
      const { data: maxData, error: maxError } = await supabase
        .from("buyurtmalar")
        .select("tartib_raqam")
        .eq("user_id", user.id)
        .order("tartib_raqam", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (maxError) throw maxError;

      const nextTartibRaqam = maxData ? maxData.tartib_raqam + 1 : 1;

      const { error } = await supabase
        .from("buyurtmalar")
        .insert({
          user_id: user.id,
          sana: formatUzbekistanDate(selectedDate),
          tartib_raqam: nextTartibRaqam,
          mijoz: formData.mijoz,
          telefon: formData.telefon,
          od: formData.od,
          os: formData.os,
          oyna_tури: formData.oynaTuri,
          oyna_narxi: parseFloat(formData.oynaNarxi) || 0,
          oprava_narxi: parseFloat(formData.opravaNarxi) || 0,
          oprava_turi: formData.opravaTuri,
          jami_summa: jamiSumma,
        });

      if (error) throw error;

      await loadBuyurtmalar();
      toast.success(t("orders.addSuccess"));
    } catch (error: any) {
      toast.error(t("toast.saveError"));
    }
  };

  const updateBuyurtma = async (item: Buyurtma) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("buyurtmalar")
        .update({
          sana: item.sana,
          mijoz: item.mijoz,
          telefon: item.telefon,
          od: item.od,
          os: item.os,
          oyna_tури: item.oynaTuri,
          oyna_narxi: item.oynaNarxi,
          oprava_narxi: item.opravaNarxi,
          oprava_turi: item.opravaTuri,
          jami_summa: item.jamiSumma,
        })
        .eq("id", item.id);

      if (error) throw error;

      await loadBuyurtmalar();
      toast.success(t("common.updateSuccess"));
    } catch (error: any) {
      toast.error(t("toast.updateError"));
    }
  };

  const deleteBuyurtma = async (id: string) => {
    if (!user) return;

    const itemToDelete = buyurtmalar.find((b) => b.id === id);
    if (!itemToDelete) return;

    try {
      await supabase.from("chiqindilar").insert([{
        user_id: user.id,
        item_id: id,
        type: "buyurtmalar",
        data: itemToDelete as any,
        deleted_at: getUzbekistanISOString(),
      }]);

      const { error } = await supabase
        .from("buyurtmalar")
        .delete()
        .eq("id", id);

      if (error) throw error;

      await loadBuyurtmalar();
      toast.success(t("orders.deleteSuccess"));
    } catch (error: any) {
      toast.error(t("toast.deleteError"));
    }
  };

  return {
    buyurtmalar,
    loading,
    createBuyurtma,
    updateBuyurtma,
    deleteBuyurtma,
  };
};
