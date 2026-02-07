import { useState, useMemo, useCallback } from "react";
import { useDataIntegrity } from "@/hooks/useDataIntegrity";
import { useOnlineGuard } from "@/hooks/useNetworkStatus";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Trash2, Search, Pencil, Download, CalendarIcon, Printer, Users, PhoneCall, CreditCard, History, Check, Clock, AlertTriangle, AlertCircle, TrendingUp, ArrowUpDown, Banknote } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format, differenceInDays } from "date-fns";
import { exportDataToExcel } from '@/lib/excelExport';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EditDialog } from "@/components/EditDialog";
import { formatUzbekistanDate, formatUzbekistanDateTime, formatDisplayDate } from "@/lib/utils";
import { PriceInput } from "@/components/PriceInput";
import { setupPdfDoc, addPdfHeader } from "@/lib/pdfHelpers";
import { useQarzdorlar, Qarzdor, QarzTolovi, DebtorStatus } from "@/hooks/useQarzdorlar";
import { safeSum } from "@/lib/safeCalculations";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { logger } from "@/lib/logger";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

type SortOption = "date" | "amount" | "name";

const Qarzdorlar = () => {
  const { t, script } = useLanguage();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const { withDuplicatePrevention, isOperationPending } = useDataIntegrity();
  const { isOnline, guardOperation } = useOnlineGuard();
  const { 
    qarzdorlar, 
    loading, 
    isSubmitting,
    addQarzdor, 
    updateQarzdor, 
    deleteQarzdor,
    addPayment,
    getPaymentHistory,
    deletePayment,
    toggleContacted,
    getDebtAgeCategory
  } = useQarzdorlar();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [statusFilter, setStatusFilter] = useState<DebtorStatus>("all");
  const [showOverdueOnly, setShowOverdueOnly] = useState(false);
  const [sortOption, setSortOption] = useState<SortOption>("date");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  
  const [form, setForm] = useState({
    mijoz: "",
    telefon: "",
    qarzSummasi: "",
    izoh: "",
  });
  
  const [editingItem, setEditingItem] = useState<Qarzdor | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isPaymentSubmitting, setIsPaymentSubmitting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Payment dialog states
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentQarzdor, setPaymentQarzdor] = useState<Qarzdor | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState<Date>(new Date());
  const [paymentNote, setPaymentNote] = useState("");
  
  // Payment history dialog states
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [historyQarzdor, setHistoryQarzdor] = useState<Qarzdor | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<QarzTolovi[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Calculate KPI stats
  const kpiStats = useMemo(() => {
    const totalDebt = safeSum(qarzdorlar.map(x => x.qoldiqSumma));
    const today = new Date();
    
    const overdueItems = qarzdorlar.filter(x => {
      if (x.holat === "tollangan") return false;
      const debtDate = new Date(x.sana.split('-').reverse().join('-'));
      return differenceInDays(today, debtDate) > 30;
    });
    
    const overdueDebt = safeSum(overdueItems.map(x => x.qoldiqSumma));
    
    const overdueCount = qarzdorlar.filter(x => {
      if (x.holat === "tollangan") return false;
      const debtDate = new Date(x.sana.split('-').reverse().join('-'));
      return differenceInDays(today, debtDate) > 30;
    }).length;

    const totalCount = qarzdorlar.filter(x => x.holat !== "tollangan").length;

    return { totalDebt, overdueDebt, overdueCount, totalCount };
  }, [qarzdorlar]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    const success = await addQarzdor({
      sana: selectedDate,
      mijoz: form.mijoz,
      telefon: form.telefon,
      qarzSummasi: parseFloat(form.qarzSummasi) || 0,
      izoh: form.izoh,
    });

    if (success) {
      setSelectedDate(new Date());
      setForm({
        mijoz: "",
        telefon: "",
        qarzSummasi: "",
        izoh: "",
      });
    }
  }, [addQarzdor, selectedDate, form]);

  const handleDelete = useCallback(async () => {
    if (!deleteId) return;
    await deleteQarzdor(deleteId);
    setDeleteId(null);
  }, [deleteId, deleteQarzdor]);

  const handleEdit = (item: Qarzdor) => {
    setEditingItem(item);
  };

  const handleUpdate = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || isUpdating) return;

    if (isOperationPending(`qarzdor-update-${editingItem.id}`)) {
      return;
    }

    setIsUpdating(true);
    const success = await updateQarzdor(editingItem.id, {
      sana: editingItem.sana,
      mijoz: editingItem.mijoz,
      telefon: editingItem.telefon,
      qarzSummasi: editingItem.qarzSummasi,
      izoh: editingItem.izoh,
    });

    if (success) {
      setEditingItem(null);
    }
    setIsUpdating(false);
  }, [editingItem, isUpdating, isOperationPending, updateQarzdor]);

  // Payment handlers
  const openPaymentDialog = (qarzdor: Qarzdor) => {
    setPaymentQarzdor(qarzdor);
    setPaymentAmount("");
    setPaymentDate(new Date());
    setPaymentNote("");
    setPaymentDialogOpen(true);
  };

  const handleAddPayment = useCallback(async () => {
    if (!paymentQarzdor || !paymentAmount || isPaymentSubmitting) return;
    
    if (isOperationPending(`payment-add-${paymentQarzdor.id}`)) {
      return;
    }

    setIsPaymentSubmitting(true);
    const success = await addPayment(paymentQarzdor.id, {
      summa: parseFloat(paymentAmount) || 0,
      sana: paymentDate,
      izoh: paymentNote,
    });

    if (success) {
      setPaymentDialogOpen(false);
      setPaymentQarzdor(null);
    }
    setIsPaymentSubmitting(false);
  }, [paymentQarzdor, paymentAmount, paymentDate, paymentNote, isPaymentSubmitting, isOperationPending, addPayment]);
  const openHistoryDialog = async (qarzdor: Qarzdor) => {
    setHistoryQarzdor(qarzdor);
    setHistoryDialogOpen(true);
    setLoadingHistory(true);
    const history = await getPaymentHistory(qarzdor.id);
    setPaymentHistory(history);
    setLoadingHistory(false);
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (!historyQarzdor) return;
    await deletePayment(paymentId, historyQarzdor.id);
    const history = await getPaymentHistory(historyQarzdor.id);
    setPaymentHistory(history);
  };

  const handleToggleContacted = async (id: string, currentStatus: string | null) => {
    await toggleContacted(id, currentStatus);
  };

  // Get status badge - simplified with clear colors
  const getStatusBadge = (holat: Qarzdor["holat"]) => {
    switch (holat) {
      case "tollangan":
        return <Badge className="bg-green-500 hover:bg-green-600 text-white"><Check className="w-3 h-3 mr-1" />{t("debtors.statusPaid")}</Badge>;
      case "qisman":
        return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white"><Clock className="w-3 h-3 mr-1" />{t("debtors.statusPartial")}</Badge>;
      default:
        return <Badge className="bg-red-500 hover:bg-red-600 text-white"><AlertCircle className="w-3 h-3 mr-1" />{t("debtors.statusUnpaid")}</Badge>;
    }
  };

  // Get row background color based on age - PDF spec: 30+ kun = qizil background
  const getRowClassName = (qarzdor: Qarzdor) => {
    if (qarzdor.holat === "tollangan") return "bg-green-50 dark:bg-green-950/30";
    
    const today = new Date();
    const debtDate = new Date(qarzdor.sana.split('-').reverse().join('-'));
    const daysDiff = differenceInDays(today, debtDate);
    
    if (daysDiff > 30) return "bg-red-100 dark:bg-red-950/40 border-l-4 border-l-red-500";
    if (daysDiff > 15) return "bg-yellow-50 dark:bg-yellow-950/30 border-l-4 border-l-yellow-500";
    return "";
  };

  // Get debt age indicator text
  const getAgeIndicator = (sana: string, holat: Qarzdor["holat"]) => {
    if (holat === "tollangan") return null;
    
    const today = new Date();
    const debtDate = new Date(sana.split('-').reverse().join('-'));
    const daysDiff = differenceInDays(today, debtDate);
    
    if (daysDiff > 30) {
      return <span className="text-xs font-medium text-red-600 dark:text-red-400">{daysDiff} {script === 'cyrillic' ? 'кун' : 'kun'}</span>;
    }
    if (daysDiff > 15) {
      return <span className="text-xs font-medium text-yellow-600 dark:text-yellow-400">{daysDiff} {script === 'cyrillic' ? 'кун' : 'kun'}</span>;
    }
    return <span className="text-xs text-muted-foreground">{daysDiff} {script === 'cyrillic' ? 'кун' : 'kun'}</span>;
  };

  // Filtered and sorted data
  const filteredQarzdorlar = useMemo(() => {
    let result = qarzdorlar.filter((x) => {
      const query = searchQuery.toLowerCase();
      const matchesSearch = (
        x.mijoz.toLowerCase().includes(query) ||
        x.telefon.toLowerCase().includes(query) ||
        x.izoh.toLowerCase().includes(query)
      );

      if (!matchesSearch) return false;

      // Status filter
      if (statusFilter !== "all" && x.holat !== statusFilter) return false;

      // Overdue filter (30+ days)
      if (showOverdueOnly) {
        if (x.holat === "tollangan") return false;
        const today = new Date();
        const debtDate = new Date(x.sana.split('-').reverse().join('-'));
        if (differenceInDays(today, debtDate) <= 30) return false;
      }

      return true;
    });

    // Sort
    result.sort((a, b) => {
      switch (sortOption) {
        case "amount":
          return b.qoldiqSumma - a.qoldiqSumma;
        case "name":
          return a.mijoz.localeCompare(b.mijoz);
        case "date":
        default:
          const dateA = new Date(a.sana.split('-').reverse().join('-'));
          const dateB = new Date(b.sana.split('-').reverse().join('-'));
          return dateB.getTime() - dateA.getTime();
      }
    });

    return result;
  }, [qarzdorlar, searchQuery, statusFilter, showOverdueOnly, sortOption]);

  const totalPages = Math.ceil(filteredQarzdorlar.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentQarzdorlar = filteredQarzdorlar.slice(startIndex, endIndex);

  const formatPrice = (price: number) => {
    return price.toLocaleString('uz-UZ');
  };

  const handleExportToExcel = async () => {
    const dateTime = formatUzbekistanDateTime();
    
    const metadata = [
      { [t("export.info")]: t("export.exportedBy"), [t("export.value")]: user?.email || t("export.unknown") },
      { [t("export.info")]: t("export.dateTime"), [t("export.value")]: dateTime },
      { [t("export.info")]: t("debtors.totalRemaining"), [t("export.value")]: `${kpiStats.totalDebt.toLocaleString()} ${t("common.sum")}` },
    ];
    
    const data = filteredQarzdorlar.map((x) => ({
      [t("orders.number")]: x.tartibRaqam,
      [t("common.date")]: formatDisplayDate(x.sana),
      [t("debtors.debtorName")]: x.mijoz,
      [t("debtors.debtorPhone")]: x.telefon,
      [t("debtors.debtAmount")]: x.qarzSummasi,
      [t("debtors.remainingAmount")]: x.qoldiqSumma,
      [t("debtors.status")]: x.holat === "tollangan" ? t("debtors.statusPaid") : x.holat === "qisman" ? t("debtors.statusPartial") : t("debtors.statusUnpaid"),
      [t("debtors.note")]: x.izoh,
    }));

    try {
      await exportDataToExcel({
        fileName: `Qarzdorlar_${formatUzbekistanDate()}.xlsx`,
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
      const doc = await setupPdfDoc('landscape', script);
      
      const startY = addPdfHeader(
        doc,
        t("debtors.list"),
        user?.email,
        `${t("debtors.totalRemaining")}: ${kpiStats.totalDebt.toLocaleString()} ${t("common.sum")}`,
        t("common.exportedBy"),
        t("common.dateAndTime")
      );

      const tableData = filteredQarzdorlar.map((x) => [
        x.tartibRaqam,
        formatDisplayDate(x.sana),
        x.mijoz,
        x.telefon,
        `${x.qarzSummasi.toLocaleString()} ${t("common.currency")}`,
        `${x.qoldiqSumma.toLocaleString()} ${t("common.currency")}`,
        x.holat === "tollangan" ? t("debtors.statusPaid") : x.holat === "qisman" ? t("debtors.statusPartial") : t("debtors.statusUnpaid"),
        x.izoh,
      ]);

      autoTable(doc, {
        startY,
        head: [[t("orders.number"), t("common.date"), t("debtors.debtorName"), t("debtors.debtorPhone"), t("debtors.debtAmount"), t("debtors.remainingAmount"), t("debtors.status"), t("debtors.note")]],
        body: tableData,
        styles: { 
          font: script === 'cyrillic' ? 'Roboto' : 'helvetica',
          fontSize: 9,
          cellPadding: 1.5,
          lineWidth: 0.5,
          lineColor: [200, 200, 200],
        },
        headStyles: { 
          fillColor: [192, 57, 43],
          textColor: 255,
          font: script === 'cyrillic' ? 'Roboto' : 'helvetica',
          fontStyle: 'normal',
          lineWidth: 0.5,
        },
        alternateRowStyles: { 
          fillColor: [245, 245, 245] 
        },
        columnStyles: {
          4: { halign: 'right' },
          5: { halign: 'right' },
        },
      });

      doc.save(`Qarzdorlar_${formatUzbekistanDate()}.pdf`);
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
          <title>${t("debtors.list")}</title>
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
          <h1>${t("debtors.list")}</h1>
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
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2 flex items-center gap-2">
          <Users className="w-6 h-6" />
          {t("debtors.title")}
        </h2>
        <p className="text-muted-foreground">{t("debtors.subtitle")}</p>
      </div>

      {/* KPI Cards - PDF Spec requirement */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Debt Card */}
        <Card className="p-4 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/20 rounded-lg">
              <Banknote className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("debtors.totalRemaining")}</p>
              <p className="text-2xl font-bold text-primary">{formatPrice(kpiStats.totalDebt)}</p>
              <p className="text-xs text-muted-foreground">{t("common.currency")}</p>
            </div>
          </div>
        </Card>

        {/* Overdue Debt Card */}
        <Card className="p-4 bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/20">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-500/20 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("debtors.overdueDebt")}</p>
              <p className="text-2xl font-bold text-red-500">{formatPrice(kpiStats.overdueDebt)}</p>
              <p className="text-xs text-muted-foreground">{t("debtors.overdue30Days")}</p>
            </div>
          </div>
        </Card>

        {/* Debtors Count Card */}
        <Card className="p-4 bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-500/20 rounded-lg">
              <Users className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("debtors.debtorsCount")}</p>
              <p className="text-2xl font-bold text-blue-500">{kpiStats.totalCount}</p>
              <p className="text-xs text-red-500">{kpiStats.overdueCount} {t("debtors.overdueDebtors")}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Add Form */}
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

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <Label htmlFor="mijoz">{t("debtors.debtorName")}</Label>
              <Input
                id="mijoz"
                value={form.mijoz}
                onChange={(e) => setForm({ ...form, mijoz: e.target.value })}
                placeholder={t("debtors.debtorNamePlaceholder")}
                required
              />
            </div>

            <div>
              <Label htmlFor="telefon">{t("debtors.debtorPhone")}</Label>
              <Input
                id="telefon"
                value={form.telefon}
                onChange={(e) => setForm({ ...form, telefon: e.target.value })}
                placeholder={t("debtors.debtorPhonePlaceholder")}
              />
            </div>

            <div>
              <Label htmlFor="qarzSummasi">{t("debtors.debtAmount")}</Label>
              <PriceInput
                value={form.qarzSummasi}
                onChange={(value) => setForm({ ...form, qarzSummasi: value })}
                placeholder="0"
              />
            </div>

            <div>
              <Label htmlFor="izoh">{t("debtors.note")}</Label>
              <Input
                id="izoh"
                value={form.izoh}
                onChange={(e) => setForm({ ...form, izoh: e.target.value })}
                placeholder={t("debtors.notePlaceholder")}
              />
            </div>

            <div className="flex items-end">
              <Button 
                type="submit" 
                className="w-full" 
                disabled={!form.mijoz || !form.qarzSummasi || isSubmitting || !isOnline}
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t("common.add")}
              </Button>
            </div>
          </div>
        </form>
      </Card>

      {/* Main Table Section */}
      <div className="bg-card rounded-lg p-4 border border-border">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <h3 className="text-lg font-semibold">{t("debtors.list")}</h3>
        </div>

        {/* Status tabs */}
        <Tabs value={statusFilter} onValueChange={(v) => { setStatusFilter(v as DebtorStatus); setCurrentPage(1); }} className="w-full mb-4">
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="all">{t("debtors.statusAll")}</TabsTrigger>
            <TabsTrigger value="tollanmagan">{t("debtors.statusUnpaid")}</TabsTrigger>
            <TabsTrigger value="qisman">{t("debtors.statusPartial")}</TabsTrigger>
            <TabsTrigger value="tollangan">{t("debtors.statusPaid")}</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Search, Quick Filters, Sort, and Export - all in one row */}
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center mb-4">
          {/* Search */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4 pointer-events-none z-10" />
            <Input
              placeholder={t("orders.search")}
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
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

          {/* Quick Filter - Overdue 30+ days */}
          <Button
            variant={showOverdueOnly ? "destructive" : "outline"}
            size="sm"
            onClick={() => { setShowOverdueOnly(!showOverdueOnly); setCurrentPage(1); }}
            className="gap-2 whitespace-nowrap"
          >
            <AlertTriangle className="w-4 h-4" />
            {t("debtors.overdue30Days")}
          </Button>

          {/* Sort dropdown */}
          <Select value={sortOption} onValueChange={(v) => setSortOption(v as SortOption)}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <ArrowUpDown className="w-4 h-4 mr-2" />
              <SelectValue placeholder={t("debtors.sortBy")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">{t("debtors.sortByDate")}</SelectItem>
              <SelectItem value="amount">{t("debtors.sortByAmount")}</SelectItem>
              <SelectItem value="name">{t("debtors.sortByName")}</SelectItem>
            </SelectContent>
          </Select>

          {/* Export buttons */}
          <div className="flex gap-2 sm:ml-auto">
            <Button variant="outline" size="sm" onClick={handleExportToExcel} className="gap-1.5">
              <Download className="w-4 h-4" />
              <span className="hidden xs:inline">Excel</span>
            </Button>
            <Button variant="outline" size="sm" onClick={exportToPDF} className="gap-1.5">
              <Download className="w-4 h-4" />
              <span className="hidden xs:inline">PDF</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5">
              <Printer className="w-4 h-4" />
              <span className="hidden xs:inline">Print</span>
            </Button>
          </div>
        </div>

        {/* Results count */}
        <div className="text-sm text-muted-foreground mb-4">
          {filteredQarzdorlar.length} {script === 'cyrillic' ? 'та топилди' : 'ta topildi'}
        </div>

        {isMobile ? (
          // Mobile card view
          <div className="space-y-3">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                {t("common.loading")}
              </div>
            ) : currentQarzdorlar.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery ? t("lens.noResults") : t("debtors.empty")}
              </div>
            ) : (
              currentQarzdorlar.map((x, index) => (
                <div key={x.id} className={`border border-border rounded-lg p-4 space-y-3 ${getRowClassName(x)}`}>
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="font-semibold text-lg">{x.mijoz}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-2">
                        {formatDisplayDate(x.sana)}
                        {getAgeIndicator(x.sana, x.holat)}
                      </div>
                    </div>
                    {getStatusBadge(x.holat)}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">{t("debtors.debtorPhone")}:</span>
                      <div className="font-medium">{x.telefon || "-"}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">{t("debtors.remainingAmount")}:</span>
                      <div className="font-bold text-lg text-destructive">{formatPrice(x.qoldiqSumma)} {t("common.currency")}</div>
                    </div>
                    {x.oxirgiAloqa && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">{t("debtors.lastContact")}:</span>
                        <div className="font-medium text-green-600">{formatDisplayDate(x.oxirgiAloqa.split('T')[0])}</div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2 border-t">
                    {x.holat !== "tollangan" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openPaymentDialog(x)}
                        className="gap-1"
                      >
                        <CreditCard className="w-4 h-4" />
                        {t("debtors.addPayment")}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openHistoryDialog(x)}
                      className="gap-1"
                    >
                      <History className="w-4 h-4" />
                    </Button>
                    <Button
                      variant={x.oxirgiAloqa ? "outline" : "secondary"}
                      size="sm"
                      onClick={() => handleToggleContacted(x.id, x.oxirgiAloqa)}
                      className={x.oxirgiAloqa ? "gap-1 text-green-600 border-green-300" : "gap-1"}
                    >
                      <PhoneCall className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(x)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteId(x.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          // Desktop table view
          <div className="overflow-x-auto">
            <Table id="printable-table">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">{t("orders.number")}</TableHead>
                  <TableHead>{t("common.date")}</TableHead>
                  <TableHead>{t("debtors.debtorName")}</TableHead>
                  <TableHead>{t("debtors.debtorPhone")}</TableHead>
                  <TableHead className="text-right">{t("debtors.remainingAmount")}</TableHead>
                  <TableHead>{t("debtors.status")}</TableHead>
                  <TableHead>{t("debtors.lastContact")}</TableHead>
                  <TableHead className="w-[180px]">{t("common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      {t("common.loading")}
                    </TableCell>
                  </TableRow>
                ) : currentQarzdorlar.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      {searchQuery ? t("lens.noResults") : t("debtors.empty")}
                    </TableCell>
                  </TableRow>
                ) : (
                  currentQarzdorlar.map((x, index) => (
                    <TableRow key={x.id} className={getRowClassName(x)}>
                      <TableCell className="font-medium">{startIndex + index + 1}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{formatDisplayDate(x.sana)}</span>
                          {getAgeIndicator(x.sana, x.holat)}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{x.mijoz}</TableCell>
                      <TableCell>{x.telefon || "-"}</TableCell>
                      <TableCell className="text-right font-bold text-lg text-destructive">
                        {formatPrice(x.qoldiqSumma)} {t("common.currency")}
                      </TableCell>
                      <TableCell>{getStatusBadge(x.holat)}</TableCell>
                      <TableCell>
                        {x.oxirgiAloqa ? (
                          <span className="text-green-600 text-sm">
                            {formatDisplayDate(x.oxirgiAloqa.split('T')[0])}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">{t("debtors.notContacted")}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <TooltipProvider>
                            {x.holat !== "tollangan" && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => openPaymentDialog(x)}
                                    className="hover:bg-green-100 hover:text-green-600 transition-colors"
                                  >
                                    <CreditCard className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>{t("debtors.addPayment")}</TooltipContent>
                              </Tooltip>
                            )}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openHistoryDialog(x)}
                                  className="hover:bg-blue-100 hover:text-blue-600 transition-colors"
                                >
                                  <History className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>{t("debtors.paymentHistory")}</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleToggleContacted(x.id, x.oxirgiAloqa)}
                                  className={x.oxirgiAloqa ? "text-green-600 hover:bg-green-100" : "hover:bg-yellow-100 hover:text-yellow-600"}
                                >
                                  <PhoneCall className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                {x.oxirgiAloqa 
                                  ? `${t("debtors.lastContact")}: ${formatDisplayDate(x.oxirgiAloqa.split('T')[0])}` 
                                  : t("debtors.markContacted")
                                }
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEdit(x)}
                                  className="hover:bg-primary/10 hover:text-primary transition-colors"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>{t("common.edit")}</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setDeleteId(x.id)}
                                  className="hover:bg-destructive/10 hover:text-destructive transition-colors"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>{t("common.delete")}</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-4 flex justify-center">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <PaginationItem key={pageNum}>
                      <PaginationLink
                        onClick={() => setCurrentPage(pageNum)}
                        isActive={currentPage === pageNum}
                        className="cursor-pointer"
                      >
                        {pageNum}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}
                <PaginationItem>
                  <PaginationNext
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </div>

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("debtors.addPayment")}</DialogTitle>
          </DialogHeader>
          {paymentQarzdor && (
            <div className="space-y-4">
              <div className="bg-muted p-3 rounded-lg">
                <p className="font-medium">{paymentQarzdor.mijoz}</p>
                <p className="text-sm text-muted-foreground">
                  {t("debtors.remainingAmount")}: {formatPrice(paymentQarzdor.qoldiqSumma)} {t("common.currency")}
                </p>
              </div>
              
              <div>
                <Label>{t("common.date")}</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(paymentDate, "dd-MM-yyyy")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={paymentDate}
                      onSelect={(date) => date && setPaymentDate(date)}
                      disabled={(date) => date > new Date()}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label>{t("debtors.paymentAmount")}</Label>
                <PriceInput
                  value={paymentAmount}
                  onChange={setPaymentAmount}
                  placeholder="0"
                />
              </div>

              <div>
                <Label>{t("debtors.note")}</Label>
                <Input
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  placeholder={t("debtors.notePlaceholder")}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
                  {t("common.cancel")}
                </Button>
                <Button onClick={handleAddPayment} disabled={!paymentAmount}>
                  {t("common.save")}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Payment History Dialog */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("debtors.paymentHistory")}</DialogTitle>
          </DialogHeader>
          {historyQarzdor && (
            <div className="space-y-4">
              <div className="bg-muted p-3 rounded-lg">
                <p className="font-medium">{historyQarzdor.mijoz}</p>
                <div className="flex justify-between text-sm">
                  <span>{t("debtors.debtAmount")}: {formatPrice(historyQarzdor.qarzSummasi)} {t("common.currency")}</span>
                  <span className="font-bold text-destructive">{t("debtors.remainingAmount")}: {formatPrice(historyQarzdor.qoldiqSumma)} {t("common.currency")}</span>
                </div>
              </div>
              
              {loadingHistory ? (
                <div className="text-center py-4 text-muted-foreground">{t("common.loading")}</div>
              ) : paymentHistory.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">{t("debtors.noPayments")}</div>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {paymentHistory.map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium text-green-600">+{formatPrice(payment.summa)} {t("common.currency")}</p>
                        <p className="text-sm text-muted-foreground">{formatDisplayDate(payment.sana)}</p>
                        {payment.izoh && <p className="text-sm">{payment.izoh}</p>}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeletePayment(payment.id)}
                        className="hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <EditDialog
        open={!!editingItem}
        onOpenChange={(open) => !open && setEditingItem(null)}
        title={t("edit.title")}
      >
        {editingItem && (
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>{t("debtors.debtorName")}</Label>
                <Input
                  value={editingItem.mijoz}
                  onChange={(e) => setEditingItem({ ...editingItem, mijoz: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>{t("debtors.debtorPhone")}</Label>
                <Input
                  value={editingItem.telefon}
                  onChange={(e) => setEditingItem({ ...editingItem, telefon: e.target.value })}
                />
              </div>
              <div>
                <Label>{t("debtors.debtAmount")}</Label>
                <PriceInput
                  value={editingItem.qarzSummasi.toString()}
                  onChange={(value) => setEditingItem({ ...editingItem, qarzSummasi: parseFloat(value) || 0 })}
                />
              </div>
              <div>
                <Label>{t("debtors.note")}</Label>
                <Input
                  value={editingItem.izoh}
                  onChange={(e) => setEditingItem({ ...editingItem, izoh: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditingItem(null)}>
                {t("common.cancel")}
              </Button>
              <Button type="submit">{t("common.save")}</Button>
            </div>
          </form>
        )}
      </EditDialog>

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={handleDelete}
        title={t("delete.confirm")}
        description={t("delete.confirmDesc")}
      />
    </div>
  );
};

export default Qarzdorlar;
