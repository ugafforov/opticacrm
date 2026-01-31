import { useState, useEffect, useCallback, useRef } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { PriceInput } from "@/components/PriceInput";
import { Card } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Trash2, Search, Pencil, Download, CalendarIcon, Printer, Loader2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, subWeeks, subMonths } from "date-fns";
import { exportDataToExcel } from '@/lib/excelExport';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EditDialog } from "@/components/EditDialog";
import { formatUzbekistanDate, getUzbekistanISOString, formatUzbekistanDateTime, formatDisplayDate } from "@/lib/utils";
import { setupPdfDoc, addPdfHeader } from "@/lib/pdfHelpers";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { useDataIntegrity } from "@/hooks/useDataIntegrity";
import { useOnlineGuard } from "@/hooks/useNetworkStatus";
import { safeSum } from "@/lib/safeCalculations";
import { logger } from "@/lib/logger";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface Tekshiruv {
  id: string;
  sana: string;
  createdAt: string;
  tartibRaqam: number;
  mijoz: string;
  refraksiyametriya: boolean;
  tanometriya: boolean;
  jamiSumma: number;
}

const Tekshiruv = () => {
  const { t, script } = useLanguage();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const { withDuplicatePrevention, isOperationPending } = useDataIntegrity();
  const { isOnline, guardOperation } = useOnlineGuard();
  
  const defaultClientName = script === 'cyrillic' ? "Мижоз" : "Mijoz";
  
  const [tekshiruvlar, setTekshiruvlar] = useState<Tekshiruv[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [dateFilter, setDateFilter] = useState<string>("today");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const [form, setForm] = useState({
    mijoz: defaultClientName,
    refraksiyametriya: false,
    tanometriya: false,
    narx: "",
  });
  const [editingItem, setEditingItem] = useState<Tekshiruv | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  // Caching refs to prevent re-fetching
  const hasLoadedRef = useRef(false);
  const isLoadingRef = useRef(false);

  useEffect(() => {
    if (user) {
      loadTekshiruvlar();
    }
  }, [user]);

  useEffect(() => {
    // Til o'zgarganda, agar mijoz maydoni standart qiymatda bo'lsa, yangilash
    const currentDefault = script === 'cyrillic' ? "Мижоз" : "Mijoz";
    const otherDefault = script === 'cyrillic' ? "Mijoz" : "Мижоз";
    
    if (form.mijoz === otherDefault || form.mijoz === "") {
      setForm(prev => ({ ...prev, mijoz: currentDefault }));
    }
  }, [script]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('tekshiruvlar-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'tekshiruvlar',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const newItem = mapToLocal(payload.new);
          setTekshiruvlar(prev => {
            // Remove any optimistic temp rows (we only allow 1 submit at a time)
            const withoutTemp = prev.filter(t => !t.id.startsWith('temp-'));
            if (withoutTemp.some(t => t.id === newItem.id)) return withoutTemp;
            return [newItem, ...withoutTemp];
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tekshiruvlar',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const updatedItem = mapToLocal(payload.new);
          setTekshiruvlar(prev => prev.map(t => t.id === updatedItem.id ? updatedItem : t));
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'tekshiruvlar',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          setTekshiruvlar(prev => prev.filter(t => t.id !== (payload.old as any).id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const mapToLocal = (item: any): Tekshiruv => ({
    id: item.id,
    sana: item.sana,
    createdAt: item.created_at,
    tartibRaqam: item.tartib_raqam,
    mijoz: item.mijoz,
    refraksiyametriya: item.refraksiyametriya,
    tanometriya: item.tanometriya,
    jamiSumma: item.jami_summa,
  });

  const loadTekshiruvlar = async (force = false) => {
    if (isLoadingRef.current) return;
    if (hasLoadedRef.current && !force) {
      setLoading(false);
      return;
    }
    
    isLoadingRef.current = true;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("tekshiruvlar")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setTekshiruvlar(data?.map(mapToLocal) || []);
      hasLoadedRef.current = true;
    } catch (error: any) {
      toast.error(t("toast.loadError"));
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  };

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error(t("toast.loginRequired"));
      return;
    }

    // Check if already submitting or offline
    if (isSubmitting || isOperationPending('tekshiruv-add')) {
      return;
    }

    // Guard against offline operations
    const result = await guardOperation(async () => {
      return await withDuplicatePrevention('tekshiruv-add', async () => {
        setIsSubmitting(true);
        
        try {
          const summa = parseInt(form.narx) || 0;

          // Get the maximum tartib_raqam for this user
          const { data: maxData, error: maxError } = await supabase
            .from("tekshiruvlar")
            .select("tartib_raqam")
            .eq("user_id", user.id)
            .order("tartib_raqam", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (maxError) throw maxError;

          const nextTartibRaqam = maxData ? maxData.tartib_raqam + 1 : 1;

          // Optimistic UI (so the row appears immediately with the success toast)
          const tempId = `temp-${Date.now()}`;
          const sana = formatUzbekistanDate(selectedDate);
          const optimisticItem: Tekshiruv = {
            id: tempId,
            sana,
            createdAt: new Date().toISOString(),
            tartibRaqam: nextTartibRaqam,
            mijoz: form.mijoz,
            refraksiyametriya: form.refraksiyametriya,
            tanometriya: form.tanometriya,
            jamiSumma: summa,
          };
          setTekshiruvlar(prev => [optimisticItem, ...prev]);

          const { data: created, error } = await supabase
            .from("tekshiruvlar")
            .insert({
              user_id: user.id,
              sana,
              tartib_raqam: nextTartibRaqam,
              mijoz: form.mijoz,
              refraksiyametriya: form.refraksiyametriya,
              tanometriya: form.tanometriya,
              jami_summa: summa,
            })
            .select("*")
            .single();

          if (error) throw error;

          // Replace temp row with real row (works even if realtime is delayed/off)
          if (created) {
            setTekshiruvlar(prev => prev.map(t => t.id === tempId ? mapToLocal(created) : t));
          }

          setSelectedDate(new Date());
          setForm({
            mijoz: script === 'cyrillic' ? "Мижоз" : "Mijoz",
            refraksiyametriya: false,
            tanometriya: false,
            narx: "",
          });

          toast.success(t("exam.addSuccess"));
          return true;
        } catch (error: any) {
          // Rollback optimistic row if insert failed
          setTekshiruvlar(prev => prev.filter(t => !t.id.startsWith('temp-')));
          toast.error(t("toast.saveError"));
          return false;
        } finally {
          setIsSubmitting(false);
        }
      });
    }, t('network.operationRequiresConnection') || 'Bu amal internet aloqasini talab qiladi');
  }, [user, form, selectedDate, script, isSubmitting, guardOperation, withDuplicatePrevention, isOperationPending, t]);

  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleDelete = useCallback(async () => {
    if (!deleteId || !user) return;
    
    const itemToDelete = tekshiruvlar.find((t) => t.id === deleteId);
    if (!itemToDelete) return;

    if (isDeleting || isOperationPending(`tekshiruv-delete-${deleteId}`)) {
      return;
    }

    await guardOperation(async () => {
      return await withDuplicatePrevention(`tekshiruv-delete-${deleteId}`, async () => {
        setIsDeleting(true);
        try {
          const { error: trashError } = await supabase.from("chiqindilar").insert([{
            user_id: user.id,
            item_id: deleteId,
            type: "tekshiruvlar",
            data: itemToDelete as any,
            deleted_at: getUzbekistanISOString(),
          }]);

          const { error } = await supabase
            .from("tekshiruvlar")
            .delete()
            .eq("id", deleteId);

          if (error) throw error;

          // Darhol ma'lumotlarni yangilash (real-time latency oldini olish)
          await loadTekshiruvlar(true);
          setDeleteId(null);
          toast.success(t("exam.deleteSuccess"));
          return true;
        } catch (error: any) {
          toast.error(t("toast.deleteError"));
          return false;
        } finally {
          setIsDeleting(false);
        }
      });
    }, t('network.operationRequiresConnection') || 'Bu amal internet aloqasini talab qiladi');
  }, [deleteId, user, tekshiruvlar, isDeleting, guardOperation, withDuplicatePrevention, isOperationPending, t]);

  const handleEdit = (item: Tekshiruv) => {
    setEditingItem(item);
  };

  const handleUpdate = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !user) return;

    if (isUpdating || isOperationPending(`tekshiruv-update-${editingItem.id}`)) {
      return;
    }

    await guardOperation(async () => {
      return await withDuplicatePrevention(`tekshiruv-update-${editingItem.id}`, async () => {
        setIsUpdating(true);
        try {
          const { error } = await supabase
            .from("tekshiruvlar")
            .update({
              sana: editingItem.sana,
              mijoz: editingItem.mijoz,
              refraksiyametriya: editingItem.refraksiyametriya,
              tanometriya: editingItem.tanometriya,
              jami_summa: editingItem.jamiSumma,
            })
            .eq("id", editingItem.id);

          if (error) throw error;

          // Darhol ma'lumotlarni yangilash
          await loadTekshiruvlar(true);
          setEditingItem(null);
          toast.success(t("common.updateSuccess"));
          return true;
        } catch (error: any) {
          toast.error(t("toast.updateError"));
          return false;
        } finally {
          setIsUpdating(false);
        }
      });
    }, t('network.operationRequiresConnection') || 'Bu amal internet aloqasini talab qiladi');
  }, [editingItem, user, isUpdating, guardOperation, withDuplicatePrevention, isOperationPending, t]);

  const filteredTekshiruvlar = tekshiruvlar.filter((t) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = (
      t.mijoz.toLowerCase().includes(query) ||
      t.sana.includes(query)
    );

    if (!matchesSearch) return false;

    if (dateFilter === "all") return true;

    const itemDate = new Date(t.sana.split('-').reverse().join('-'));
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

  const totalPages = Math.ceil(filteredTekshiruvlar.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentTekshiruvlar = filteredTekshiruvlar.slice(startIndex, endIndex);

  const totalSum = safeSum(filteredTekshiruvlar.map(t => t.jamiSumma));

  const handleExportToExcel = async () => {
    const dateTime = formatUzbekistanDateTime();
    
    // Metadata
    const metadata = [
      { [t("export.info")]: t("export.exportedBy"), [t("export.value")]: user?.email || t("export.unknown") },
      { [t("export.info")]: t("export.dateTime"), [t("export.value")]: dateTime },
      { [t("export.info")]: t("export.totalSum"), [t("export.value")]: `${totalSum.toLocaleString()} ${t("common.sum")}` },
    ];
    
    // Main data
    const data = filteredTekshiruvlar.map((tek) => ({
      [t("exam.number")]: tek.tartibRaqam,
      [t("common.date")]: formatDisplayDate(tek.sana),
      [t("exam.patient")]: tek.mijoz,
      [t("exam.refractometryShort")]: tek.refraksiyametriya ? t("common.yes") : t("common.no"),
      [t("exam.tonometryShort")]: tek.tanometriya ? t("common.yes") : t("common.no"),
      [t("exam.amount")]: tek.jamiSumma,
    }));

    try {
      await exportDataToExcel({
        fileName: `Tekshiruvlar_${formatUzbekistanDate()}.xlsx`,
        sheetName: t("common.sheet"),
        metadataSheetName: t("common.metadata"),
        data,
        metadata,
      });
      toast.success(t("toast.excelSuccess"));
    } catch (error) {
      toast.error(t("toast.exportError"));
    }
  };

  const exportToPDF = async () => {
    try {
      const doc = await setupPdfDoc('portrait', script);
      
      const startY = addPdfHeader(
        doc,
        t("exam.list"),
        user?.email,
        `${t("export.totalSum")}: ${totalSum.toLocaleString()} ${t("common.currency")}`,
        t("common.exportedBy"),
        t("common.dateAndTime")
      );

      const tableData = filteredTekshiruvlar.map((exam) => [
        exam.tartibRaqam,
        formatDisplayDate(exam.sana),
        exam.mijoz,
        (exam.refraksiyametriya ? t("exam.refractometryAbbr") : "") + (exam.refraksiyametriya && exam.tanometriya ? ", " : "") + (exam.tanometriya ? t("exam.tonometryAbbr") : ""),
        `${exam.jamiSumma.toLocaleString()} ${t("common.currency")}`,
      ]);

      autoTable(doc, {
        startY,
        head: [[t("exam.number"), t("common.date"), t("exam.patient"), t("exam.examinations"), t("exam.amount")]],
        body: tableData,
        styles: { 
          font: script === 'cyrillic' ? 'Roboto' : 'helvetica',
          fontSize: 10,
          cellPadding: 1.5,
          lineWidth: 0.5,
          lineColor: [200, 200, 200],
        },
        headStyles: { 
          fillColor: [46, 204, 113],
          textColor: 255,
          font: script === 'cyrillic' ? 'Roboto' : 'helvetica',
          fontStyle: 'normal',
          lineWidth: 0.5,
        },
        alternateRowStyles: { 
          fillColor: [245, 245, 245] 
        },
        columnStyles: {
          3: { halign: 'left' },
          4: { halign: 'center' },
        },
      });

    doc.save(`Tekshiruvlar_${formatUzbekistanDate()}.pdf`);
    toast.success(t("toast.pdfSuccess"));
    } catch (error) {
      logger.error("PDF eksport xatosi:", error);
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
          <title>${t("exam.list")}</title>
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
          <h1>${t("exam.list")}</h1>
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
        <h2 className="text-2xl font-bold text-foreground mb-2">{t("exam.title")}</h2>
        <p className="text-muted-foreground">{t("exam.subtitle")}</p>
      </div>

      <Card className="p-4 sm:p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full sm:w-[200px] justify-start text-left font-normal">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="mijoz" className="text-sm">{t("exam.patient")}</Label>
              <Input
                id="mijoz"
                value={form.mijoz}
                onChange={(e) => setForm({ ...form, mijoz: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm">{t("exam.examType")}</Label>
              <div className="space-y-2 pt-1">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="refraksiyametriya"
                    checked={form.refraksiyametriya}
                    onCheckedChange={(checked) => {
                      const newRefrak = checked as boolean;
                      const newSum = (newRefrak ? 50000 : 0) + (form.tanometriya ? 15000 : 0);
                      setForm({ ...form, refraksiyametriya: newRefrak, narx: newSum.toString() });
                    }}
                  />
                  <label
                    htmlFor="refraksiyametriya"
                    className="text-sm font-medium leading-none cursor-pointer"
                  >
                    {t("exam.refractometry")} — 50,000 {t("common.currency")}
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="tanometriya"
                    checked={form.tanometriya}
                    onCheckedChange={(checked) => {
                      const newTano = checked as boolean;
                      const newSum = (form.refraksiyametriya ? 50000 : 0) + (newTano ? 15000 : 0);
                      setForm({ ...form, tanometriya: newTano, narx: newSum.toString() });
                    }}
                  />
                  <label
                    htmlFor="tanometriya"
                    className="text-sm font-medium leading-none cursor-pointer"
                  >
                    {t("exam.tonometry")} — 15,000 {t("common.currency")}
                  </label>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="narx" className="text-sm">{t("exam.price")}</Label>
              <PriceInput
                id="narx"
                value={form.narx}
                onChange={(value) => setForm({ ...form, narx: value })}
                placeholder="0"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-border">
            <Button 
              type="submit" 
              className="w-full sm:w-auto bg-primary hover:bg-primary/90" 
              disabled={(!form.refraksiyametriya && !form.tanometriya) || isSubmitting || !isOnline}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("common.loading")}
                </>
              ) : (
                t("exam.add")
              )}
            </Button>
          </div>
        </form>
      </Card>

      <div className="bg-card rounded-lg p-3 sm:p-4 border border-border">
        {/* Header with title and total */}
        <div className="flex flex-col gap-3 mb-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-base sm:text-lg font-semibold">{t("exam.list")}</h3>
            <div className="text-sm sm:text-lg font-bold text-primary">
              {t("exam.total")}: {totalSum.toLocaleString()} {t("common.currency")}
            </div>
          </div>
          
          {/* Filters and actions row */}
          <div className="flex flex-col gap-2">
            {/* Date filter and search */}
            <div className="flex flex-col sm:flex-row gap-2">
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
              
              <div className="relative flex-1 sm:max-w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-primary/60 w-4 h-4 pointer-events-none z-10" />
                <Input
                  placeholder={t("exam.search")}
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
            </div>
            
            {/* Export buttons - compact on mobile */}
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={handleExportToExcel} className="gap-1.5 flex-1 sm:flex-none">
                <Download className="w-4 h-4" />
                <span className="hidden xs:inline">Excel</span>
              </Button>
              <Button variant="outline" size="sm" onClick={exportToPDF} className="gap-1.5 flex-1 sm:flex-none">
                <Download className="w-4 h-4" />
                <span className="hidden xs:inline">PDF</span>
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5 flex-1 sm:flex-none">
                <Printer className="w-4 h-4" />
                <span className="hidden xs:inline">Print</span>
              </Button>
            </div>
          </div>
        </div>
        
        {isMobile ? (
          <div className="space-y-4">
            {currentTekshiruvlar.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery ? t("exam.noResults") : t("exam.empty")}
              </div>
            ) : (
              currentTekshiruvlar.map((exam, index) => (
              <div key={exam.id} className="bg-card border border-border rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="font-semibold text-lg">№ {startIndex + index + 1}</div>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="text-sm text-muted-foreground cursor-help">
                            {formatDisplayDate(exam.sana)}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{formatUzbekistanDateTime(new Date(exam.createdAt))}</p>
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
                            onClick={() => handleEdit(exam)}
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
                            onClick={() => setDeleteId(exam.id)}
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
                    <span className="text-muted-foreground">{t("exam.patient")}:</span>
                    <span className="ml-2 font-medium">{exam.mijoz}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t("exam.examinations")}:</span>
                    <span className="ml-2">
                      {exam.refraksiyametriya && t("exam.refractometryShort")}
                      {exam.refraksiyametriya && exam.tanometriya && ", "}
                      {exam.tanometriya && t("exam.tonometryShort")}
                    </span>
                  </div>
                </div>
                
                <div className="pt-2 border-t border-border flex justify-between items-center">
                  <span className="text-muted-foreground text-sm">{t("exam.amount")}:</span>
                  <span className="text-lg font-bold">{exam.jamiSumma.toLocaleString()} {t("common.currency")}</span>
                </div>
              </div>
            ))
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            {currentTekshiruvlar.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery ? t("exam.noResults") : t("exam.empty")}
              </div>
            ) : (
              <table id="printable-table" className="w-full">
              <thead className="bg-secondary text-secondary-foreground">
                <tr>
                  <th className="px-4 py-2 text-left">{t("exam.number")}</th>
                  <th className="px-4 py-2 text-left">{t("common.date")}</th>
                  <th className="px-4 py-2 text-left">{t("exam.patient")}</th>
                  <th className="px-4 py-2 text-left">{t("exam.examinations")}</th>
                  <th className="px-4 py-2 text-center">{t("exam.amount")}</th>
                  <th className="px-4 py-2 text-right"></th>
                </tr>
              </thead>
              <tbody>
                {currentTekshiruvlar.map((exam, index) => (
                  <tr key={exam.id} className="border-b border-border">
                    <td className="px-4 py-2">{startIndex + index + 1}</td>
                    <td className="px-4 py-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-help">{formatDisplayDate(exam.sana)}</span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{formatUzbekistanDateTime(new Date(exam.createdAt))}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </td>
                    <td className="px-4 py-2">{exam.mijoz}</td>
                    <td className="px-4 py-2">
                      {exam.refraksiyametriya && t("exam.refractometryShort")}
                      {exam.refraksiyametriya && exam.tanometriya && ", "}
                      {exam.tanometriya && t("exam.tonometryShort")}
                    </td>
                    <td className="px-4 py-2 text-center font-semibold">
                      {exam.jamiSumma.toLocaleString()} {t("common.currency")}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <TooltipProvider>
                        <div className="flex gap-2 justify-end">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(exam)}
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
                                onClick={() => setDeleteId(exam.id)}
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
        onConfirm={handleDelete}
        title={t("common.confirmDelete")}
        description={t("common.confirmDeleteDesc")}
      />

      <EditDialog
        open={!!editingItem}
        onOpenChange={(open) => !open && setEditingItem(null)}
        title={t("common.edit")}
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

          <div>
            <Label htmlFor="edit-mijoz" className="text-xs">{t("exam.patient")}</Label>
            <Input
              id="edit-mijoz"
              value={editingItem?.mijoz || ""}
              onChange={(e) =>
                setEditingItem(
                  editingItem ? { ...editingItem, mijoz: e.target.value } : null
                )
              }
              required
              className="h-9"
            />
          </div>

          <div className="space-y-3">
            <div>
              <Label className="text-xs">{t("exam.examType")}</Label>
              <div className="space-y-2 pt-1">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="edit-refraksiyametriya"
                    checked={editingItem?.refraksiyametriya || false}
                    onCheckedChange={(checked) => {
                      if (editingItem) {
                        const newRefrak = checked as boolean;
                        const newSum = (newRefrak ? 50000 : 0) + (editingItem.tanometriya ? 15000 : 0);
                        setEditingItem({
                          ...editingItem,
                          refraksiyametriya: newRefrak,
                          jamiSumma: newSum,
                        });
                      }
                    }}
                  />
                  <label
                    htmlFor="edit-refraksiyametriya"
                    className="text-xs font-medium leading-none cursor-pointer"
                  >
                    {t("exam.refractometry")} — 50,000 {t("common.currency")}
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="edit-tanometriya"
                    checked={editingItem?.tanometriya || false}
                    onCheckedChange={(checked) => {
                      if (editingItem) {
                        const newTano = checked as boolean;
                        const newSum = (editingItem.refraksiyametriya ? 50000 : 0) + (newTano ? 15000 : 0);
                        setEditingItem({
                          ...editingItem,
                          tanometriya: newTano,
                          jamiSumma: newSum,
                        });
                      }
                    }}
                  />
                  <label
                    htmlFor="edit-tanometriya"
                    className="text-xs font-medium leading-none cursor-pointer"
                  >
                    {t("exam.tonometry")} — 15,000 {t("common.currency")}
                  </label>
                </div>
              </div>
            </div>

            <div>
              <Label className="text-xs">{t("exam.price")}</Label>
              <PriceInput
                value={editingItem?.jamiSumma?.toString() || "0"}
                onChange={(value) =>
                  setEditingItem(
                    editingItem ? { ...editingItem, jamiSumma: parseInt(value) || 0 } : null
                  )
                }
                className="h-9 mt-1"
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditingItem(null)}
              size="sm"
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" size="sm">{t("common.save")}</Button>
          </div>
        </form>
      </EditDialog>
    </div>
  );
};

export default Tekshiruv;
