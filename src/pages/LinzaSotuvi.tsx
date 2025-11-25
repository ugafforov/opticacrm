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
  const [sotuvlar, setSotuvlar] = useState<LinzaSotish[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [form, setForm] = useState({
    kliyent: "",
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
    if (!user) return;

    const channel = supabase
      .channel('linza-sotuvlari-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'linza_sotuvlari',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          loadSotuvlar();
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

      const mapped = data?.map((item) => ({
        id: item.id,
        sana: item.sana,
        createdAt: item.created_at,
        tartibRaqam: item.tartib_raqam,
        kliyent: item.kliyent,
        linzaTuri: item.linza_turi,
        summa: item.summa,
      })) || [];

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

    try {
      // Get the maximum tartib_raqam for this user
      const { data: maxData, error: maxError } = await supabase
        .from("linza_sotuvlari")
        .select("tartib_raqam")
        .eq("user_id", user.id)
        .order("tartib_raqam", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (maxError) throw maxError;

      const nextTartibRaqam = maxData ? maxData.tartib_raqam + 1 : 1;

      const { error } = await supabase
        .from("linza_sotuvlari")
        .insert({
          user_id: user.id,
          sana: formatUzbekistanDate(selectedDate),
          tartib_raqam: nextTartibRaqam,
          kliyent: form.kliyent,
          linza_turi: form.linzaTuri,
          summa: parseFloat(form.summa),
        });

      if (error) throw error;

      await loadSotuvlar();

      setSelectedDate(new Date());
      setForm({
        kliyent: "",
        linzaTuri: "",
        summa: "",
      });

      toast.success(t("lensSale.addSuccess"));
    } catch (error: any) {
      console.error("Error adding linza sotuvi:", error);
      toast.error(t("common.error"));
    }
  };

  const handleDelete = async () => {
    if (!deleteId || !user) return;
    
    const itemToDelete = sotuvlar.find((s) => s.id === deleteId);
    if (!itemToDelete) return;

    try {
      const { error: trashError } = await supabase.from("chiqindilar").insert([{
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

      await loadSotuvlar();
      setDeleteId(null);
      toast.success(t("lensSale.deleteSuccess"));
    } catch (error: any) {
      console.error("Error deleting linza sotuvi:", error);
      toast.error(t("common.error"));
    }
  };

  const handleEdit = (item: LinzaSotish) => {
    setEditingItem(item);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !user) return;

    try {
      const { error } = await supabase
        .from("linza_sotuvlari")
        .update({
          kliyent: editingItem.kliyent,
          linza_turi: editingItem.linzaTuri,
          summa: editingItem.summa,
        })
        .eq("id", editingItem.id);

      if (error) throw error;

      await loadSotuvlar();
      setEditingItem(null);
      toast.success(t("common.updateSuccess"));
    } catch (error: any) {
      console.error("Error updating linza sotuvi:", error);
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

  const totalSum = sotuvlar.reduce((sum, s) => sum + s.summa, 0);

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
              <Select value={form.linzaTuri} onValueChange={(value) => setForm({ ...form, linzaTuri: value })}>
                <SelectTrigger>
                  <SelectValue placeholder={t("lensSale.select")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="amerikanskiy">{t("lensSale.american")}</SelectItem>
                  <SelectItem value="koreyskiy">{t("lensSale.korean")}</SelectItem>
                  <SelectItem value="astigmatik">{t("lensSale.astigmatic")}</SelectItem>
                  <SelectItem value="rangli-zreniya">{t("lensSale.coloredVision")}</SelectItem>
                  <SelectItem value="chiroy-uchun">{t("lensSale.beauty")}</SelectItem>
                  <SelectItem value="linza-suvi">{t("lensSale.solution")}</SelectItem>
                  <SelectItem value="linza-konteyneri">{t("lensSale.container")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="summa">{t("lensSale.amount")} ({t("common.sum")})</Label>
              <Input
                id="summa"
                type="number"
                value={form.summa}
                onChange={(e) => setForm({ ...form, summa: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-border">
            <Button type="submit" className="bg-primary hover:bg-primary/90">
              {t("lensSale.add")}
            </Button>
          </div>
        </form>
      </Card>

      <div className="bg-card rounded-lg p-4 border border-border">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <h3 className="text-lg font-semibold">{t("lensSale.list")}</h3>
            <div className="text-lg font-bold text-primary">
              {t("orders.total")}: {totalSum.toLocaleString()} {t("common.currency")}
            </div>
          </div>
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
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder={t("lensSale.search")}
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
            {currentSotuvlar.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery ? "Qidiruv bo'yicha natija topilmadi" : "Hozircha sotuvlar yo'q"}
              </div>
            ) : (
              currentSotuvlar.map((s) => (
              <div key={s.id} className="bg-card border border-border rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="font-semibold text-lg">№ {s.tartibRaqam}</div>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="text-sm text-muted-foreground cursor-help">
                            {formatDisplayDate(s.sana)}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{formatUzbekistanDateTime(new Date(s.createdAt))}</p>
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
                            onClick={() => handleEdit(s)}
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
                            onClick={() => setDeleteId(s.id)}
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
                    <span className="text-muted-foreground">{t("lensSale.client")}:</span>
                    <span className="ml-2 font-medium">{s.kliyent}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t("lensSale.type")}:</span>
                    <span className="ml-2">{getLensTypeTranslation(s.linzaTuri)}</span>
                  </div>
                </div>
                
                <div className="pt-2 border-t border-border flex justify-between items-center">
                  <span className="text-muted-foreground text-sm">{t("lensSale.amount")}:</span>
                  <span className="text-lg font-bold">{s.summa.toLocaleString()} {t("common.currency")}</span>
                </div>
              </div>
            ))
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            {currentSotuvlar.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery ? "Qidiruv bo'yicha natija topilmadi" : "Hozircha sotuvlar yo'q"}
              </div>
            ) : (
              <table id="printable-table" className="w-full">
              <thead className="bg-secondary text-secondary-foreground">
                <tr>
                  <th className="px-4 py-2 text-left">№</th>
                  <th className="px-4 py-2 text-left">{t("common.date")}</th>
                  <th className="px-4 py-2 text-left">{t("lensSale.client")}</th>
                  <th className="px-4 py-2 text-left">{t("lensSale.type")}</th>
                  <th className="px-4 py-2 text-center">{t("lensSale.amount")}</th>
                  <th className="px-4 py-2 text-right"></th>
                </tr>
              </thead>
              <tbody>
                {currentSotuvlar.map((s) => (
                  <tr key={s.id} className="border-b border-border">
                    <td className="px-4 py-2">{s.tartibRaqam}</td>
                    <td className="px-4 py-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-help">{formatDisplayDate(s.sana)}</span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{formatUzbekistanDateTime(new Date(s.createdAt))}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </td>
                    <td className="px-4 py-2">{s.kliyent}</td>
                    <td className="px-4 py-2">{getLensTypeTranslation(s.linzaTuri)}</td>
                    <td className="px-4 py-2 text-center font-semibold">
                      {s.summa.toLocaleString()} {t("common.currency")}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <TooltipProvider>
                        <div className="flex gap-2 justify-end">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(s)}
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
                                onClick={() => setDeleteId(s.id)}
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
          <div>
            <Label className="text-xs">{t("common.date")}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal h-9 text-sm"
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
              <Label htmlFor="edit-kliyent" className="text-xs">{t("lensSale.client")}</Label>
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
              <Label htmlFor="edit-summa" className="text-xs">{t("lensSale.amount")}</Label>
              <Input
                id="edit-summa"
                type="number"
                value={editingItem?.summa || ""}
                onChange={(e) =>
                  setEditingItem(
                    editingItem
                      ? { ...editingItem, summa: parseFloat(e.target.value) }
                      : null
                  )
                }
                required
                className="h-9"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="edit-linzaTuri" className="text-xs">{t("lensSale.type")}</Label>
            <Select
              value={editingItem?.linzaTuri || ""}
              onValueChange={(value) =>
                setEditingItem(
                  editingItem ? { ...editingItem, linzaTuri: value } : null
                )
              }
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="amerikanskiy">{t("lensSale.american")}</SelectItem>
                <SelectItem value="koreyskiy">{t("lensSale.korean")}</SelectItem>
                <SelectItem value="astigmatik">{t("lensSale.astigmatic")}</SelectItem>
                <SelectItem value="rangli-zreniya">{t("lensSale.coloredVision")}</SelectItem>
                <SelectItem value="chiroy-uchun">{t("lensSale.beauty")}</SelectItem>
                <SelectItem value="linza-suvi">{t("lensSale.solution")}</SelectItem>
                <SelectItem value="linza-konteyneri">{t("lensSale.container")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 justify-end pt-2">
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

export default LinzaSotuvi;
