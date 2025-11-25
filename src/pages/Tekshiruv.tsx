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
  const [tekshiruvlar, setTekshiruvlar] = useState<Tekshiruv[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [form, setForm] = useState({
    mijoz: "",
    refraksiyametriya: false,
    tanometriya: false,
  });
  const [editingItem, setEditingItem] = useState<Tekshiruv | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadTekshiruvlar();
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('tekshiruvlar-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tekshiruvlar',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          loadTekshiruvlar();
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

      const mapped = data?.map((item) => ({
        id: item.id,
        sana: item.sana,
        createdAt: item.created_at,
        tartibRaqam: item.tartib_raqam,
        mijoz: item.mijoz,
        refraksiyametriya: item.refraksiyametriya,
        tanometriya: item.tanometriya,
        jamiSumma: item.jami_summa,
      })) || [];

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

    let summa = 0;
    if (form.refraksiyametriya) summa += 50000;
    if (form.tanometriya) summa += 15000;

    try {
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

      const { error } = await supabase
        .from("tekshiruvlar")
        .insert({
          user_id: user.id,
          sana: formatUzbekistanDate(selectedDate),
          tartib_raqam: nextTartibRaqam,
          mijoz: form.mijoz,
          refraksiyametriya: form.refraksiyametriya,
          tanometriya: form.tanometriya,
          jami_summa: summa,
        });

      if (error) throw error;

      await loadTekshiruvlar();

      setSelectedDate(new Date());
      setForm({
        mijoz: "",
        refraksiyametriya: false,
        tanometriya: false,
      });

      toast.success(t("exam.addSuccess"));
    } catch (error: any) {
      toast.error(t("toast.saveError"));
    }
  };

  const handleDelete = async () => {
    if (!deleteId || !user) return;
    
    const itemToDelete = tekshiruvlar.find((t) => t.id === deleteId);
    if (!itemToDelete) return;

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

      await loadTekshiruvlar();
      setDeleteId(null);
      toast.success(t("exam.deleteSuccess"));
    } catch (error: any) {
      toast.error(t("toast.deleteError"));
    }
  };

  const handleEdit = (item: Tekshiruv) => {
    setEditingItem(item);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !user) return;

    // Recalculate sum based on selected services
    let summa = 0;
    if (editingItem.refraksiyametriya) summa += 50000;
    if (editingItem.tanometriya) summa += 15000;

    try {
      const { error } = await supabase
        .from("tekshiruvlar")
        .update({
          mijoz: editingItem.mijoz,
          refraksiyametriya: editingItem.refraksiyametriya,
          tanometriya: editingItem.tanometriya,
          jami_summa: summa,
        })
        .eq("id", editingItem.id);

      if (error) throw error;

      await loadTekshiruvlar();
      setEditingItem(null);
      toast.success(t("common.updateSuccess"));
    } catch (error: any) {
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

  const totalSum = tekshiruvlar.reduce((sum, t) => sum + t.jamiSumma, 0);

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
        `${t("export.totalSum")}: ${totalSum.toLocaleString()} ${t("common.sum")}`,
        t("common.exportedBy"),
        t("common.dateAndTime")
      );

      const tableData = filteredTekshiruvlar.map((exam) => [
        exam.tartibRaqam,
        formatDisplayDate(exam.sana),
        exam.mijoz,
        (exam.refraksiyametriya ? "Refr." : "") + (exam.refraksiyametriya && exam.tanometriya ? ", " : "") + (exam.tanometriya ? "Tano." : ""),
        exam.jamiSumma.toLocaleString(),
      ]);

      autoTable(doc, {
        startY,
        head: [[t("exam.number"), t("common.date"), t("exam.patient"), t("exam.examinations"), t("exam.amount")]],
        body: tableData,
        styles: { 
          font: script === 'cyrillic' ? 'Roboto' : 'helvetica',
        fontSize: 9,
        cellPadding: 2,
      },
      headStyles: { 
        fillColor: [66, 66, 66],
        textColor: 255,
        font: script === 'cyrillic' ? 'Roboto' : 'helvetica',
        fontStyle: 'normal',
      },
      alternateRowStyles: { 
        fillColor: [245, 245, 245] 
      },
      columnStyles: {
        4: { halign: 'right' },
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 border border-border rounded-lg p-4 flex flex-col justify-center">
              <Label htmlFor="mijoz">{t("exam.patient")}</Label>
              <Input
                id="mijoz"
                value={form.mijoz}
                onChange={(e) => setForm({ ...form, mijoz: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2 border border-border rounded-lg p-4">
              <Label>{t("exam.examType")}</Label>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="refraksiyametriya"
                    checked={form.refraksiyametriya}
                    onCheckedChange={(checked) =>
                      setForm({ ...form, refraksiyametriya: checked as boolean })
                    }
                  />
                  <label
                    htmlFor="refraksiyametriya"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {t("exam.refractometry")}
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="tanometriya"
                    checked={form.tanometriya}
                    onCheckedChange={(checked) =>
                      setForm({ ...form, tanometriya: checked as boolean })
                    }
                  />
                  <label
                    htmlFor="tanometriya"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {t("exam.tonometry")}
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-border">
            <div className="text-lg font-semibold">
              {t("orders.totalAmount")}:{" "}
              {((form.refraksiyametriya ? 50000 : 0) + (form.tanometriya ? 15000 : 0)).toLocaleString()}{" "}
              {t("common.sum")}
            </div>
            <Button type="submit" className="bg-primary hover:bg-primary/90">
              {t("exam.add")}
            </Button>
          </div>
        </form>
      </Card>

      <div className="bg-card rounded-lg p-4 border border-border">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <h3 className="text-lg font-semibold">{t("exam.list")}</h3>
            <div className="text-lg font-bold text-primary">
              {t("exam.total")}: {totalSum.toLocaleString()} {t("common.sum")}
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
            {currentTekshiruvlar.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery ? t("exam.noResults") : t("exam.empty")}
              </div>
            ) : (
              currentTekshiruvlar.map((exam) => (
              <div key={exam.id} className="bg-card border border-border rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="font-semibold text-lg">№ {exam.tartibRaqam}</div>
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
                  <span className="text-lg font-bold">{exam.jamiSumma.toLocaleString()}</span>
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
                  <th className="px-4 py-2 text-right">{t("exam.amount")}</th>
                  <th className="px-4 py-2 text-right"></th>
                </tr>
              </thead>
              <tbody>
                {currentTekshiruvlar.map((exam) => (
                  <tr key={exam.id} className="border-b border-border">
                    <td className="px-4 py-2">{exam.tartibRaqam}</td>
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
                    <td className="px-4 py-2 text-right font-semibold">
                      {exam.jamiSumma.toLocaleString()}
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

          <div className="border border-border rounded-lg p-3 space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="edit-refraksiyametriya"
                checked={editingItem?.refraksiyametriya || false}
                onCheckedChange={(checked) =>
                  setEditingItem(
                    editingItem
                      ? { ...editingItem, refraksiyametriya: checked as boolean }
                      : null
                  )
                }
              />
              <label
                htmlFor="edit-refraksiyametriya"
                className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {t("exam.refractometry")}
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="edit-tanometriya"
                checked={editingItem?.tanometriya || false}
                onCheckedChange={(checked) =>
                  setEditingItem(
                    editingItem
                      ? { ...editingItem, tanometriya: checked as boolean }
                      : null
                  )
                }
              />
              <label
                htmlFor="edit-tanometriya"
                className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {t("exam.tonometry")}
              </label>
            </div>
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

export default Tekshiruv;
