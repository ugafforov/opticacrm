import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SelectWithOther } from "@/components/SelectWithOther";
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
import { formatUzbekistanDate, getUzbekistanISOString, formatUzbekistanDateTime, formatDisplayDate, formatPrice, parsePrice } from "@/lib/utils";
import { PriceInput } from "@/components/PriceInput";
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

interface LinzaSotish {
  id: string;
  sana: string;
  createdAt: string;
  tartibRaqam: number;
  kliyent: string;
  linzaTuri: string;
  summa: number;
}

const mapToLocal = (item: any): LinzaSotish => ({
  id: item.id,
  sana: item.sana,
  createdAt: item.created_at,
  tartibRaqam: item.tartib_raqam,
  kliyent: item.kliyent,
  linzaTuri: item.linza_turi,
  summa: item.summa,
});

const LinzaSotuvi = () => {
  const { t, script } = useLanguage();
  const { user } = useAuth();
  const isMobile = useIsMobile();

  // Mapping funksiya - linza turlarini tarjimalash
  const getLensTypeTranslation = (lensType: string): string => {
    const lensMap: Record<string, string> = {
      "amerikanskiy": t("lensSale.american"),
      "koreyskiy": t("lensSale.korean"),
      "astigmatik": t("lensSale.astigmatic"),
      "rangli-zreniya": t("lensSale.coloredVision"),
      "chiroy-uchun": t("lensSale.beauty"),
      "linza-suvi": t("lensSale.solution"),
      "linza-konteyneri": t("lensSale.container"),
    };
    return lensMap[lensType] || lensType;
  };
  
  const defaultClientName = script === 'cyrillic' ? "Мижоз" : "Mijoz";
  
  const [sotuvlar, setSotuvlar] = useState<LinzaSotish[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [dateFilter, setDateFilter] = useState<string>("today");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const [form, setForm] = useState({
    kliyent: defaultClientName,
    linzaTuri: "",
    summa: "",
  });
  const [editingItem, setEditingItem] = useState<LinzaSotish | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadSotuvlar();
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
      .channel('linza-sotuvlari-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'linza_sotuvlari',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const newItem = mapToLocal(payload.new);
          setSotuvlar(prev => {
            if (prev.some(s => s.id === newItem.id)) return prev;
            if (prev.some(s => s.id.startsWith('temp-') && s.kliyent === newItem.kliyent && s.sana === newItem.sana)) {
              return prev.map(s => 
                s.id.startsWith('temp-') && s.kliyent === newItem.kliyent && s.sana === newItem.sana 
                  ? newItem : s
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
          table: 'linza_sotuvlari',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const updatedItem = mapToLocal(payload.new);
          setSotuvlar(prev => prev.map(s => s.id === updatedItem.id ? updatedItem : s));
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'linza_sotuvlari',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          setSotuvlar(prev => prev.filter(s => s.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const loadSotuvlar = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("linza_sotuvlari")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const mapped = data?.map(mapToLocal) || [];
      setSotuvlar(mapped);
    } catch (error: any) {
      console.error("Error loading linza sotuvlari:", error);
      toast.error(t("common.error"));
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

    const tempId = `temp-${Date.now()}`;
    const nextTartibRaqam = sotuvlar.length > 0 ? Math.max(...sotuvlar.map(s => s.tartibRaqam)) + 1 : 1;

    // Optimistik yangilanish
    const optimisticItem: LinzaSotish = {
      id: tempId,
      sana: formatUzbekistanDate(selectedDate),
      createdAt: new Date().toISOString(),
      tartibRaqam: nextTartibRaqam,
      kliyent: form.kliyent,
      linzaTuri: form.linzaTuri,
      summa: parseFloat(form.summa) || 0,
    };

    setSotuvlar(prev => [optimisticItem, ...prev]);
    toast.success(t("lensSale.addSuccess"));

    // Formani tozalash
    const savedForm = { ...form };
    setSelectedDate(new Date());
    setForm({
      kliyent: script === 'cyrillic' ? "Мижоз" : "Mijoz",
      linzaTuri: "",
      summa: "",
    });

    try {
      const { data: maxData, error: maxError } = await supabase
        .from("linza_sotuvlari")
        .select("tartib_raqam")
        .eq("user_id", user.id)
        .order("tartib_raqam", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (maxError) throw maxError;

      const serverTartibRaqam = maxData ? maxData.tartib_raqam + 1 : 1;

      const { data, error } = await supabase
        .from("linza_sotuvlari")
        .insert({
          user_id: user.id,
          sana: formatUzbekistanDate(selectedDate),
          tartib_raqam: serverTartibRaqam,
          kliyent: savedForm.kliyent,
          linza_turi: savedForm.linzaTuri,
          summa: parseFloat(savedForm.summa) || 0,
        })
        .select()
        .single();

      if (error) throw error;

      setSotuvlar(prev => prev.map(s => s.id === tempId ? mapToLocal(data) : s));
    } catch (error: any) {
      setSotuvlar(prev => prev.filter(s => s.id !== tempId));
      toast.error(t("common.error"));
    }
  };

  const handleDelete = async () => {
    if (!deleteId || !user) return;
    
    const itemToDelete = sotuvlar.find((s) => s.id === deleteId);
    if (!itemToDelete) return;

    // Optimistik o'chirish
    setSotuvlar(prev => prev.filter(s => s.id !== deleteId));
    setDeleteId(null);
    toast.success(t("lensSale.deleteSuccess"));

    try {
      await supabase.from("chiqindilar").insert([{
        user_id: user.id,
        item_id: deleteId,
        type: "linzaSotuvlari",
        data: itemToDelete as any,
        deleted_at: getUzbekistanISOString(),
      }]);

      const { error } = await supabase
        .from("linza_sotuvlari")
        .delete()
        .eq("id", deleteId);

      if (error) throw error;
    } catch (error: any) {
      setSotuvlar(prev => [itemToDelete, ...prev]);
      toast.error(t("common.error"));
    }
  };

  const handleEdit = (item: LinzaSotish) => {
    setEditingItem(item);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !user) return;

    const previousItem = sotuvlar.find(s => s.id === editingItem.id);

    // Optimistik yangilash
    setSotuvlar(prev => prev.map(s => s.id === editingItem.id ? editingItem : s));
    setEditingItem(null);
    toast.success(t("common.updateSuccess"));

    try {
      const { error } = await supabase
        .from("linza_sotuvlari")
        .update({
          sana: editingItem.sana,
          kliyent: editingItem.kliyent,
          linza_turi: editingItem.linzaTuri,
          summa: editingItem.summa,
        })
        .eq("id", editingItem.id);

      if (error) throw error;
    } catch (error: any) {
      if (previousItem) {
        setSotuvlar(prev => prev.map(s => s.id === editingItem.id ? previousItem : s));
      }
      toast.error(t("common.error"));
    }
  };

  const filteredSotuvlar = sotuvlar.filter((s) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = (
      s.kliyent.toLowerCase().includes(query) ||
      s.sana.includes(query)
    );

    if (!matchesSearch) return false;

    if (dateFilter === "all") return true;

    const itemDate = new Date(s.sana.split('-').reverse().join('-'));
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

  const totalPages = Math.ceil(filteredSotuvlar.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentSotuvlar = filteredSotuvlar.slice(startIndex, endIndex);

  const totalSum = filteredSotuvlar.reduce((sum, s) => sum + s.summa, 0);

  const exportToExcel = () => {
    const dateTime = formatUzbekistanDateTime();
    
    // Metadata
    const metadata = [
      { [t("export.info")]: t("export.exportedBy"), [t("export.value")]: user?.email || t("export.unknown") },
      { [t("export.info")]: t("export.dateTime"), [t("export.value")]: dateTime },
      { [t("export.info")]: t("export.totalSum"), [t("export.value")]: `${totalSum.toLocaleString()} ${t("common.sum")}` },
    ];
    
    // Main data
    const data = filteredSotuvlar.map((s) => ({
      [t("orders.number")]: s.tartibRaqam,
      [t("common.date")]: formatDisplayDate(s.sana),
      [t("lensSale.client")]: s.kliyent,
      [t("lensSale.type")]: getLensTypeTranslation(s.linzaTuri),
      [t("lensSale.amount")]: s.summa,
    }));

    const metaWs = XLSX.utils.json_to_sheet(metadata);
    const dataWs = XLSX.utils.json_to_sheet(data);
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, dataWs, t("common.sheet"));
    XLSX.utils.book_append_sheet(wb, metaWs, t("common.metadata"));
    
    XLSX.writeFile(wb, `Linza_Sotuvi_${formatUzbekistanDate()}.xlsx`);
    toast.success(t("toast.excelSuccess"));
  };

  const exportToPDF = async () => {
    try {
      const doc = await setupPdfDoc('portrait', script);
      
      const startY = addPdfHeader(
        doc,
        t("lensSale.list"),
        user?.email,
        `${t("export.totalSum")}: ${totalSum.toLocaleString()} ${t("common.sum")}`,
        t("common.exportedBy"),
        t("common.dateAndTime")
      );

      const tableData = filteredSotuvlar.map((s) => [
        s.tartibRaqam,
        formatDisplayDate(s.sana),
        s.kliyent,
        getLensTypeTranslation(s.linzaTuri),
        `${s.summa.toLocaleString()} ${t("common.currency")}`,
      ]);

      autoTable(doc, {
        startY,
        head: [[t("orders.number"), t("common.date"), t("lensSale.client"), t("lensSale.type"), t("lensSale.amount")]],
        body: tableData,
        styles: { 
          font: script === 'cyrillic' ? 'Roboto' : 'helvetica',
          fontSize: 10,
          cellPadding: 1.5,
          lineWidth: 0.5,
          lineColor: [200, 200, 200],
        },
        headStyles: { 
          fillColor: [230, 126, 34],
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

    doc.save(`Linza_Sotuvi_${formatUzbekistanDate()}.pdf`);
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
          <title>${t("lensSale.list")}</title>
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
          <h1>${t("lensSale.list")}</h1>
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
          <h2 className="text-2xl font-bold text-foreground mb-2">{t("lensSale.title")}</h2>
          <p className="text-muted-foreground">{t("lensSale.subtitle")}</p>
        </div>
        <FormSkeleton />
        <TableSkeleton rows={10} columns={5} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">{t("lensSale.title")}</h2>
        <p className="text-muted-foreground">{t("lensSale.subtitle")}</p>
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
            <div>
              <Label htmlFor="kliyent">{t("lensSale.client")}</Label>
              <Input
                id="kliyent"
                value={form.kliyent}
                onChange={(e) => setForm({ ...form, kliyent: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="linzaTuri">{t("lensSale.type")}</Label>
              <SelectWithOther
                id="linzaTuri"
                value={form.linzaTuri}
                onChange={(value) => setForm({ ...form, linzaTuri: value })}
                options={[
                  { value: "amerikanskiy", label: t("lensSale.american") },
                  { value: "koreyskiy", label: t("lensSale.korean") },
                  { value: "astigmatik", label: t("lensSale.astigmatic") },
                  { value: "rangli-zreniya", label: t("lensSale.coloredVision") },
                  { value: "chiroy-uchun", label: t("lensSale.beauty") },
                  { value: "linza-suvi", label: t("lensSale.solution") },
                  { value: "linza-konteyneri", label: t("lensSale.container") },
                ]}
                placeholder={t("lensSale.selectType")}
                storageKey="linzaSotuviTypes"
                required
              />
            </div>

            <div>
              <Label htmlFor="summa">{t("lensSale.amount")}</Label>
              <PriceInput
                id="summa"
                value={form.summa}
                onChange={(value) => setForm({ ...form, summa: value })}
                placeholder="0"
              />
            </div>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">
              {t("lensSale.total")}: {filteredSotuvlar.length} {t("common.items")}
            </span>
            <Button type="submit" disabled={!form.linzaTuri}>
              {t("lensSale.add")}
            </Button>
          </div>
        </form>
      </Card>

      <Card className="p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6 items-start md:items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-lg">{t("lensSale.list")}</h3>
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
                  <th className="text-left py-3 px-2">{t("orders.number")}</th>
                  <th className="text-left py-3 px-2">{t("common.date")}</th>
                  <th className="text-left py-3 px-2">{t("lensSale.client")}</th>
                  <th className="text-left py-3 px-2">{t("lensSale.type")}</th>
                  <th className="text-right py-3 px-2">{t("lensSale.amount")}</th>
                  <th className="text-right py-3 px-2">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {currentSotuvlar.map((s, index) => (
                  <tr key={s.id} className={`border-b hover:bg-muted/50 ${s.id.startsWith('temp-') ? 'opacity-70' : ''}`}>
                    <td className="py-3 px-2">{startIndex + index + 1}</td>
                    <td className="py-3 px-2">{formatDisplayDate(s.sana)}</td>
                    <td className="py-3 px-2">{s.kliyent}</td>
                    <td className="py-3 px-2">{getLensTypeTranslation(s.linzaTuri)}</td>
                    <td className="py-3 px-2 text-right">{s.summa.toLocaleString()} {t("common.sum")}</td>
                    <td className="py-3 px-2 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(s)} disabled={s.id.startsWith('temp-')}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(s.id)} disabled={s.id.startsWith('temp-')}>
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
            {currentSotuvlar.map((s, index) => (
              <Card key={s.id} className={`p-4 ${s.id.startsWith('temp-') ? 'opacity-70' : ''}`}>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-medium">{s.kliyent}</p>
                    <p className="text-sm text-muted-foreground">{formatDisplayDate(s.sana)}</p>
                  </div>
                  <span className="text-sm font-medium">{s.summa.toLocaleString()} {t("common.sum")}</span>
                </div>
                <div className="text-sm text-muted-foreground mb-2">
                  {getLensTypeTranslation(s.linzaTuri)}
                </div>
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-xs text-muted-foreground">№{startIndex + index + 1}</span>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(s)} disabled={s.id.startsWith('temp-')}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleteId(s.id)} disabled={s.id.startsWith('temp-')}>
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

        {filteredSotuvlar.length === 0 && (
          <p className="text-center text-muted-foreground py-8">{t("common.noData")}</p>
        )}
      </Card>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={handleDelete}
        title={t("common.confirmDelete")}
        description={t("lensSale.deleteConfirm")}
      />

      <EditDialog
        open={!!editingItem}
        onOpenChange={(open) => !open && setEditingItem(null)}
        onSubmit={handleUpdate}
        title={t("lensSale.edit")}
      >
        {editingItem && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t("common.date")}</Label>
              <Input
                type="text"
                value={editingItem.sana}
                onChange={(e) => setEditingItem({ ...editingItem, sana: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("lensSale.client")}</Label>
              <Input
                value={editingItem.kliyent}
                onChange={(e) => setEditingItem({ ...editingItem, kliyent: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("lensSale.type")}</Label>
              <SelectWithOther
                value={editingItem.linzaTuri}
                onChange={(value) => setEditingItem({ ...editingItem, linzaTuri: value })}
                options={[
                  { value: "amerikanskiy", label: t("lensSale.american") },
                  { value: "koreyskiy", label: t("lensSale.korean") },
                  { value: "astigmatik", label: t("lensSale.astigmatic") },
                  { value: "rangli-zreniya", label: t("lensSale.coloredVision") },
                  { value: "chiroy-uchun", label: t("lensSale.beauty") },
                  { value: "linza-suvi", label: t("lensSale.solution") },
                  { value: "linza-konteyneri", label: t("lensSale.container") },
                ]}
                placeholder={t("lensSale.selectType")}
                storageKey="linzaSotuviTypes"
              />
            </div>
            <div className="space-y-2">
              <Label>{t("lensSale.amount")}</Label>
              <PriceInput
                value={editingItem.summa.toString()}
                onChange={(value) => setEditingItem({ ...editingItem, summa: parseFloat(value) || 0 })}
              />
            </div>
          </div>
        )}
      </EditDialog>
    </div>
  );
};

export default LinzaSotuvi;
