import { useState, useEffect } from "react";
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
import { Trash2, Search, Pencil, Download, CalendarIcon, Printer } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, subWeeks, subMonths } from "date-fns";
import * as XLSX from 'xlsx';
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
import { TableSkeleton, FormSkeleton } from "@/components/skeletons/TableSkeleton";
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

const Tekshiruv = () => {
  const { t, script } = useLanguage();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  
  const defaultClientName = script === 'cyrillic' ? "Мижоз" : "Mijoz";
  
  const [tekshiruvlar, setTekshiruvlar] = useState<Tekshiruv[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
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
            if (prev.some(t => t.id === newItem.id)) return prev;
            if (prev.some(t => t.id.startsWith('temp-') && t.mijoz === newItem.mijoz && t.sana === newItem.sana)) {
              return prev.map(t => 
                t.id.startsWith('temp-') && t.mijoz === newItem.mijoz && t.sana === newItem.sana 
                  ? newItem : t
              );
            }
            return [newItem, ...prev];
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
          setTekshiruvlar(prev => prev.filter(t => t.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const loadTekshiruvlar = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("tekshiruvlar")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const mapped = data?.map(mapToLocal) || [];
      setTekshiruvlar(mapped);
    } catch (error: any) {
      toast.error(t("toast.loadError"));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error(t("toast.loginRequired"));
      return;
    }

    const summa = parseInt(form.narx) || 0;
    const tempId = `temp-${Date.now()}`;
    const nextTartibRaqam = tekshiruvlar.length > 0 ? Math.max(...tekshiruvlar.map(t => t.tartibRaqam)) + 1 : 1;

    // Optimistik yangilanish
    const optimisticItem: Tekshiruv = {
      id: tempId,
      sana: formatUzbekistanDate(selectedDate),
      createdAt: new Date().toISOString(),
      tartibRaqam: nextTartibRaqam,
      mijoz: form.mijoz,
      refraksiyametriya: form.refraksiyametriya,
      tanometriya: form.tanometriya,
      jamiSumma: summa,
    };

    setTekshiruvlar(prev => [optimisticItem, ...prev]);
    toast.success(t("exam.addSuccess"));

    // Formani tozalash
    setSelectedDate(new Date());
    setForm({
      mijoz: script === 'cyrillic' ? "Мижоз" : "Mijoz",
      refraksiyametriya: false,
      tanometriya: false,
      narx: "",
    });

    try {
      const { data: maxData, error: maxError } = await supabase
        .from("tekshiruvlar")
        .select("tartib_raqam")
        .eq("user_id", user.id)
        .order("tartib_raqam", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (maxError) throw maxError;

      const serverTartibRaqam = maxData ? maxData.tartib_raqam + 1 : 1;

      const { data, error } = await supabase
        .from("tekshiruvlar")
        .insert({
          user_id: user.id,
          sana: formatUzbekistanDate(selectedDate),
          tartib_raqam: serverTartibRaqam,
          mijoz: form.mijoz,
          refraksiyametriya: form.refraksiyametriya,
          tanometriya: form.tanometriya,
          jami_summa: summa,
        })
        .select()
        .single();

      if (error) throw error;

      // Vaqtinchalik ID ni haqiqiy ID bilan almashtirish
      setTekshiruvlar(prev => prev.map(t => t.id === tempId ? mapToLocal(data) : t));
    } catch (error: any) {
      // Xatolik bo'lsa - optimistik yangilanishni bekor qilish
      setTekshiruvlar(prev => prev.filter(t => t.id !== tempId));
      toast.error(t("toast.saveError"));
    }
  };

  const handleDelete = async () => {
    if (!deleteId || !user) return;
    
    const itemToDelete = tekshiruvlar.find((t) => t.id === deleteId);
    if (!itemToDelete) return;

    // Optimistik o'chirish
    setTekshiruvlar(prev => prev.filter(t => t.id !== deleteId));
    setDeleteId(null);
    toast.success(t("exam.deleteSuccess"));

    try {
      await supabase.from("chiqindilar").insert([{
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
    } catch (error: any) {
      // Xatolik bo'lsa - qaytarish
      setTekshiruvlar(prev => [itemToDelete, ...prev]);
      toast.error(t("toast.deleteError"));
    }
  };

  const handleEdit = (item: Tekshiruv) => {
    setEditingItem(item);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !user) return;

    const previousItem = tekshiruvlar.find(t => t.id === editingItem.id);
    
    // Optimistik yangilash
    setTekshiruvlar(prev => prev.map(t => t.id === editingItem.id ? editingItem : t));
    setEditingItem(null);
    toast.success(t("common.updateSuccess"));

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
    } catch (error: any) {
      if (previousItem) {
        setTekshiruvlar(prev => prev.map(t => t.id === editingItem.id ? previousItem : t));
      }
      toast.error(t("toast.updateError"));
    }
  };

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

  const totalSum = filteredTekshiruvlar.reduce((sum, t) => sum + t.jamiSumma, 0);

  const exportToExcel = () => {
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

    const metaWs = XLSX.utils.json_to_sheet(metadata);
    const dataWs = XLSX.utils.json_to_sheet(data);
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, dataWs, t("common.sheet"));
    XLSX.utils.book_append_sheet(wb, metaWs, t("common.metadata"));
    
    XLSX.writeFile(wb, `Tekshiruvlar_${formatUzbekistanDate()}.xlsx`);
    toast.success(t("toast.excelSuccess"));
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

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">{t("exam.title")}</h2>
          <p className="text-muted-foreground">{t("exam.subtitle")}</p>
        </div>
        <FormSkeleton />
        <TableSkeleton rows={10} columns={6} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">{t("exam.title")}</h2>
        <p className="text-muted-foreground">{t("exam.subtitle")}</p>
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="mijoz">{t("exam.patient")}</Label>
              <Input
                id="mijoz"
                value={form.mijoz}
                onChange={(e) => setForm({ ...form, mijoz: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>{t("exam.examType")}</Label>
              <div className="space-y-2 pt-1">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="refraksiyametriya"
                    checked={form.refraksiyametriya}
                    onCheckedChange={(checked) => {
                      const newRef = checked as boolean;
                      const newSum = (newRef ? 50000 : 0) + (form.tanometriya ? 15000 : 0);
                      setForm({ ...form, refraksiyametriya: newRef, narx: newSum.toString() });
                    }}
                  />
                  <Label htmlFor="refraksiyametriya" className="font-normal cursor-pointer">
                    {t("exam.refractometry")} (50 000)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="tanometriya"
                    checked={form.tanometriya}
                    onCheckedChange={(checked) => {
                      const newTan = checked as boolean;
                      const newSum = (form.refraksiyametriya ? 50000 : 0) + (newTan ? 15000 : 0);
                      setForm({ ...form, tanometriya: newTan, narx: newSum.toString() });
                    }}
                  />
                  <Label htmlFor="tanometriya" className="font-normal cursor-pointer">
                    {t("exam.tonometry")} (15 000)
                  </Label>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="narx">{t("exam.price")}</Label>
              <PriceInput
                id="narx"
                value={form.narx}
                onChange={(value) => setForm({ ...form, narx: value })}
                placeholder="0"
              />
            </div>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">
              {t("exam.total")}: {filteredTekshiruvlar.length} {t("common.items")}
            </span>
            <Button type="submit" disabled={!form.refraksiyametriya && !form.tanometriya}>
              {t("exam.add")}
            </Button>
          </div>
        </form>
      </Card>

      <Card className="p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6 items-start md:items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-lg">{t("exam.list")}</h3>
            <span className="text-sm text-muted-foreground bg-muted px-2 py-1 rounded">
              {totalSum.toLocaleString()} {t("common.sum")}
            </span>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative w-48">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder={t("common.search")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={dateFilter} onValueChange={(value) => { setDateFilter(value); setCurrentPage(1); }}>
              <SelectTrigger className="w-32">
                <SelectValue />
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
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" onClick={exportToExcel}>
                    <Download className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t("common.exportExcel")}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" onClick={exportToPDF}>
                    <Download className="h-4 w-4 text-red-500" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t("common.exportPdf")}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" onClick={handlePrint}>
                    <Printer className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t("common.print")}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Desktop Table */}
        {!isMobile && (
          <div className="overflow-x-auto">
            <table id="printable-table" className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2">{t("exam.number")}</th>
                  <th className="text-left py-3 px-2">{t("common.date")}</th>
                  <th className="text-left py-3 px-2">{t("exam.patient")}</th>
                  <th className="text-left py-3 px-2">{t("exam.examinations")}</th>
                  <th className="text-right py-3 px-2">{t("exam.amount")}</th>
                  <th className="text-right py-3 px-2">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {currentTekshiruvlar.map((tek, index) => (
                  <tr key={tek.id} className={`border-b hover:bg-muted/50 ${tek.id.startsWith('temp-') ? 'opacity-70' : ''}`}>
                    <td className="py-3 px-2">{startIndex + index + 1}</td>
                    <td className="py-3 px-2">{formatDisplayDate(tek.sana)}</td>
                    <td className="py-3 px-2">{tek.mijoz}</td>
                    <td className="py-3 px-2">
                      {tek.refraksiyametriya && t("exam.refractometryAbbr")}
                      {tek.refraksiyametriya && tek.tanometriya && ", "}
                      {tek.tanometriya && t("exam.tonometryAbbr")}
                    </td>
                    <td className="py-3 px-2 text-right">{tek.jamiSumma.toLocaleString()} {t("common.sum")}</td>
                    <td className="py-3 px-2 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(tek)} disabled={tek.id.startsWith('temp-')}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(tek.id)} disabled={tek.id.startsWith('temp-')}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Mobile Cards */}
        {isMobile && (
          <div className="space-y-3">
            {currentTekshiruvlar.map((tek, index) => (
              <Card key={tek.id} className={`p-4 ${tek.id.startsWith('temp-') ? 'opacity-70' : ''}`}>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-medium">{tek.mijoz}</p>
                    <p className="text-sm text-muted-foreground">{formatDisplayDate(tek.sana)}</p>
                  </div>
                  <span className="text-sm font-medium">{tek.jamiSumma.toLocaleString()} {t("common.sum")}</span>
                </div>
                <div className="text-sm text-muted-foreground mb-2">
                  {tek.refraksiyametriya && t("exam.refractometry")}
                  {tek.refraksiyametriya && tek.tanometriya && ", "}
                  {tek.tanometriya && t("exam.tonometry")}
                </div>
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-xs text-muted-foreground">№{startIndex + index + 1}</span>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(tek)} disabled={tek.id.startsWith('temp-')}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleteId(tek.id)} disabled={tek.id.startsWith('temp-')}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <Pagination className="mt-4">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
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
                  className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}

        {filteredTekshiruvlar.length === 0 && (
          <p className="text-center text-muted-foreground py-8">{t("common.noData")}</p>
        )}
      </Card>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={handleDelete}
        title={t("common.confirmDelete")}
        description={t("exam.deleteConfirm")}
      />

      <EditDialog
        open={!!editingItem}
        onOpenChange={(open) => !open && setEditingItem(null)}
        title={t("exam.edit")}
      >
        {editingItem && (
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label>{t("common.date")}</Label>
              <Input
                type="text"
                value={editingItem.sana}
                onChange={(e) => setEditingItem({ ...editingItem, sana: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("exam.patient")}</Label>
              <Input
                value={editingItem.mijoz}
                onChange={(e) => setEditingItem({ ...editingItem, mijoz: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("exam.examType")}</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="edit-refraksiyametriya"
                    checked={editingItem.refraksiyametriya}
                    onCheckedChange={(checked) => {
                      const newRef = checked as boolean;
                      const newSum = (newRef ? 50000 : 0) + (editingItem.tanometriya ? 15000 : 0);
                      setEditingItem({ ...editingItem, refraksiyametriya: newRef, jamiSumma: newSum });
                    }}
                  />
                  <Label htmlFor="edit-refraksiyametriya" className="font-normal cursor-pointer">
                    {t("exam.refractometry")} (50 000)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="edit-tanometriya"
                    checked={editingItem.tanometriya}
                    onCheckedChange={(checked) => {
                      const newTan = checked as boolean;
                      const newSum = (editingItem.refraksiyametriya ? 50000 : 0) + (newTan ? 15000 : 0);
                      setEditingItem({ ...editingItem, tanometriya: newTan, jamiSumma: newSum });
                    }}
                  />
                  <Label htmlFor="edit-tanometriya" className="font-normal cursor-pointer">
                    {t("exam.tonometry")} (15 000)
                  </Label>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("exam.price")}</Label>
              <PriceInput
                value={editingItem.jamiSumma.toString()}
                onChange={(value) => setEditingItem({ ...editingItem, jamiSumma: parseInt(value) || 0 })}
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit">{t("common.save")}</Button>
            </div>
          </form>
        )}
      </EditDialog>
    </div>
  );
};

export default Tekshiruv;
