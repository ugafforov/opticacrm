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
import { formatDisplayDate, formatUzbekistanDateTime, formatUzbekistanDate } from "@/lib/utils";
import { Clock, Phone, User, Eye, Calendar, Activity, Plus, TrendingUp } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

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

      // Eski ma'lumotni tarixga qo'shish
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

      // Asosiy yozuvni yangilash
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
      
      // Tarixni qayta yuklash
      await loadHistory();
      
      // Parent komponentni yangilash
      if (onUpdate) onUpdate();
      
    } catch (error) {
      console.error("Error adding new record:", error);
      toast.error(t("common.error"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="w-6 h-6 text-primary" />
              <span className="text-xl">{t("lens.patientCard")}</span>
            </div>
            <Button 
              onClick={() => setShowAddForm(!showAddForm)}
              size="sm"
              variant={showAddForm ? "outline" : "default"}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              {t("lens.addNewRecord")}
            </Button>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-100px)] pr-4">
          <div className="space-y-5">
            {/* Add New Record Form */}
            {showAddForm && (
              <Card className="p-5 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900">
                <form onSubmit={handleAddNewRecord} className="space-y-4">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <h4 className="font-semibold text-green-700 dark:text-green-300">
                      {t("lens.addNewRecord")}
                    </h4>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="new-od" className="text-xs">OD ({t("form.rightEye")})</Label>
                      <Input
                        id="new-od"
                        value={form.od}
                        onChange={(e) => setForm({ ...form, od: e.target.value })}
                        required
                        className="h-9"
                        placeholder={currentOd}
                      />
                    </div>
                    <div>
                      <Label htmlFor="new-os" className="text-xs">OS ({t("form.leftEye")})</Label>
                      <Input
                        id="new-os"
                        value={form.os}
                        onChange={(e) => setForm({ ...form, os: e.target.value })}
                        required
                        className="h-9"
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
                        className="h-9"
                        placeholder={currentLensType}
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAddForm(false)}
                      disabled={submitting}
                    >
                      {t("common.cancel")}
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={submitting}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {submitting ? t("common.loading") : t("common.save")}
                    </Button>
                  </div>
                </form>
              </Card>
            )}

            {/* Patient Info Card */}
            <Card className="p-5 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/30">
              <div className="flex items-start justify-between mb-4">
                <div className="space-y-1">
                  <h3 className="font-bold text-xl">{patientName}</h3>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="w-4 h-4" />
                    <span className="text-sm">{patientPhone}</span>
                  </div>
                </div>
                <Badge className="text-xs px-3 py-1">
                  <Activity className="w-3 h-3 mr-1" />
                  {history.length + 1} {t("lens.visit").toLowerCase()}
                </Badge>
              </div>
              
              <Separator className="my-4" />
              
              {/* Current State */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Eye className="w-5 h-5 text-primary" />
                  <h4 className="font-semibold">{t("lens.currentData")}</h4>
                  <Badge variant="secondary" className="text-xs ml-auto">
                    <Calendar className="w-3 h-3 mr-1" />
                    {formatDisplayDate(currentDate)}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Card className="p-4 text-center bg-background/50 border-primary/20">
                    <div className="text-xs text-muted-foreground mb-1">OD</div>
                    <div className="font-bold text-2xl text-primary">{currentOd}</div>
                    <div className="text-xs text-muted-foreground mt-1">{t("form.rightEye")}</div>
                  </Card>
                  <Card className="p-4 text-center bg-background/50 border-primary/20">
                    <div className="text-xs text-muted-foreground mb-1">OS</div>
                    <div className="font-bold text-2xl text-primary">{currentOs}</div>
                    <div className="text-xs text-muted-foreground mt-1">{t("form.leftEye")}</div>
                  </Card>
                  <Card className="col-span-2 p-4 bg-background/50 border-primary/20">
                    <div className="text-xs text-muted-foreground mb-1">{t("lens.lensType")}</div>
                    <div className="font-medium text-lg">{currentLensType}</div>
                  </Card>
                </div>
              </div>
            </Card>

            {/* History Timeline */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-lg">{t("lens.changeHistory")}</h3>
                <Badge variant="outline" className="ml-auto">
                  {history.length} {t("lens.visit").toLowerCase()}
                </Badge>
              </div>

              {loading ? (
                <div className="text-center py-12 text-muted-foreground">
                  <div className="animate-pulse flex flex-col items-center gap-2">
                    <Clock className="w-8 h-8 opacity-50" />
                    <p>{t("common.loading")}</p>
                  </div>
                </div>
              ) : history.length === 0 ? (
                <Card className="p-8 bg-muted/20">
                  <div className="text-center text-muted-foreground">
                    <Activity className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">{t("lens.noHistory")}</p>
                    <p className="text-sm mt-1">Bu bemorning birinchi tashrififi</p>
                  </div>
                </Card>
              ) : (
                <div className="space-y-3 relative before:absolute before:left-6 before:top-4 before:bottom-4 before:w-0.5 before:bg-border">
                  {history.map((item, index) => (
                    <Card key={item.id} className="p-4 bg-card hover:shadow-md transition-shadow relative ml-6">
                      {/* Timeline dot */}
                      <div className="absolute -left-6 top-6 w-3 h-3 rounded-full bg-primary border-4 border-background"></div>
                      
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <Badge variant="secondary" className="text-xs mb-1">
                            {t("lens.visit")} #{history.length - index}
                          </Badge>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                            <Calendar className="w-3 h-3" />
                            <span>{formatDisplayDate(item.sana)}</span>
                            {item.created_at && (
                              <>
                                <span>•</span>
                                <Clock className="w-3 h-3" />
                                <span>{formatUzbekistanDateTime(new Date(item.created_at))}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-3 bg-muted/30 rounded-md p-3">
                        <div className="text-center">
                          <div className="text-xs text-muted-foreground mb-1">OD</div>
                          <div className="font-semibold">{item.od}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-muted-foreground mb-1">OS</div>
                          <div className="font-semibold">{item.os}</div>
                        </div>
                        <div className="col-span-3 pt-2 border-t border-border/50">
                          <div className="text-xs text-muted-foreground mb-1">{t("lens.lensType")}</div>
                          <div className="text-sm font-medium">{item.linza_turi}</div>
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
    </Dialog>
  );
};
