import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatUzbekistanDate, getUzbekistanISOString } from "@/lib/utils";

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

  useEffect(() => {
    if (user) {
      loadXarajatlar();
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('xarajatlar-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'xarajatlar',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          loadXarajatlar();
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

      const mapped = data?.map((item) => ({
        id: item.id,
        sana: item.sana,
        createdAt: item.created_at,
        tartibRaqam: item.tartib_raqam,
        kategoriya: item.kategoriya,
        tavsif: item.tavsif || "",
        summa: item.summa,
      })) || [];

      setXarajatlar(mapped);
    } catch (error: any) {
      console.error("Error loading xarajatlar:", error);
      toast.error(t("toast.loadError"));
    } finally {
      setLoading(false);
    }
  };

  const addXarajat = async (data: {
    sana: Date;
    kategoriya: string;
    tavsif: string;
    summa: number;
  }) => {
    if (!user) {
      toast.error(t("toast.loginRequired"));
      return false;
    }

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

      await loadXarajatlar();
      toast.success(t("expenses.addSuccess"));
      return true;
    } catch (error: any) {
      console.error("Error adding xarajat:", error);
      toast.error(t("toast.saveError"));
      return false;
    }
  };

  const updateXarajat = async (id: string, data: {
    sana: string;
    kategoriya: string;
    tavsif: string;
    summa: number;
  }) => {
    if (!user) return false;

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

      await loadXarajatlar();
      toast.success(t("common.updateSuccess"));
      return true;
    } catch (error: any) {
      console.error("Error updating xarajat:", error);
      toast.error(t("toast.updateError"));
      return false;
    }
  };

  const deleteXarajat = async (id: string) => {
    if (!user) return false;

    const itemToDelete = xarajatlar.find((x) => x.id === id);
    if (!itemToDelete) return false;

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

      await loadXarajatlar();
      toast.success(t("expenses.deleteSuccess"));
      return true;
    } catch (error: any) {
      console.error("Error deleting xarajat:", error);
      toast.error(t("toast.deleteError"));
      return false;
    }
  };

  return {
    xarajatlar,
    loading,
    addXarajat,
    updateXarajat,
    deleteXarajat,
    refetch: loadXarajatlar,
  };
};
