import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Trash2, Search, Pencil, Download, CalendarIcon, Printer, History, Loader2, Users, AlertTriangle, AlertCircle, Phone, PhoneCall } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, subWeeks, subMonths, differenceInMonths } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EditDialog } from "@/components/EditDialog";
import { PatientCard } from "@/components/PatientCard";
import { formatUzbekistanDate, getUzbekistanISOString, formatPhoneNumber, formatUzbekistanDateTime, formatDisplayDate, formatOdOs } from "@/lib/utils";
import { setupPdfDoc, addPdfHeader } from "@/lib/pdfHelpers";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { useDataIntegrity } from "@/hooks/useDataIntegrity";
import { useOnlineGuard } from "@/hooks/useNetworkStatus";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface LinzaRoyxat {
  id: string;
  sana: string;
  createdAt: string;
  tartibRaqam: number;
  mijoz: string;
  od: string;
  os: string;
  telefon: string;
  linzaTuri: string;
  tugilanYili: number | null;
  oxirgiAloqa: string | null;
}

const LinzaRoyxati = () => {
  const { t, script } = useLanguage();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const { withDuplicatePrevention, isOperationPending } = useDataIntegrity();
  const { isOnline, guardOperation } = useOnlineGuard();
  
  const [royxatlar, setRoyxatlar] = useState<LinzaRoyxat[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [editingItem, setEditingItem] = useState<LinzaRoyxat | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const [selectedPatient, setSelectedPatient] = useState<LinzaRoyxat | null>(null);
  const [overdueFilter, setOverdueFilter] = useState<"all" | "3months" | "6months">("all");
  const [form, setForm] = useState({
    mijoz: "",
    od: "",
    os: "",
    telefon: "+998 ",
    linzaTuri: "",
    tugilanYili: "",
  });

  const handleOdOsChange = (field: 'od' | 'os', value: string) => {
    setForm({ ...form, [field]: value });
  };

  const handleOdOsBlur = (field: 'od' | 'os', value: string) => {
    const formatted = formatOdOs(value);
    if (formatted !== value) {
      setForm({ ...form, [field]: formatted });
    }
  };

  useEffect(() => {
    if (user) {
      loadRoyxatlar();
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('linza-royxatlari-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'linza_royxatlari',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          loadRoyxatlar();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const loadRoyxatlar = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("linza_royxatlari")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const mapped = data?.map((item) => ({
        id: item.id,
        sana: item.sana,
        createdAt: item.created_at,
        tartibRaqam: item.tartib_raqam,
        mijoz: item.mijoz,
        od: item.od,
        os: item.os,
        telefon: item.telefon,
        linzaTuri: item.linza_turi,
        tugilanYili: item.tugilan_yili,
        oxirgiAloqa: item.oxirgi_aloqa,
      })) || [];

      setRoyxatlar(mapped);
    } catch (error: any) {
      console.error("Error loading linza royxatlari:", error);
      toast.error(t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error(t("toast.loginRequired"));
      return;
    }

    // Check if already submitting or offline
    if (isSubmitting || isOperationPending('linza-royxat-add')) {
      return;
    }

    // Guard against offline operations
    await guardOperation(async () => {
      return await withDuplicatePrevention('linza-royxat-add', async () => {
        setIsSubmitting(true);
        
        try {
          // Telefon raqami bo'yicha mavjud bemorni qidirish
          const phoneDigits = form.telefon.replace(/\D/g, "");
          const { data: existingPatients, error: searchError } = await supabase
            .from("linza_royxatlari")
            .select("*")
            .eq("user_id", user.id);

          if (searchError) throw searchError;

          // Telefon raqami bo'yicha aniq bemor topish
          const existingPatient = existingPatients?.find(p => {
            const patientPhone = p.telefon.replace(/\D/g, "");
            return patientPhone === phoneDigits;
          });

          if (existingPatient) {
            // Bemor mavjud - eski ma'lumotni tarixga saqlash
            const { error: historyError } = await supabase
              .from("bemor_tarixi")
              .insert({
                bemor_id: existingPatient.id,
                user_id: user.id,
                sana: existingPatient.sana,
                od: existingPatient.od,
                os: existingPatient.os,
                linza_turi: existingPatient.linza_turi,
                telefon: existingPatient.telefon,
                mijoz: existingPatient.mijoz,
                tugilan_yili: existingPatient.tugilan_yili,
              });

            if (historyError) throw historyError;

            // Mavjud yozuvni yangilash
            const { error: updateError } = await supabase
              .from("linza_royxatlari")
              .update({
                sana: formatUzbekistanDate(selectedDate),
                mijoz: form.mijoz,
                od: form.od,
                os: form.os,
                telefon: form.telefon,
                linza_turi: form.linzaTuri,
                tugilan_yili: form.tugilanYili ? parseInt(form.tugilanYili) : null,
              })
              .eq("id", existingPatient.id);

            if (updateError) throw updateError;

            toast.success(t("lens.updateSuccess"));
          } else {
            // Yangi bemor - yangi yozuv yaratish
            const { data: maxData, error: maxError } = await supabase
              .from("linza_royxatlari")
              .select("tartib_raqam")
              .eq("user_id", user.id)
              .order("tartib_raqam", { ascending: false })
              .limit(1)
              .maybeSingle();

            if (maxError) throw maxError;

            const nextTartibRaqam = maxData ? maxData.tartib_raqam + 1 : 1;

            const { error } = await supabase
              .from("linza_royxatlari")
              .insert({
                user_id: user.id,
                sana: formatUzbekistanDate(selectedDate),
                tartib_raqam: nextTartibRaqam,
                mijoz: form.mijoz,
                od: form.od,
                os: form.os,
                telefon: form.telefon,
                linza_turi: form.linzaTuri,
                tugilan_yili: form.tugilanYili ? parseInt(form.tugilanYili) : null,
              });

            if (error) throw error;

            toast.success(t("lens.addSuccess"));
          }

          await loadRoyxatlar();

          setSelectedDate(new Date());
          setForm({
            mijoz: "",
            od: "",
            os: "",
            telefon: "+998 ",
            linzaTuri: "",
            tugilanYili: "",
          });
          return true;
        } catch (error: any) {
          console.error("Error adding/updating linza royxat:", error);
          toast.error(t("common.error"));
          return false;
        } finally {
          setIsSubmitting(false);
        }
      });
    }, t('network.operationRequiresConnection') || 'Bu amal internet aloqasini talab qiladi');
  }, [user, form, selectedDate, isSubmitting, guardOperation, withDuplicatePrevention, isOperationPending, t]);

  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleDelete = useCallback(async (id: string) => {
    if (!user) return;

    const itemToDelete = royxatlar.find((r) => r.id === id);
    if (!itemToDelete) return;

    if (isDeleting || isOperationPending(`linza-royxat-delete-${id}`)) {
      return;
    }

    await guardOperation(async () => {
      return await withDuplicatePrevention(`linza-royxat-delete-${id}`, async () => {
        setIsDeleting(true);
        try {
          const { error: trashError } = await supabase.from("chiqindilar").insert([{
            user_id: user.id,
            item_id: id,
            type: "linzaRoyxatlari",
            data: itemToDelete as any,
            deleted_at: getUzbekistanISOString(),
          }]);

          const { error } = await supabase
            .from("linza_royxatlari")
            .delete()
            .eq("id", id);

          if (error) throw error;

          await loadRoyxatlar();
          toast.success(t("lens.deleteSuccess"));
          setDeleteId(null);
          return true;
        } catch (error: any) {
          console.error("Error deleting linza royxat:", error);
          toast.error(t("common.error"));
          return false;
        } finally {
          setIsDeleting(false);
        }
      });
    }, t('network.operationRequiresConnection') || 'Bu amal internet aloqasini talab qiladi');
  }, [user, royxatlar, isDeleting, guardOperation, withDuplicatePrevention, isOperationPending, t]);

  const handleEdit = (item: LinzaRoyxat) => {
    setEditingItem(item);
  };

  const handleUpdate = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !user) return;

    if (isUpdating || isOperationPending(`linza-royxat-update-${editingItem.id}`)) {
      return;
    }

    await guardOperation(async () => {
      return await withDuplicatePrevention(`linza-royxat-update-${editingItem.id}`, async () => {
        setIsUpdating(true);
        try {
          const { error } = await supabase
            .from("linza_royxatlari")
            .update({
              sana: editingItem.sana,
              mijoz: editingItem.mijoz,
              od: editingItem.od,
              os: editingItem.os,
              telefon: editingItem.telefon,
              linza_turi: editingItem.linzaTuri,
              tugilan_yili: editingItem.tugilanYili,
            })
            .eq("id", editingItem.id);

          if (error) throw error;

          await loadRoyxatlar();
          setEditingItem(null);
          toast.success(t("edit.success"));
          return true;
        } catch (error: any) {
          console.error("Error updating linza royxat:", error);
          toast.error(t("common.error"));
          return false;
        } finally {
          setIsUpdating(false);
        }
      });
    }, t('network.operationRequiresConnection') || 'Bu amal internet aloqasini talab qiladi');
  }, [editingItem, user, isUpdating, guardOperation, withDuplicatePrevention, isOperationPending, t]);

  // Handle mark contacted
  const handleMarkContacted = useCallback(async (id: string) => {
    if (!user || !isOnline) return;
    
    try {
      const { error } = await supabase
        .from("linza_royxatlari")
        .update({ oxirgi_aloqa: getUzbekistanISOString() })
        .eq("id", id);
      
      if (error) throw error;
      
      // Update local state
      setRoyxatlar(prev => prev.map(r => 
        r.id === id ? { ...r, oxirgiAloqa: getUzbekistanISOString() } : r
      ));
      
      toast.success(t("lens.contactedSuccess"));
    } catch (error: any) {
      console.error("Error marking contacted:", error);
      toast.error(t("common.error"));
    }
  }, [user, isOnline, t]);

  // Helper functions for overdue detection
  const getMonthsSinceCheckup = (sana: string): number => {
    const today = new Date();
    const checkupDate = new Date(sana.split('-').reverse().join('-'));
    return differenceInMonths(today, checkupDate);
  };

  const getRowClassName = (sana: string): string => {
    const monthsDiff = getMonthsSinceCheckup(sana);
    
    if (monthsDiff >= 6) {
      return "bg-red-100 dark:bg-red-950/40 border-l-4 border-l-red-500";
    }
    if (monthsDiff >= 3) {
      return "bg-yellow-50 dark:bg-yellow-950/30 border-l-4 border-l-yellow-500";
    }
    return "";
  };

  const getOverdueIndicator = (sana: string) => {
    const monthsDiff = getMonthsSinceCheckup(sana);
    
    if (monthsDiff >= 6) {
      return (
        <Badge variant="destructive" className="text-xs font-medium">
          {monthsDiff} {t("lens.monthsAgo")}
        </Badge>
      );
    }
    if (monthsDiff >= 3) {
      return (
        <Badge variant="outline" className="text-xs font-medium border-yellow-500 text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/30">
          {monthsDiff} {t("lens.monthsAgo")}
        </Badge>
      );
    }
    return null;
  };

  // KPI Statistics
  const overdue3MonthsCount = royxatlar.filter(r => {
    const months = getMonthsSinceCheckup(r.sana);
    return months >= 3 && months < 6;
  }).length;

  const overdue6MonthsCount = royxatlar.filter(r => {
    return getMonthsSinceCheckup(r.sana) >= 6;
  }).length;

  const filteredRoyxatlar = royxatlar.filter((r) => {
    const query = searchQuery.toLowerCase().trim();
    const searchDigits = query.replace(/\D/g, "");
    const phoneDigits = r.telefon.replace(/\D/g, "");
    
    const matchesSearch = (
      r.mijoz.toLowerCase().includes(query) ||
      r.sana.includes(query) ||
      r.linzaTuri.toLowerCase().includes(query) ||
      (searchDigits && phoneDigits.includes(searchDigits))
    );

    if (!matchesSearch) return false;

    // Apply overdue filter
    const monthsDiff = getMonthsSinceCheckup(r.sana);
    if (overdueFilter === "3months" && monthsDiff < 3) return false;
    if (overdueFilter === "6months" && monthsDiff < 6) return false;

    if (dateFilter === "all") return true;

    const itemDate = new Date(r.sana.split('-').reverse().join('-'));
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    switch (dateFilter) {
      case "today":
        return itemDate.toDateString() === today.toDateString();
      case "yesterday":
        const yesterday = subDays(today, 1);
        return itemDate.toDateString() === yesterday.toDateString();
      case "thisWeek":
        const weekStart = startOfWeek(today, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
        return itemDate >= weekStart && itemDate <= weekEnd;
      case "lastWeek":
        const lastWeekStart = startOfWeek(subWeeks(today, 1), { weekStartsOn: 1 });
        const lastWeekEnd = endOfWeek(subWeeks(today, 1), { weekStartsOn: 1 });
        return itemDate >= lastWeekStart && itemDate <= lastWeekEnd;
      case "thisMonth":
        const monthStart = startOfMonth(today);
        const monthEnd = endOfMonth(today);
        return itemDate >= monthStart && itemDate <= monthEnd;
      case "lastMonth":
        const lastMonthStart = startOfMonth(subMonths(today, 1));
        const lastMonthEnd = endOfMonth(subMonths(today, 1));
        return itemDate >= lastMonthStart && itemDate <= lastMonthEnd;
      default:
        return true;
    }
  });

  const totalPages = Math.ceil(filteredRoyxatlar.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentRoyxatlar = filteredRoyxatlar.slice(startIndex, endIndex);

  const exportToExcel = () => {
    const dateTime = formatUzbekistanDateTime();
    
    // Metadata
    const metadata = [
      { [t("export.info")]: t("export.exportedBy"), [t("export.value")]: user?.email || t("export.unknown") },
      { [t("export.info")]: t("export.dateTime"), [t("export.value")]: dateTime },
    ];
    
    // Main data
    const data = filteredRoyxatlar.map((r) => {
      const monthsDiff = getMonthsSinceCheckup(r.sana);
      const overdueStatus = monthsDiff >= 6 ? `${monthsDiff} ${t("lens.monthsAgo")} ⚠️` : 
                           monthsDiff >= 3 ? `${monthsDiff} ${t("lens.monthsAgo")}` : "-";
      return {
        [t("lens.number")]: r.tartibRaqam,
        [t("common.date")]: formatDisplayDate(r.sana),
        [t("lens.lastCheckup")]: overdueStatus,
        [t("lens.client")]: r.mijoz,
        [t("lens.birthYear")]: r.tugilanYili || "",
        [t("form.rightEye")]: r.od,
        [t("form.leftEye")]: r.os,
        [t("lens.phone")]: r.telefon,
        [t("lens.lensType")]: r.linzaTuri,
      };
    });

    const metaWs = XLSX.utils.json_to_sheet(metadata);
    const dataWs = XLSX.utils.json_to_sheet(data);
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, dataWs, t("common.sheet"));
    XLSX.utils.book_append_sheet(wb, metaWs, t("common.metadata"));
    
    XLSX.writeFile(wb, `Linza_Royxati_${formatUzbekistanDate()}.xlsx`);
    toast.success(t("toast.excelSuccess"));
  };

  const exportToPDF = async () => {
    try {
      const doc = await setupPdfDoc('portrait', script);
      
      const startY = addPdfHeader(
        doc,
        t("lens.list"),
        user?.email,
        undefined,
        t("common.exportedBy"),
        t("common.dateAndTime")
      );

      const tableData = filteredRoyxatlar.map((r) => {
        const monthsDiff = getMonthsSinceCheckup(r.sana);
        const overdueStatus = monthsDiff >= 3 ? `${monthsDiff} ${t("lens.monthsAgo")}` : "-";
        return [
          r.tartibRaqam,
          formatDisplayDate(r.sana),
          overdueStatus,
          r.mijoz,
          r.tugilanYili || "",
          r.od,
          r.os,
          r.telefon,
          r.linzaTuri,
        ];
      });

      autoTable(doc, {
        startY,
        head: [[t("lens.number"), t("common.date"), t("lens.lastCheckup"), t("lens.client"), t("lens.birthYear"), 'OD', 'OS', t("lens.phone"), t("lens.lensType")]],
        body: tableData,
        styles: { 
          font: script === 'cyrillic' ? 'Roboto' : 'helvetica',
          fontSize: 10,
          cellPadding: 1.5,
          lineWidth: 0.5,
          lineColor: [200, 200, 200],
        },
        headStyles: { 
          fillColor: [52, 152, 219],
          textColor: 255,
          font: script === 'cyrillic' ? 'Roboto' : 'helvetica',
          fontStyle: 'normal',
          lineWidth: 0.5,
        },
        alternateRowStyles: { 
          fillColor: [245, 245, 245] 
        },
      });

    doc.save(`Linza_Royxati_${formatUzbekistanDate()}.pdf`);
    toast.success(t("toast.pdfSuccess"));
    } catch (error) {
      console.error("PDF eksport xatosi:", error);
      toast.error(t("toast.exportError"));
    }
  };

  const handlePrint = () => {
    const printContent = document.getElementById('printable-table');
    if (!printContent) {
      toast.error(t("toast.printTableNotFound"));
      return;
    }
    
    // Clone the table and remove action buttons
    const clonedTable = printContent.cloneNode(true) as HTMLElement;
    const actionCells = clonedTable.querySelectorAll('td:last-child, th:last-child');
    actionCells.forEach(cell => cell.remove());
    
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);
    
    const doc = iframe.contentWindow?.document;
    if (!doc) {
      toast.error(t("toast.printError"));
      document.body.removeChild(iframe);
      return;
    }
    
    doc.open();
    doc.write(`
      <html>
        <head>
          <title>${t("lens.list")}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { text-align: center; margin-bottom: 10px; font-size: 18px; }
            .print-date { text-align: center; color: #666; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
            th { background-color: #f2f2f2; font-weight: bold; }
            tr:nth-child(even) { background-color: #f9f9f9; }
            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          <h1>${t("lens.list")}</h1>
          <p class="print-date">${t("common.date")}: ${formatDisplayDate(formatUzbekistanDate())}</p>
          ${clonedTable.outerHTML}
        </body>
      </html>
    `);
    doc.close();
    
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 1000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">{t("lens.title")}</h2>
        <p className="text-muted-foreground">{t("lens.subtitle")}</p>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[200px] justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(selectedDate, "dd-MM-yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  disabled={(date) => date > new Date()}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
            <div>
              <Label htmlFor="mijoz">{t("form.clientName")}</Label>
              <Input
                id="mijoz"
                value={form.mijoz}
                onChange={(e) => setForm({ ...form, mijoz: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="tugilanYili">{t("lens.birthYear")}</Label>
              <Input
                id="tugilanYili"
                type="number"
                value={form.tugilanYili}
                onChange={(e) => setForm({ ...form, tugilanYili: e.target.value })}
                placeholder="1990"
                min="1900"
                max={new Date().getFullYear()}
              />
            </div>

            <div>
              <Label htmlFor="telefon">{t("form.phone")}</Label>
              <Input
                id="telefon"
                type="tel"
                value={form.telefon}
                onChange={(e) => {
                  setForm({ ...form, telefon: formatPhoneNumber(e.target.value) });
                }}
                placeholder="+998 90 123 45 67"
                required
              />
            </div>

            <div className="flex-1 min-w-[100px]">
              <Label htmlFor="od" className="text-xs">{t("form.rightEye")}</Label>
              <Input
                id="od"
                value={form.od}
                onChange={(e) => handleOdOsChange('od', e.target.value)}
                onBlur={(e) => handleOdOsBlur('od', e.target.value)}
                className="text-center"
                maxLength={15}
                required
              />
            </div>

            <div className="flex-1 min-w-[100px]">
              <Label htmlFor="os" className="text-xs">{t("form.leftEye")}</Label>
              <Input
                id="os"
                value={form.os}
                onChange={(e) => handleOdOsChange('os', e.target.value)}
                onBlur={(e) => handleOdOsBlur('os', e.target.value)}
                className="text-center"
                maxLength={15}
                required
              />
            </div>

            <div>
              <Label htmlFor="linzaTuri">{t("form.lensTypeRegistry")}</Label>
              <Input
                id="linzaTuri"
                value={form.linzaTuri}
                onChange={(e) => setForm({ ...form, linzaTuri: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-border">
            <Button 
              type="submit" 
              className="bg-primary hover:bg-primary/90"
              disabled={isSubmitting || !isOnline}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("common.loading")}
                </>
              ) : (
                t("lens.add")
              )}
            </Button>
          </div>
        </form>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card 
          className={`p-4 cursor-pointer transition-all ${overdueFilter === "all" ? "ring-2 ring-primary" : "hover:shadow-md"}`}
          onClick={() => setOverdueFilter("all")}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("lens.totalPatients")}</p>
              <p className="text-2xl font-bold">{royxatlar.length}</p>
            </div>
          </div>
        </Card>
        <Card 
          className={`p-4 cursor-pointer transition-all ${overdueFilter === "3months" ? "ring-2 ring-yellow-500" : "hover:shadow-md"}`}
          onClick={() => setOverdueFilter("3months")}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-950/50 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("lens.overdue3Months")}</p>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{overdue3MonthsCount + overdue6MonthsCount}</p>
            </div>
          </div>
        </Card>
        <Card 
          className={`p-4 cursor-pointer transition-all ${overdueFilter === "6months" ? "ring-2 ring-red-500" : "hover:shadow-md"}`}
          onClick={() => setOverdueFilter("6months")}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-950/50 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("lens.overdue6Months")}</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{overdue6MonthsCount}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="bg-card rounded-lg p-4 border border-border">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <h3 className="text-lg font-semibold">{t("lens.list")}</h3>
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Sana filtri" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("dateFilter.all")}</SelectItem>
                <SelectItem value="today">{t("dateFilter.today")}</SelectItem>
                <SelectItem value="yesterday">{t("dateFilter.yesterday")}</SelectItem>
                <SelectItem value="thisWeek">{t("dateFilter.thisWeek")}</SelectItem>
                <SelectItem value="lastWeek">{t("dateFilter.lastWeek")}</SelectItem>
                <SelectItem value="thisMonth">{t("dateFilter.thisMonth")}</SelectItem>
                <SelectItem value="lastMonth">{t("dateFilter.lastMonth")}</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-primary/60 w-4 h-4 pointer-events-none z-10" />
              <Input
                placeholder={t("lens.search")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-10"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0 hover:bg-transparent"
                >
                  <Trash2 className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={exportToExcel}
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                Excel
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={exportToPDF}
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                className="gap-2"
              >
                <Printer className="w-4 h-4" />
                Print
              </Button>
            </div>
          </div>
        </div>
        
        {isMobile ? (
          <div className="space-y-4">
            {currentRoyxatlar.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery ? t("lens.noResults") : t("lens.empty")}
              </div>
            ) : (
              currentRoyxatlar.map((r, index) => (
              <div key={r.id} className={`bg-card border border-border rounded-lg p-4 space-y-3 ${getRowClassName(r.sana)}`}>
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-lg">№ {startIndex + index + 1}</span>
                      {getOverdueIndicator(r.sana)}
                    </div>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="text-sm text-muted-foreground cursor-help">
                            {formatDisplayDate(r.sana)}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{formatUzbekistanDateTime(new Date(r.createdAt))}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div className="flex gap-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedPatient(r)}
                            className="h-8 w-8 p-0 text-blue-500 hover:text-blue-600 hover:bg-blue-50 hover:scale-110 transition-all duration-200"
                          >
                            <History className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{t("lens.viewHistory")}</p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(r)}
                            className="h-8 w-8 p-0 text-primary hover:text-primary hover:bg-primary/10 hover:scale-110 transition-all duration-200"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Tahrirlash</p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteId(r.id)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 hover:scale-110 transition-all duration-200"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>O'chirish</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
                
                 <div className="space-y-2 text-sm">
                  <div>
                     <span className="text-muted-foreground">{t("lens.client")}:</span>
                    <button 
                      onClick={() => setSelectedPatient(r)}
                      className="ml-2 font-medium text-primary hover:underline cursor-pointer"
                    >
                      {r.mijoz}
                    </button>
                  </div>
                  {r.tugilanYili && (
                    <div>
                      <span className="text-muted-foreground">{t("lens.birthYear")}:</span>
                      <span className="ml-2">{r.tugilanYili}</span>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-muted-foreground">OD:</span>
                      <span className="ml-2">{r.od}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">OS:</span>
                      <span className="ml-2">{r.os}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t("lens.phone")}:</span>
                    <span className="ml-2">{r.telefon}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t("lens.lensType")}:</span>
                    <span className="ml-2">{r.linzaTuri}</span>
                  </div>
                  {/* Contact toggle for overdue patients */}
                  {getMonthsSinceCheckup(r.sana) >= 3 && (
                    <div className="flex items-center justify-between pt-2 border-t border-border mt-2">
                      <div className="flex items-center gap-2">
                        {r.oxirgiAloqa ? (
                          <PhoneCall className="w-4 h-4 text-green-500" />
                        ) : (
                          <Phone className="w-4 h-4 text-muted-foreground" />
                        )}
                        <span className="text-sm">
                          {r.oxirgiAloqa 
                            ? `${t("lens.lastContact")}: ${formatDisplayDate(r.oxirgiAloqa.split('T')[0])}`
                            : t("lens.notContacted")
                          }
                        </span>
                      </div>
                      {!r.oxirgiAloqa && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleMarkContacted(r.id)}
                          className="text-green-600 border-green-300 hover:bg-green-50"
                          disabled={!isOnline}
                        >
                          {t("lens.contacted")}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            {currentRoyxatlar.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery ? t("lens.noResults") : t("lens.empty")}
              </div>
            ) : (
              <table id="printable-table" className="w-full">
              <thead className="bg-secondary text-secondary-foreground">
                <tr>
                  <th className="px-4 py-2 text-left">{t("lens.number")}</th>
                  <th className="px-4 py-2 text-left">{t("common.date")}</th>
                  <th className="px-4 py-2 text-left">{t("lens.lastCheckup")}</th>
                  <th className="px-4 py-2 text-center">{t("lens.contacted")}</th>
                  <th className="px-4 py-2 text-left">{t("lens.client")}</th>
                  <th className="px-4 py-2 text-left">{t("lens.birthYear")}</th>
                  <th className="px-4 py-2 text-left">{t("lens.phone")}</th>
                  <th className="px-4 py-2 text-center">OD</th>
                  <th className="px-4 py-2 text-center">OS</th>
                  <th className="px-4 py-2 text-left">{t("lens.lensType")}</th>
                  <th className="px-4 py-2 text-right"></th>
                </tr>
              </thead>
              <tbody>
                {currentRoyxatlar.map((r, index) => (
                  <tr key={r.id} className={`border-b border-border ${getRowClassName(r.sana)}`}>
                    <td className="px-4 py-2">{startIndex + index + 1}</td>
                    <td className="px-4 py-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-help">{formatDisplayDate(r.sana)}</span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{formatUzbekistanDateTime(new Date(r.createdAt))}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </td>
                    <td className="px-4 py-2">
                      {getOverdueIndicator(r.sana)}
                    </td>
                    <td className="px-4 py-2 text-center">
                      {getMonthsSinceCheckup(r.sana) >= 3 ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center justify-center">
                                <Switch
                                  checked={!!r.oxirgiAloqa}
                                  onCheckedChange={() => !r.oxirgiAloqa && handleMarkContacted(r.id)}
                                  disabled={!!r.oxirgiAloqa || !isOnline}
                                  className={r.oxirgiAloqa ? "data-[state=checked]:bg-green-500" : ""}
                                />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              {r.oxirgiAloqa 
                                ? `${t("lens.lastContact")}: ${formatDisplayDate(r.oxirgiAloqa.split('T')[0])}`
                                : t("lens.notContacted")
                              }
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <button 
                        onClick={() => setSelectedPatient(r)}
                        className="text-primary hover:underline cursor-pointer font-medium"
                      >
                        {r.mijoz}
                      </button>
                    </td>
                    <td className="px-4 py-2">{r.tugilanYili || "-"}</td>
                    <td className="px-4 py-2">{r.telefon}</td>
                    <td className="px-4 py-2 text-center">{r.od}</td>
                    <td className="px-4 py-2 text-center">{r.os}</td>
                    <td className="px-4 py-2">{r.linzaTuri}</td>
                    <td className="px-4 py-2 text-right">
                      <TooltipProvider>
                        <div className="flex gap-2 justify-end">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedPatient(r)}
                                className="h-8 w-8 p-0 text-blue-500 hover:text-blue-600 hover:bg-blue-50 hover:scale-110 transition-all duration-200"
                              >
                                <History className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{t("lens.viewHistory")}</p>
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(r)}
                                className="h-8 w-8 p-0 text-primary hover:text-primary hover:bg-primary/10 hover:scale-110 transition-all duration-200"
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Tahrirlash</p>
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeleteId(r.id)}
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 hover:scale-110 transition-all duration-200"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>O'chirish</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </TooltipProvider>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            )}
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-4 flex justify-center">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <PaginationItem key={page}>
                    <PaginationLink
                      onClick={() => setCurrentPage(page)}
                      isActive={currentPage === page}
                      className="cursor-pointer"
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <PaginationNext
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={() => deleteId && handleDelete(deleteId)}
        title={t("delete.confirm")}
        description={t("delete.confirmDesc")}
        confirmText={t("common.yes")}
        cancelText={t("common.no")}
      />

      <EditDialog
        open={editingItem !== null}
        onOpenChange={(open) => !open && setEditingItem(null)}
        title={t("edit.title")}
      >
        <form onSubmit={handleUpdate} className="space-y-3">
          <div className="border border-primary/30 bg-primary/5 rounded-md p-3 mb-4">
            <Label className="text-xs font-medium text-primary">{t("common.date")}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal h-9 text-sm mt-1.5"
                >
                  <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                  {editingItem?.sana ? formatDisplayDate(editingItem.sana) : t("common.date")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={editingItem?.sana ? new Date(editingItem.sana.split('-').reverse().join('-')) : undefined}
                  onSelect={(date) => {
                    if (date && editingItem) {
                      setEditingItem({
                        ...editingItem,
                        sana: formatUzbekistanDate(date)
                      });
                    }
                  }}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="edit-mijoz" className="text-xs">{t("form.clientName")}</Label>
              <Input
                id="edit-mijoz"
                value={editingItem?.mijoz || ""}
                onChange={(e) =>
                  setEditingItem(editingItem ? { ...editingItem, mijoz: e.target.value } : null)
                }
                required
                className="h-9"
              />
            </div>

            <div>
              <Label htmlFor="edit-tugilanYili" className="text-xs">{t("lens.birthYear")}</Label>
              <Input
                id="edit-tugilanYili"
                type="number"
                value={editingItem?.tugilanYili || ""}
                onChange={(e) =>
                  setEditingItem(editingItem ? { ...editingItem, tugilanYili: e.target.value ? parseInt(e.target.value) : null } : null)
                }
                placeholder="1990"
                min="1900"
                max={new Date().getFullYear()}
                className="h-9"
              />
            </div>

            <div>
              <Label htmlFor="edit-telefon" className="text-xs">{t("form.phone")}</Label>
              <Input
                id="edit-telefon"
                type="tel"
                value={editingItem?.telefon || "+998 "}
                onChange={(e) => {
                  setEditingItem(editingItem ? { ...editingItem, telefon: formatPhoneNumber(e.target.value) } : null);
                }}
                placeholder="+998 90 123 45 67"
                required
                className="h-9"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="edit-od" className="text-xs">{t("form.rightEye")}</Label>
              <Input
                id="edit-od"
                value={editingItem?.od || ""}
                onChange={(e) =>
                  setEditingItem(editingItem ? { ...editingItem, od: e.target.value } : null)
                }
                onBlur={(e) => {
                  if (editingItem) {
                    const formatted = formatOdOs(e.target.value);
                    if (formatted !== e.target.value) {
                      setEditingItem({ ...editingItem, od: formatted });
                    }
                  }
                }}
                required
                className="h-9 text-center"
                maxLength={15}
              />
            </div>
            <div>
              <Label htmlFor="edit-os" className="text-xs">{t("form.leftEye")}</Label>
              <Input
                id="edit-os"
                value={editingItem?.os || ""}
                onChange={(e) =>
                  setEditingItem(editingItem ? { ...editingItem, os: e.target.value } : null)
                }
                onBlur={(e) => {
                  if (editingItem) {
                    const formatted = formatOdOs(e.target.value);
                    if (formatted !== e.target.value) {
                      setEditingItem({ ...editingItem, os: formatted });
                    }
                  }
                }}
                required
                className="h-9 text-center"
                maxLength={15}
              />
            </div>
            <div>
              <Label htmlFor="edit-linzaTuri" className="text-xs">{t("form.lensTypeRegistry")}</Label>
              <Input
                id="edit-linzaTuri"
                value={editingItem?.linzaTuri || ""}
                onChange={(e) =>
                  setEditingItem(editingItem ? { ...editingItem, linzaTuri: e.target.value } : null)
                }
                required
                className="h-9"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button type="button" variant="outline" onClick={() => setEditingItem(null)} size="sm">
              {t("common.cancel")}
            </Button>
            <Button type="submit" size="sm">
              {t("common.save")}
            </Button>
          </div>
        </form>
      </EditDialog>

      <PatientCard
        open={selectedPatient !== null}
        onOpenChange={(open) => !open && setSelectedPatient(null)}
        patientId={selectedPatient?.id || ""}
        patientName={selectedPatient?.mijoz || ""}
        patientPhone={selectedPatient?.telefon || ""}
        currentOd={selectedPatient?.od || ""}
        currentOs={selectedPatient?.os || ""}
        currentLensType={selectedPatient?.linzaTuri || ""}
        currentDate={selectedPatient?.sana || ""}
        onUpdate={loadRoyxatlar}
      />
    </div>
  );
};

export default LinzaRoyxati;
