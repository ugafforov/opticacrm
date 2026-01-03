import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatUzbekistanDate, getUzbekistanISOString } from "@/lib/utils";

export interface Qarzdor {
  id: string;
  sana: string;
  createdAt: string;
  tartibRaqam: number;
  mijoz: string;
  telefon: string;
  qarzSummasi: number;
  izoh: string;
}

export const useQarzdorlar = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [qarzdorlar, setQarzdorlar] = useState<Qarzdor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadQarzdorlar();
    }
  }, [user]);

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
  }, [user]);

  const loadQarzdorlar = async () => {
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
        izoh: item.izoh || "",
      })) || [];

      setQarzdorlar(mapped);
    } catch (error: any) {
      console.error("Error loading qarzdorlar:", error);
      toast.error(t("toast.loadError"));
    } finally {
      setLoading(false);
    }
  };

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
      const { error } = await supabase
        .from("qarzdorlar")
        .update({
          sana: data.sana,
          mijoz: data.mijoz,
          telefon: data.telefon,
          qarz_summasi: data.qarzSummasi,
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

  return {
    qarzdorlar,
    loading,
    addQarzdor,
    updateQarzdor,
    deleteQarzdor,
    refetch: loadQarzdorlar,
  };
};
