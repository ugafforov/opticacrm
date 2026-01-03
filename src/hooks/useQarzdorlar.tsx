import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatUzbekistanDate, getUzbekistanISOString } from "@/lib/utils";

export interface QarzTolovi {
  id: string;
  qarzdorId: string;
  summa: number;
  sana: string;
  izoh: string;
  createdAt: string;
}

export interface Qarzdor {
  id: string;
  sana: string;
  createdAt: string;
  tartibRaqam: number;
  mijoz: string;
  telefon: string;
  qarzSummasi: number;
  qoldiqSumma: number;
  holat: "tollanmagan" | "qisman" | "tollangan";
  oxirgiAloqa: string | null;
  izoh: string;
  tolovlar?: QarzTolovi[];
}

export type DebtorStatus = "all" | "tollanmagan" | "qisman" | "tollangan";

export const useQarzdorlar = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [qarzdorlar, setQarzdorlar] = useState<Qarzdor[]>([]);
  const [loading, setLoading] = useState(true);

  const loadQarzdorlar = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("qarzdorlar")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const mapped = data?.map((item) => ({
        id: item.id,
        sana: item.sana,
        createdAt: item.created_at,
        tartibRaqam: item.tartib_raqam,
        mijoz: item.mijoz,
        telefon: item.telefon || "",
        qarzSummasi: item.qarz_summasi,
        qoldiqSumma: item.qoldiq_summa ?? item.qarz_summasi,
        holat: (item.holat || "tollanmagan") as Qarzdor["holat"],
        oxirgiAloqa: item.oxirgi_aloqa,
        izoh: item.izoh || "",
      })) || [];

      setQarzdorlar(mapped);
    } catch (error: any) {
      console.error("Error loading qarzdorlar:", error);
      toast.error(t("toast.loadError"));
    } finally {
      setLoading(false);
    }
  }, [user, t]);

  useEffect(() => {
    if (user) {
      loadQarzdorlar();
    }
  }, [user, loadQarzdorlar]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('qarzdorlar-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'qarzdorlar',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          loadQarzdorlar();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, loadQarzdorlar]);

  const addQarzdor = async (data: {
    sana: Date;
    mijoz: string;
    telefon: string;
    qarzSummasi: number;
    izoh: string;
  }) => {
    if (!user) {
      toast.error(t("toast.loginRequired"));
      return false;
    }

    try {
      const { data: maxData, error: maxError } = await supabase
        .from("qarzdorlar")
        .select("tartib_raqam")
        .eq("user_id", user.id)
        .order("tartib_raqam", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (maxError) throw maxError;

      const nextTartibRaqam = maxData ? maxData.tartib_raqam + 1 : 1;

      const { error } = await supabase
        .from("qarzdorlar")
        .insert({
          user_id: user.id,
          sana: formatUzbekistanDate(data.sana),
          tartib_raqam: nextTartibRaqam,
          mijoz: data.mijoz,
          telefon: data.telefon,
          qarz_summasi: data.qarzSummasi,
          qoldiq_summa: data.qarzSummasi,
          holat: "tollanmagan",
          izoh: data.izoh,
        });

      if (error) throw error;

      await loadQarzdorlar();
      toast.success(t("debtors.addSuccess"));
      return true;
    } catch (error: any) {
      console.error("Error adding qarzdor:", error);
      toast.error(t("toast.saveError"));
      return false;
    }
  };

  const updateQarzdor = async (id: string, data: {
    sana: string;
    mijoz: string;
    telefon: string;
    qarzSummasi: number;
    izoh: string;
  }) => {
    if (!user) return false;

    try {
      // Get current payments total
      const { data: payments } = await supabase
        .from("qarz_tolovlari")
        .select("summa")
        .eq("qarzdor_id", id);
      
      const totalPaid = payments?.reduce((sum, p) => sum + Number(p.summa), 0) || 0;
      const qoldiq = data.qarzSummasi - totalPaid;
      
      let holat: Qarzdor["holat"] = "tollanmagan";
      if (qoldiq <= 0) {
        holat = "tollangan";
      } else if (totalPaid > 0) {
        holat = "qisman";
      }

      const { error } = await supabase
        .from("qarzdorlar")
        .update({
          sana: data.sana,
          mijoz: data.mijoz,
          telefon: data.telefon,
          qarz_summasi: data.qarzSummasi,
          qoldiq_summa: Math.max(0, qoldiq),
          holat,
          izoh: data.izoh,
        })
        .eq("id", id);

      if (error) throw error;

      await loadQarzdorlar();
      toast.success(t("common.updateSuccess"));
      return true;
    } catch (error: any) {
      console.error("Error updating qarzdor:", error);
      toast.error(t("toast.updateError"));
      return false;
    }
  };

  const deleteQarzdor = async (id: string) => {
    if (!user) return false;

    const itemToDelete = qarzdorlar.find((x) => x.id === id);
    if (!itemToDelete) return false;

    try {
      await supabase.from("chiqindilar").insert([{
        user_id: user.id,
        item_id: id,
        type: "qarzdorlar",
        data: itemToDelete as any,
        deleted_at: getUzbekistanISOString(),
      }]);

      const { error } = await supabase
        .from("qarzdorlar")
        .delete()
        .eq("id", id);

      if (error) throw error;

      await loadQarzdorlar();
      toast.success(t("debtors.deleteSuccess"));
      return true;
    } catch (error: any) {
      console.error("Error deleting qarzdor:", error);
      toast.error(t("toast.deleteError"));
      return false;
    }
  };

  // Payment functions
  const addPayment = async (qarzdorId: string, data: {
    summa: number;
    sana: Date;
    izoh?: string;
  }) => {
    if (!user) return false;

    try {
      const qarzdor = qarzdorlar.find(q => q.id === qarzdorId);
      if (!qarzdor) return false;

      const { error: paymentError } = await supabase
        .from("qarz_tolovlari")
        .insert({
          user_id: user.id,
          qarzdor_id: qarzdorId,
          summa: data.summa,
          sana: formatUzbekistanDate(data.sana),
          izoh: data.izoh || "",
        });

      if (paymentError) throw paymentError;

      // Calculate new remaining amount
      const { data: payments } = await supabase
        .from("qarz_tolovlari")
        .select("summa")
        .eq("qarzdor_id", qarzdorId);
      
      const totalPaid = payments?.reduce((sum, p) => sum + Number(p.summa), 0) || 0;
      const qoldiq = qarzdor.qarzSummasi - totalPaid;
      
      let holat: Qarzdor["holat"] = "tollanmagan";
      if (qoldiq <= 0) {
        holat = "tollangan";
      } else if (totalPaid > 0) {
        holat = "qisman";
      }

      // Update qarzdor status
      const { error: updateError } = await supabase
        .from("qarzdorlar")
        .update({
          qoldiq_summa: Math.max(0, qoldiq),
          holat,
        })
        .eq("id", qarzdorId);

      if (updateError) throw updateError;

      await loadQarzdorlar();
      toast.success(t("debtors.paymentSuccess"));
      return true;
    } catch (error: any) {
      console.error("Error adding payment:", error);
      toast.error(t("toast.saveError"));
      return false;
    }
  };

  const getPaymentHistory = async (qarzdorId: string): Promise<QarzTolovi[]> => {
    try {
      const { data, error } = await supabase
        .from("qarz_tolovlari")
        .select("*")
        .eq("qarzdor_id", qarzdorId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return data?.map(item => ({
        id: item.id,
        qarzdorId: item.qarzdor_id,
        summa: item.summa,
        sana: item.sana,
        izoh: item.izoh || "",
        createdAt: item.created_at,
      })) || [];
    } catch (error) {
      console.error("Error loading payments:", error);
      return [];
    }
  };

  const deletePayment = async (paymentId: string, qarzdorId: string) => {
    if (!user) return false;

    try {
      const { error: deleteError } = await supabase
        .from("qarz_tolovlari")
        .delete()
        .eq("id", paymentId);

      if (deleteError) throw deleteError;

      // Recalculate remaining amount
      const qarzdor = qarzdorlar.find(q => q.id === qarzdorId);
      if (!qarzdor) return false;

      const { data: payments } = await supabase
        .from("qarz_tolovlari")
        .select("summa")
        .eq("qarzdor_id", qarzdorId);
      
      const totalPaid = payments?.reduce((sum, p) => sum + Number(p.summa), 0) || 0;
      const qoldiq = qarzdor.qarzSummasi - totalPaid;
      
      let holat: Qarzdor["holat"] = "tollanmagan";
      if (qoldiq <= 0) {
        holat = "tollangan";
      } else if (totalPaid > 0) {
        holat = "qisman";
      }

      await supabase
        .from("qarzdorlar")
        .update({
          qoldiq_summa: Math.max(0, qoldiq),
          holat,
        })
        .eq("id", qarzdorId);

      await loadQarzdorlar();
      toast.success(t("common.deleteSuccess"));
      return true;
    } catch (error: any) {
      console.error("Error deleting payment:", error);
      toast.error(t("toast.deleteError"));
      return false;
    }
  };

  // Contact tracking
  const markContacted = async (id: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from("qarzdorlar")
        .update({
          oxirgi_aloqa: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;

      await loadQarzdorlar();
      toast.success(t("debtors.contactMarked"));
      return true;
    } catch (error: any) {
      console.error("Error marking contact:", error);
      toast.error(t("toast.updateError"));
      return false;
    }
  };

  // Helper to get debt age category
  const getDebtAgeCategory = (sana: string): "new" | "warning" | "danger" | "critical" => {
    const debtDate = new Date(sana);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - debtDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 7) return "new";
    if (diffDays <= 30) return "warning";
    if (diffDays <= 60) return "danger";
    return "critical";
  };

  return {
    qarzdorlar,
    loading,
    addQarzdor,
    updateQarzdor,
    deleteQarzdor,
    addPayment,
    getPaymentHistory,
    deletePayment,
    markContacted,
    getDebtAgeCategory,
    refetch: loadQarzdorlar,
  };
};
