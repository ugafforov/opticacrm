import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatDisplayDate, formatUzbekistanDate } from "@/lib/utils";
import { Clock, Phone, User, Eye, Plus, ChevronDown, ChevronUp, Pencil } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { EditDialog } from "@/components/EditDialog";

interface PatientHistory {
  id: string;
  sana: string;
  od: string;
  os: string;
  linza_turi: string;
  created_at: string;
}

interface PatientCardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
  patientName: string;
  patientPhone: string;
  currentOd: string;
  currentOs: string;
  currentLensType: string;
  currentDate: string;
  onUpdate?: () => void;
}

export const PatientCard = ({
  open,
  onOpenChange,
  patientId,
  patientName,
  patientPhone,
  currentOd,
  currentOs,
  currentLensType,
  currentDate,
  onUpdate,
}: PatientCardProps) => {
  const { t } = useLanguage();
  const [history, setHistory] = useState<PatientHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    od: "",
    os: "",
    linzaTuri: "",
    sana: formatUzbekistanDate(new Date()),
  });
  const [editingItem, setEditingItem] = useState<PatientHistory | null>(null);
  const [editForm, setEditForm] = useState({
    od: "",
    os: "",
    linzaTuri: "",
    sana: "",
  });

  useEffect(() => {
    if (open && patientId) {
      loadHistory();
    }
  }, [open, patientId]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("bemor_tarixi")
        .select("*")
        .eq("bemor_id", patientId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setHistory(data || []);
    } catch (error) {
      console.error("Error loading patient history:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNewRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!patientId) return;

    try {
      setSubmitting(true);

      const { error: historyError } = await supabase
        .from("bemor_tarixi")
        .insert({
          bemor_id: patientId,
          user_id: (await supabase.auth.getUser()).data.user?.id,
          sana: currentDate,
          od: currentOd,
          os: currentOs,
          linza_turi: currentLensType,
          telefon: patientPhone,
          mijoz: patientName,
        });

      if (historyError) throw historyError;

      const { error: updateError } = await supabase
        .from("linza_royxatlari")
        .update({
          sana: form.sana,
          od: form.od,
          os: form.os,
          linza_turi: form.linzaTuri,
        })
        .eq("id", patientId);

      if (updateError) throw updateError;

      toast.success(t("lens.updateSuccess"));
      setShowAddForm(false);
      setForm({
        od: "",
        os: "",
        linzaTuri: "",
        sana: formatUzbekistanDate(new Date()),
      });
      
      await loadHistory();
      if (onUpdate) onUpdate();
      
    } catch (error) {
      console.error("Error adding new record:", error);
      toast.error(t("common.error"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (item: PatientHistory) => {
    setEditingItem(item);
    setEditForm({
      od: item.od,
      os: item.os,
      linzaTuri: item.linza_turi,
      sana: item.sana,
    });
  };

  const handleUpdateHistory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    try {
      setSubmitting(true);

      const { error } = await supabase
        .from("bemor_tarixi")
        .update({
          od: editForm.od,
          os: editForm.os,
          linza_turi: editForm.linzaTuri,
          sana: editForm.sana,
        })
        .eq("id", editingItem.id);

      if (error) throw error;

      toast.success(t("lens.updateSuccess"));
      setEditingItem(null);
      await loadHistory();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error("Error updating history record:", error);
      toast.error(t("common.error"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-lg">{patientName}</DialogTitle>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                  <Phone className="w-3 h-3" />
                  {patientPhone}
                </div>
              </div>
            </div>
            <Button 
              onClick={() => setShowAddForm(!showAddForm)}
              size="sm"
              variant={showAddForm ? "outline" : "default"}
              className="gap-1.5 h-8 text-xs"
            >
              {showAddForm ? <ChevronUp className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
              {t("lens.addNewRecord")}
            </Button>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(85vh-120px)]">
          <div className="space-y-4 pr-3">
            {/* Add Form */}
            {showAddForm && (
              <Card className="p-4 bg-primary/5 border-primary/20 animate-fade-in">
                <form onSubmit={handleAddNewRecord} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="new-od" className="text-xs">OD</Label>
                      <Input
                        id="new-od"
                        value={form.od}
                        onChange={(e) => setForm({ ...form, od: e.target.value })}
                        required
                        className="h-8 text-sm"
                        placeholder={currentOd}
                      />
                    </div>
                    <div>
                      <Label htmlFor="new-os" className="text-xs">OS</Label>
                      <Input
                        id="new-os"
                        value={form.os}
                        onChange={(e) => setForm({ ...form, os: e.target.value })}
                        required
                        className="h-8 text-sm"
                        placeholder={currentOs}
                      />
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor="new-linza" className="text-xs">{t("lens.lensType")}</Label>
                      <Input
                        id="new-linza"
                        value={form.linzaTuri}
                        onChange={(e) => setForm({ ...form, linzaTuri: e.target.value })}
                        required
                        className="h-8 text-sm"
                        placeholder={currentLensType}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAddForm(false)}
                      disabled={submitting}
                      className="h-8 text-xs"
                    >
                      {t("common.cancel")}
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={submitting}
                      className="h-8 text-xs"
                    >
                      {submitting ? t("common.loading") : t("common.save")}
                    </Button>
                  </div>
                </form>
              </Card>
            )}

            {/* Current Data */}
            <Card className="p-4 bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
              <div className="flex items-center gap-2 mb-3">
                <Eye className="w-4 h-4 text-primary" />
                <span className="font-semibold text-sm">{t("lens.currentData")}</span>
                <Badge variant="secondary" className="text-xs ml-auto">
                  {formatDisplayDate(currentDate)}
                </Badge>
              </div>
              
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 rounded-lg bg-background/60 border border-border/50">
                  <div className="text-xs text-muted-foreground">OD</div>
                  <div className="font-bold text-xl text-primary mt-1">{currentOd}</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-background/60 border border-border/50">
                  <div className="text-xs text-muted-foreground">OS</div>
                  <div className="font-bold text-xl text-primary mt-1">{currentOs}</div>
                </div>
                <div className="col-span-3 p-3 rounded-lg bg-background/60 border border-border/50">
                  <div className="text-xs text-muted-foreground mb-1">{t("lens.lensType")}</div>
                  <div className="font-medium text-sm">{currentLensType}</div>
                </div>
              </div>
            </Card>

            {/* History */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-primary" />
                <span className="font-semibold text-sm">{t("lens.changeHistory")}</span>
                <Badge variant="outline" className="text-xs ml-auto">
                  {history.length}
                </Badge>
              </div>

              {loading ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  {t("common.loading")}
                </div>
              ) : history.length === 0 ? (
                <Card className="p-6 bg-muted/20 text-center">
                  <Clock className="w-8 h-8 mx-auto mb-2 opacity-20" />
                  <p className="text-sm text-muted-foreground">{t("lens.noHistory")}</p>
                </Card>
              ) : (
                <div className="space-y-2">
                  {history.map((item, index) => (
                    <Card 
                      key={item.id} 
                      className="p-3 hover:shadow-md transition-all duration-200 hover:scale-[1.01] cursor-default"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <Badge variant="secondary" className="text-xs">
                          #{history.length - index}
                        </Badge>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {formatDisplayDate(item.sana)}
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(item)}
                            className="h-6 w-6 p-0 hover:bg-primary/10"
                          >
                            <Pencil className="w-3 h-3 text-primary" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div className="text-center p-2 rounded bg-muted/30">
                          <div className="text-xs text-muted-foreground">OD</div>
                          <div className="font-semibold mt-0.5">{item.od}</div>
                        </div>
                        <div className="text-center p-2 rounded bg-muted/30">
                          <div className="text-xs text-muted-foreground">OS</div>
                          <div className="font-semibold mt-0.5">{item.os}</div>
                        </div>
                        <div className="col-span-3 p-2 rounded bg-muted/30 mt-1">
                          <div className="text-xs text-muted-foreground">{t("lens.lensType")}</div>
                          <div className="text-xs font-medium mt-0.5 truncate">{item.linza_turi}</div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>

      {/* Edit Dialog */}
      <EditDialog
        open={!!editingItem}
        onOpenChange={(open) => !open && setEditingItem(null)}
        title={t("lens.editRecord")}
      >
        <form onSubmit={handleUpdateHistory} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="edit-od">OD</Label>
              <Input
                id="edit-od"
                value={editForm.od}
                onChange={(e) => setEditForm({ ...editForm, od: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="edit-os">OS</Label>
              <Input
                id="edit-os"
                value={editForm.os}
                onChange={(e) => setEditForm({ ...editForm, os: e.target.value })}
                required
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="edit-linza">{t("lens.lensType")}</Label>
              <Input
                id="edit-linza"
                value={editForm.linzaTuri}
                onChange={(e) => setEditForm({ ...editForm, linzaTuri: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setEditingItem(null)}
              disabled={submitting}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? t("common.loading") : t("common.save")}
            </Button>
          </div>
        </form>
      </EditDialog>
    </Dialog>
  );
};
