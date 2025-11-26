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
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatDisplayDate } from "@/lib/utils";
import { Clock, Phone, User } from "lucide-react";

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
}: PatientCardProps) => {
  const { t } = useLanguage();
  const [history, setHistory] = useState<PatientHistory[]>([]);
  const [loading, setLoading] = useState(false);

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            {t("lens.patientCard")}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-120px)] pr-4">
          {/* Current Patient Info */}
          <div className="space-y-4">
            <Card className="p-4 bg-primary/5 border-primary/20">
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                <Badge variant="default">{t("lens.currentData")}</Badge>
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">{t("lens.client")}:</span>
                  <p className="font-medium">{patientName}</p>
                </div>
                <div>
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    {t("lens.phone")}:
                  </span>
                  <p className="font-medium">{patientPhone}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">OD:</span>
                  <p className="font-medium">{currentOd}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">OS:</span>
                  <p className="font-medium">{currentOs}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">{t("lens.lensType")}:</span>
                  <p className="font-medium">{currentLensType}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {t("lens.lastVisit")}:
                  </span>
                  <p className="font-medium">{formatDisplayDate(currentDate)}</p>
                </div>
              </div>
            </Card>

            {/* History */}
            <div>
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                <Clock className="w-5 h-5" />
                {t("lens.changeHistory")} 
                <Badge variant="secondary">{history.length}</Badge>
              </h3>

              {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  {t("common.loading")}
                </div>
              ) : history.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {t("lens.noHistory")}
                </div>
              ) : (
                <div className="space-y-3">
                  {history.map((item, index) => (
                    <Card key={item.id} className="p-4 bg-muted/30">
                      <div className="flex items-start justify-between mb-2">
                        <Badge variant="outline">
                          {t("lens.visit")} {history.length - index}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDisplayDate(item.sana)}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-sm mt-2">
                        <div>
                          <span className="text-muted-foreground text-xs">OD:</span>
                          <p className="font-medium">{item.od}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-xs">OS:</span>
                          <p className="font-medium">{item.os}</p>
                        </div>
                        <div className="col-span-3">
                          <span className="text-muted-foreground text-xs">{t("lens.lensType")}:</span>
                          <p className="font-medium">{item.linza_turi}</p>
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
