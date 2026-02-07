import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SelectWithOther } from "@/components/SelectWithOther";
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
import { formatUzbekistanDate, getUzbekistanISOString, formatUzbekistanDateTime, formatDisplayDate, formatPrice, parsePrice } from "@/lib/utils";
import { PriceInput } from "@/components/PriceInput";
import { setupPdfDoc, addPdfHeader } from "@/lib/pdfHelpers";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { useDataIntegrity } from "@/hooks/useDataIntegrity";
import { useOnlineGuard } from "@/hooks/useNetworkStatus";
import { safeSum } from "@/lib/safeCalculations";
import { logger } from "@/lib/logger";
import { fetchAllRows } from "@/lib/supabaseHelpers";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface TayyorKozoynak {
  id: string;
  sana: string;
  createdAt: string;
  tartibRaqam: number;
  kliyent: string;
  kozoynakTuri: string;
  summa: number;
}

const TayyorKozoynaklar = () => {
  const { t, script } = useLanguage();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const { withDuplicatePrevention, isOperationPending } = useDataIntegrity();
  const { isOnline, guardOperation } = useOnlineGuard();

  // Mapping funksiya - ko'zoynak turlarini tarjimalash
  const getGlassesTypeTranslation = (glassesType: string): string => {
    const glassesMap: Record<string, string> = {
      "quyoshdan-himoya": t("ready.sunProtection"),
      "kompyuter-hameleon": t("ready.computerChameleon"),
      "kompyuter": t("ready.computer"),
      "zreniya": t("ready.vision"),
    };
    return glassesMap[glassesType] || glassesType;
  };
  
  const defaultClientName = script === 'cyrillic' ? "Мижоз" : "Mijoz";
  
  const [kozoynaklar, setKozoynaklar] = useState<TayyorKozoynak[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [dateFilter, setDateFilter] = useState<string>("today");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const [form, setForm] = useState({
    kliyent: defaultClientName,
    kozoynakTuri: "",
    summa: "",
  });
  const [editingItem, setEditingItem] = useState<TayyorKozoynak | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Caching refs to prevent re-fetching
  const hasLoadedRef = useRef(false);
  const isLoadingRef = useRef(false);

  useEffect(() => {
    if (user) {
      loadKozoynaklar();
    }
  }, [user]);

  useEffect(() => {
    // Til o'zgarganda, agar mijoz maydoni standart qiymatda bo'lsa, yangilash
    const currentDefault = script === 'cyrillic' ? "Мижоз" : "Mijoz";
    const otherDefault = script === 'cyrillic' ? "Mijoz" : "Мижоз";
    
    if (form.kliyent === otherDefault || form.kliyent === "") {
      setForm(prev => ({ ...prev, kliyent: currentDefault }));
    }
  }, [script]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('tayyor-kozoynaklar-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'tayyor_kozoynaklar',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const newItem = mapToLocal(payload.new);
          setKozoynaklar(prev => {
            const withoutTemp = prev.filter(k => !k.id.startsWith('temp-'));
            if (withoutTemp.some(k => k.id === newItem.id)) return withoutTemp;
            return [newItem, ...withoutTemp];
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tayyor_kozoynaklar',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const updatedItem = mapToLocal(payload.new);
          setKozoynaklar(prev => prev.map(k => k.id === updatedItem.id ? updatedItem : k));
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'tayyor_kozoynaklar',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          setKozoynaklar(prev => prev.filter(k => k.id !== (payload.old as any).id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const mapToLocal = (item: any): TayyorKozoynak => ({
    id: item.id,
    sana: item.sana,
    createdAt: item.created_at,
    tartibRaqam: item.tartib_raqam,
    kliyent: item.kliyent,
    kozoynakTuri: item.kozoynak_turi,
    summa: item.summa,
  });

  const loadKozoynaklar = async (force = false) => {
    if (isLoadingRef.current) return;
    if (hasLoadedRef.current && !force) {
      setLoading(false);
      return;
    }
    
    isLoadingRef.current = true;
    try {
      setLoading(true);
      const data = await fetchAllRows("tayyor_kozoynaklar", user!.id, {
        orderBy: "created_at",
        ascending: false,
      });

      setKozoynaklar(data.map(mapToLocal));
      hasLoadedRef.current = true;
    } catch (error: any) {
      logger.error("Error loading tayyor kozoynaklar:", error);
      toast.error(t("common.error"));
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
    if (isSubmitting || isOperationPending('tayyor-kozoynak-add')) {
      return;
    }

    // Guard against offline operations
    await guardOperation(async () => {
      return await withDuplicatePrevention('tayyor-kozoynak-add', async () => {
        setIsSubmitting(true);
        
        try {
          // Get the maximum tartib_raqam for this user
          const { data: maxData, error: maxError } = await supabase
            .from("tayyor_kozoynaklar")
            .select("tartib_raqam")
            .eq("user_id", user.id)
            .order("tartib_raqam", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (maxError) throw maxError;

          const nextTartibRaqam = maxData ? maxData.tartib_raqam + 1 : 1;

          const tempId = `temp-${Date.now()}`;
          const sana = formatUzbekistanDate(selectedDate);
          const optimisticItem: TayyorKozoynak = {
            id: tempId,
            sana,
            createdAt: new Date().toISOString(),
            tartibRaqam: nextTartibRaqam,
            kliyent: form.kliyent,
            kozoynakTuri: form.kozoynakTuri,
            summa: parseFloat(form.summa) || 0,
          };

          setKozoynaklar(prev => [optimisticItem, ...prev]);

          const { data: created, error } = await supabase
            .from("tayyor_kozoynaklar")
            .insert({
              user_id: user.id,
              sana,
              tartib_raqam: nextTartibRaqam,
              kliyent: form.kliyent,
              kozoynak_turi: form.kozoynakTuri,
              summa: parseFloat(form.summa) || 0,
            })
            .select("*")
            .single();

          if (error) throw error;

          if (created) {
            setKozoynaklar(prev => prev.map(k => k.id === tempId ? mapToLocal(created) : k));
          }

          setSelectedDate(new Date());
          setForm({
            kliyent: script === 'cyrillic' ? "Мижоз" : "Mijoz",
            kozoynakTuri: "",
            summa: "",
          });

          toast.success(t("ready.addSuccess"));
          return true;
        } catch (error: any) {
          logger.error("Error adding tayyor kozoynak:", error);
          setKozoynaklar(prev => prev.filter(k => !k.id.startsWith('temp-')));
          toast.error(t("common.error"));
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
    if (!deleteId || !user || isDeleting) return;
    
    if (isOperationPending(`tayyor-kozoynak-delete-${deleteId}`)) {
      return;
    }

    await guardOperation(async () => {
      return await withDuplicatePrevention(`tayyor-kozoynak-delete-${deleteId}`, async () => {
        setIsDeleting(true);
        const itemToDelete = kozoynaklar.find((k) => k.id === deleteId);
        if (!itemToDelete) return;

        try {
          const { error: trashError } = await supabase.from("chiqindilar").insert([{
            user_id: user.id,
            item_id: deleteId,
            type: "tayyorKozoynaklar",
            data: itemToDelete as any,
            deleted_at: getUzbekistanISOString(),
          }]);

          const { error } = await supabase
            .from("tayyor_kozoynaklar")
            .delete()
            .eq("id", deleteId);

          if (error) throw error;

          // Darhol ma'lumotlarni yangilash (real-time latency oldini olish)
          await loadKozoynaklar(true);
          setDeleteId(null);
          toast.success(t("ready.deleteSuccess"));
        } catch (error: any) {
          logger.error("Error deleting tayyor kozoynak:", error);
          toast.error(t("common.error"));
        } finally {
          setIsDeleting(false);
        }
      });
    }, t('network.operationRequiresConnection'));
  }, [deleteId, user, isDeleting, isOperationPending, guardOperation, withDuplicatePrevention, kozoynaklar, t]);

  const handleEdit = (item: TayyorKozoynak) => {
    setEditingItem(item);
  };

  const handleUpdate = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !user || isUpdating) return;

    if (isOperationPending(`tayyor-kozoynak-update-${editingItem.id}`)) {
      return;
    }

    await guardOperation(async () => {
      return await withDuplicatePrevention(`tayyor-kozoynak-update-${editingItem.id}`, async () => {
        setIsUpdating(true);
        try {
          const { error } = await supabase
            .from("tayyor_kozoynaklar")
            .update({
              sana: editingItem.sana,
              kliyent: editingItem.kliyent,
              kozoynak_turi: editingItem.kozoynakTuri,
              summa: editingItem.summa,
            })
            .eq("id", editingItem.id);

          if (error) throw error;

          // Darhol ma'lumotlarni yangilash
          await loadKozoynaklar(true);
          setEditingItem(null);
          toast.success(t("common.updateSuccess"));
        } catch (error: any) {
          logger.error("Error updating tayyor kozoynak:", error);
          toast.error(t("common.error"));
        } finally {
          setIsUpdating(false);
        }
      });
    }, t('network.operationRequiresConnection'));
  }, [editingItem, user, isUpdating, isOperationPending, guardOperation, withDuplicatePrevention, t]);

  const filteredKozoynaklar = kozoynaklar.filter((k) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = (
      k.kliyent.toLowerCase().includes(query) ||
      k.sana.includes(query)
    );

    if (!matchesSearch) return false;

    if (dateFilter === "all") return true;

    const itemDate = new Date(k.sana.split('-').reverse().join('-'));
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

  const totalPages = Math.ceil(filteredKozoynaklar.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentKozoynaklar = filteredKozoynaklar.slice(startIndex, endIndex);

  const totalSum = safeSum(filteredKozoynaklar.map(k => k.summa));

  const handleExportToExcel = async () => {
    const dateTime = formatUzbekistanDateTime();
    
    // Metadata
    const metadata = [
      { [t("export.info")]: t("export.exportedBy"), [t("export.value")]: user?.email || t("export.unknown") },
      { [t("export.info")]: t("export.dateTime"), [t("export.value")]: dateTime },
      { [t("export.info")]: t("export.totalSum"), [t("export.value")]: `${totalSum.toLocaleString()} ${t("common.sum")}` },
    ];
    
    // Main data
    const data = filteredKozoynaklar.map((k) => ({
      [t("orders.number")]: k.tartibRaqam,
      [t("common.date")]: formatDisplayDate(k.sana),
      [t("ready.client")]: k.kliyent,
      [t("ready.type")]: getGlassesTypeTranslation(k.kozoynakTuri),
      [t("ready.amount")]: k.summa,
    }));

    try {
      await exportDataToExcel({
        fileName: `Tayyor_Kozoynaklar_${formatUzbekistanDate()}.xlsx`,
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
        t("ready.list"),
        user?.email,
        `${t("export.totalSum")}: ${totalSum.toLocaleString()} ${t("common.sum")}`,
        t("common.exportedBy"),
        t("common.dateAndTime")
      );

      const tableData = filteredKozoynaklar.map((k) => [
        k.tartibRaqam,
        formatDisplayDate(k.sana),
        k.kliyent,
        getGlassesTypeTranslation(k.kozoynakTuri),
        `${k.summa.toLocaleString()} ${t("common.currency")}`,
      ]);

      autoTable(doc, {
        startY,
        head: [[t("orders.number"), t("common.date"), t("ready.client"), t("ready.type"), t("ready.amount")]],
        body: tableData,
        styles: { 
          font: script === 'cyrillic' ? 'Roboto' : 'helvetica',
          fontSize: 10,
          cellPadding: 1.5,
          lineWidth: 0.5,
          lineColor: [200, 200, 200],
        },
        headStyles: { 
          fillColor: [155, 89, 182],
          textColor: 255,
          font: script === 'cyrillic' ? 'Roboto' : 'helvetica',
          fontStyle: 'normal',
          lineWidth: 0.5,
        },
        alternateRowStyles: { 
          fillColor: [245, 245, 245] 
        },
        columnStyles: {
          4: { halign: 'center' },
        },
      });

    doc.save(`Tayyor_Kozoynaklar_${formatUzbekistanDate()}.pdf`);
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
          <title>${t("ready.list")}</title>
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
          <h1>${t("ready.list")}</h1>
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
        <h2 className="text-2xl font-bold text-foreground mb-2">{t("ready.title")}</h2>
        <p className="text-muted-foreground">{t("ready.subtitle")}</p>
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
            <div>
              <Label htmlFor="kliyent" className="text-sm">{t("ready.client")}</Label>
              <Input
                id="kliyent"
                value={form.kliyent}
                onChange={(e) => setForm({ ...form, kliyent: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="kozoynakTuri" className="text-sm">{t("ready.type")}</Label>
              <SelectWithOther
                id="kozoynakTuri"
                value={form.kozoynakTuri}
                onChange={(value) => setForm({ ...form, kozoynakTuri: value })}
                options={[
                  { value: "quyoshdan-himoya", label: t("ready.sunProtection") },
                  { value: "kompyuter-hameleon", label: t("ready.computerChameleon") },
                  { value: "kompyuter", label: t("ready.computer") },
                  { value: "zreniya", label: t("ready.vision") },
                ]}
                placeholder={t("lensSale.select")}
                otherLabel={t("form.other")}
                customInputLabel={t("form.enterCustomValue")}
              />
            </div>

            <div>
              <Label htmlFor="summa" className="text-sm">{t("ready.amount")} ({t("common.sum")})</Label>
              <PriceInput
                id="summa"
                value={form.summa}
                onChange={(value) => setForm({ ...form, summa: value })}
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-border">
            <Button 
              type="submit" 
              className="w-full sm:w-auto bg-primary hover:bg-primary/90"
              disabled={isSubmitting || !isOnline}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("common.loading")}
                </>
              ) : (
                t("ready.add")
              )}
            </Button>
          </div>
        </form>
      </Card>

      <div className="bg-card rounded-lg p-3 sm:p-4 border border-border">
        {/* Header with title and total */}
        <div className="flex flex-col gap-3 mb-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-base sm:text-lg font-semibold">{t("ready.list")}</h3>
            <div className="text-sm sm:text-lg font-bold text-primary">
              {t("orders.total")}: {formatPrice(totalSum)} {t("common.currency")}
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
                  placeholder={t("ready.search")}
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
            {currentKozoynaklar.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery ? "Qidiruv bo'yicha natija topilmadi" : "Hozircha ko'zoynaklar yo'q"}
              </div>
            ) : (
              currentKozoynaklar.map((k, index) => (
              <div key={k.id} className="bg-card border border-border rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="font-semibold text-lg">№ {startIndex + index + 1}</div>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="text-sm text-muted-foreground cursor-help">
                            {formatDisplayDate(k.sana)}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{formatUzbekistanDateTime(new Date(k.createdAt))}</p>
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
                            onClick={() => handleEdit(k)}
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
                            onClick={() => setDeleteId(k.id)}
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
                    <span className="text-muted-foreground">{t("ready.client")}:</span>
                    <span className="ml-2 font-medium">{k.kliyent}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t("ready.type")}:</span>
                    <span className="ml-2">{getGlassesTypeTranslation(k.kozoynakTuri)}</span>
                  </div>
                </div>
                
                <div className="pt-2 border-t border-border flex justify-between items-center">
                  <span className="text-muted-foreground text-sm">{t("ready.amount")}:</span>
                  <span className="text-lg font-bold">{formatPrice(k.summa)} {t("common.currency")}</span>
                </div>
              </div>
            ))
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            {currentKozoynaklar.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery ? "Qidiruv bo'yicha natija topilmadi" : "Hozircha ko'zoynaklar yo'q"}
              </div>
            ) : (
              <table id="printable-table" className="w-full">
              <thead className="bg-secondary text-secondary-foreground">
                <tr>
                  <th className="px-4 py-2 text-left">{t("orders.number")}</th>
                  <th className="px-4 py-2 text-left">{t("common.date")}</th>
                  <th className="px-4 py-2 text-left">{t("ready.client")}</th>
                  <th className="px-4 py-2 text-left">{t("ready.type")}</th>
                  <th className="px-4 py-2 text-center">{t("ready.amount")}</th>
                  <th className="px-4 py-2 text-right"></th>
                </tr>
              </thead>
              <tbody>
                {currentKozoynaklar.map((k, index) => (
                  <tr key={k.id} className="border-b border-border">
                    <td className="px-4 py-2">{startIndex + index + 1}</td>
                    <td className="px-4 py-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-help">{formatDisplayDate(k.sana)}</span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{formatUzbekistanDateTime(new Date(k.createdAt))}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </td>
                    <td className="px-4 py-2">{k.kliyent}</td>
                    <td className="px-4 py-2">{getGlassesTypeTranslation(k.kozoynakTuri)}</td>
                    <td className="px-4 py-2 text-center font-semibold">
                      {formatPrice(k.summa)} {t("common.currency")}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <TooltipProvider>
                        <div className="flex gap-2 justify-end">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(k)}
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
                                onClick={() => setDeleteId(k.id)}
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="edit-kliyent" className="text-xs">{t("ready.client")}</Label>
              <Input
                id="edit-kliyent"
                value={editingItem?.kliyent || ""}
                onChange={(e) =>
                  setEditingItem(
                    editingItem ? { ...editingItem, kliyent: e.target.value } : null
                  )
                }
                required
                className="h-9"
              />
            </div>

            <div>
              <Label htmlFor="edit-summa" className="text-xs">{t("ready.amount")}</Label>
              <PriceInput
                id="edit-summa"
                value={editingItem?.summa || ""}
                onChange={(value) =>
                  setEditingItem(
                    editingItem
                      ? { ...editingItem, summa: parseFloat(value) || 0 }
                      : null
                  )
                }
                className="h-9"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="edit-kozoynakTuri" className="text-xs">{t("ready.type")}</Label>
            <SelectWithOther
              id="edit-kozoynakTuri"
              value={editingItem?.kozoynakTuri || ""}
              onChange={(value) =>
                setEditingItem(
                  editingItem ? { ...editingItem, kozoynakTuri: value } : null
                )
              }
              options={[
                { value: "quyoshdan-himoya", label: t("ready.sunProtection") },
                { value: "kompyuter-hameleon", label: t("ready.computerChameleon") },
                { value: "kompyuter", label: t("ready.computer") },
                { value: "zreniya", label: t("ready.vision") },
              ]}
              otherLabel={t("form.other")}
              customInputLabel={t("form.enterCustomValue")}
            />
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

export default TayyorKozoynaklar;
