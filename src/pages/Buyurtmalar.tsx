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
import { formatUzbekistanDate, getUzbekistanISOString, formatPhoneNumber, formatUzbekistanDateTime, formatDisplayDate } from "@/lib/utils";
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

interface Buyurtma {
  id: string;
  sana: string;
  createdAt: string;
  tartibRaqam: number;
  mijoz: string;
  telefon?: string;
  od: string;
  os: string;
  oynaTuri: string;
  oynaNarxi: number;
  opravaNarxi: number;
  opravaTuri: string;
  jamiSumma: number;
}

const Buyurtmalar = () => {
  const { t, script } = useLanguage();
  const { user } = useAuth();
  const isMobile = useIsMobile();

  // Mapping funksiyalar - lotin yozuvli qiymatlarni tarjima kalitlariga moslashtirish
  const getLensTypeTranslation = (lensType: string): string => {
    const lensMap: Record<string, string> = {
      "3B1 jigarrang": t("lens.3b1Brown"),
      "3B1 qora": t("lens.3b1Black"),
      "4B1": t("lens.4b1"),
      "420": t("lens.420"),
      "SR": t("lens.sr"),
    };
    return lensMap[lensType] || lensType;
  };

  const getFrameTypeTranslation = (frameType: string): string => {
    const frameMap: Record<string, string> = {
      "dumaloq": t("frame.round"),
      "fabritsio": t("frame.fabritsio"),
      "alaniye": t("frame.alaniye"),
      "titanik": t("frame.titanik"),
    };
    return frameMap[frameType] || frameType;
  };
  const [buyurtmalar, setBuyurtmalar] = useState<Buyurtma[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [form, setForm] = useState({
    mijoz: "",
    telefon: "+998 ",
    od: "",
    os: "",
    oynaTuri: "",
    oynaNarxi: "",
    opravaNarxi: "",
    opravaTuri: "",
  });
  const [editingItem, setEditingItem] = useState<Buyurtma | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    if (user) {
      loadBuyurtmalar();
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('buyurtmalar-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'buyurtmalar',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          loadBuyurtmalar();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const loadBuyurtmalar = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("buyurtmalar")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const mapped = data?.map((item) => ({
        id: item.id,
        sana: item.sana,
        createdAt: item.created_at,
        tartibRaqam: item.tartib_raqam,
        mijoz: item.mijoz,
        telefon: item.telefon,
        od: item.od,
        os: item.os,
        oynaTuri: item.oyna_tури,
        oynaNarxi: item.oyna_narxi,
        opravaNarxi: item.oprava_narxi,
        opravaTuri: item.oprava_turi,
        jamiSumma: item.jami_summa,
      })) || [];

      setBuyurtmalar(mapped);
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
    
    const jamiSumma = (parseFloat(form.oynaNarxi) || 0) + (parseFloat(form.opravaNarxi) || 0);
    
    try {
      // Get the maximum tartib_raqam for this user
      const { data: maxData, error: maxError } = await supabase
        .from("buyurtmalar")
        .select("tartib_raqam")
        .eq("user_id", user.id)
        .order("tartib_raqam", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (maxError) throw maxError;

      const nextTartibRaqam = maxData ? maxData.tartib_raqam + 1 : 1;

      const { error } = await supabase
        .from("buyurtmalar")
        .insert({
          user_id: user.id,
          sana: formatUzbekistanDate(selectedDate),
          tartib_raqam: nextTartibRaqam,
          mijoz: form.mijoz,
          telefon: form.telefon,
          od: form.od,
          os: form.os,
          oyna_tури: form.oynaTuri,
          oyna_narxi: parseFloat(form.oynaNarxi) || 0,
          oprava_narxi: parseFloat(form.opravaNarxi) || 0,
          oprava_turi: form.opravaTuri,
          jami_summa: jamiSumma,
        });

      if (error) throw error;

      await loadBuyurtmalar();
      
      setSelectedDate(new Date());
      setForm({
        mijoz: "",
        telefon: "+998 ",
        od: "",
        os: "",
        oynaTuri: "",
        oynaNarxi: "",
        opravaNarxi: "",
        opravaTuri: "",
      });
      
      toast.success(t("orders.addSuccess"));
    } catch (error: any) {
      toast.error(t("toast.saveError"));
    }
  };

  const handleDelete = async () => {
    if (!deleteId || !user) return;
    
    const itemToDelete = buyurtmalar.find((b) => b.id === deleteId);
    if (!itemToDelete) return;

    try {
      // Save to chiqindilar before deleting
      const { error: trashError } = await supabase.from("chiqindilar").insert([{
        user_id: user.id,
        item_id: deleteId,
        type: "buyurtmalar",
        data: itemToDelete as any,
        deleted_at: getUzbekistanISOString(),
      }]);

      // Delete the buyurtma
      const { error } = await supabase
        .from("buyurtmalar")
        .delete()
        .eq("id", deleteId);

      if (error) throw error;

      await loadBuyurtmalar();
      setDeleteId(null);
      toast.success(t("orders.deleteSuccess"));
    } catch (error: any) {
      toast.error(t("toast.deleteError"));
    }
  };

  const handleEdit = (item: Buyurtma) => {
    setEditingItem(item);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !user) return;

    try {
      const { error } = await supabase
        .from("buyurtmalar")
        .update({
          mijoz: editingItem.mijoz,
          telefon: editingItem.telefon,
          od: editingItem.od,
          os: editingItem.os,
          oyna_tури: editingItem.oynaTuri,
          oyna_narxi: editingItem.oynaNarxi,
          oprava_narxi: editingItem.opravaNarxi,
          oprava_turi: editingItem.opravaTuri,
          jami_summa: editingItem.jamiSumma,
        })
        .eq("id", editingItem.id);

      if (error) throw error;

      await loadBuyurtmalar();
      setEditingItem(null);
      toast.success(t("common.updateSuccess"));
    } catch (error: any) {
      toast.error(t("toast.updateError"));
    }
  };

  const filteredBuyurtmalar = buyurtmalar.filter((b) => {
    const query = searchQuery.toLowerCase();
    const searchDigits = searchQuery.replace(/\D/g, "");
    const phoneDigits = b.telefon ? b.telefon.replace(/\D/g, "") : "";
    
    const matchesSearch = (
      b.mijoz.toLowerCase().includes(query) ||
      b.sana.includes(query) ||
      (searchDigits && phoneDigits.includes(searchDigits))
    );

    if (!matchesSearch) return false;

    // Date filter logic
    if (dateFilter === "all") return true;

    const itemDate = new Date(b.sana.split('-').reverse().join('-')); // Convert DD-MM-YYYY to YYYY-MM-DD
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

  const totalPages = Math.ceil(filteredBuyurtmalar.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentBuyurtmalar = filteredBuyurtmalar.slice(startIndex, endIndex);

  const totalSum = buyurtmalar.reduce((sum, b) => sum + b.jamiSumma, 0);

  const exportToExcel = () => {
    const dateTime = formatUzbekistanDateTime();
    
    // Metadata
    const metadata = [
      { [t("export.info")]: t("export.exportedBy"), [t("export.value")]: user?.email || t("export.unknown") },
      { [t("export.info")]: t("export.dateTime"), [t("export.value")]: dateTime },
      { [t("export.info")]: t("export.totalSum"), [t("export.value")]: `${totalSum.toLocaleString()} ${t("common.sum")}` },
    ];
    
    // Main data
    const data = filteredBuyurtmalar.map((b) => ({
      [t("orders.number")]: b.tartibRaqam,
      [t("common.date")]: formatDisplayDate(b.sana),
      [t("orders.client")]: b.mijoz,
      [t("orders.phone")]: b.telefon || "-",
      [t("form.rightEye")]: b.od,
      [t("form.leftEye")]: b.os,
      [t("form.lensType")]: getLensTypeTranslation(b.oynaTuri),
      [t("form.lensPrice")]: b.oynaNarxi,
      [t("form.frameType")]: getFrameTypeTranslation(b.opravaTuri),
      [t("form.framePrice")]: b.opravaNarxi,
      [t("orders.totalAmount")]: b.jamiSumma,
    }));

    const metaWs = XLSX.utils.json_to_sheet(metadata);
    const dataWs = XLSX.utils.json_to_sheet(data);
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, dataWs, t("common.sheet"));
    XLSX.utils.book_append_sheet(wb, metaWs, t("common.metadata"));
    
    XLSX.writeFile(wb, `Buyurtmalar_${formatUzbekistanDate()}.xlsx`);
    toast.success(t("toast.excelSuccess"));
  };

  const exportToPDF = async () => {
    try {
      const doc = await setupPdfDoc('landscape', script);
      
      const startY = addPdfHeader(
        doc,
        t("orders.list"),
        user?.email,
        `${t("export.totalSum")}: ${totalSum.toLocaleString()} ${t("common.sum")}`
      );

      const tableData = filteredBuyurtmalar.map((b) => [
        b.tartibRaqam,
        formatDisplayDate(b.sana),
        b.mijoz,
        b.telefon || "-",
        `${b.od} / ${b.os}`,
        getLensTypeTranslation(b.oynaTuri),
        getFrameTypeTranslation(b.opravaTuri),
        b.jamiSumma.toLocaleString(),
      ]);

      autoTable(doc, {
        startY,
        head: [['№', t("common.date"), t("orders.client"), t("orders.phone"), 'OD/OS', t("form.lensType"), t("form.frameType"), t("orders.totalAmount")]],
        body: tableData,
        styles: { 
          font: script === 'cyrillic' ? 'Roboto' : 'helvetica',
        fontSize: 8,
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
        6: { halign: 'right' },
      },
    });

    doc.save(`Buyurtmalar_${formatUzbekistanDate()}.pdf`);
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
          <title>Buyurtmalar ro'yxati</title>
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
          <h1>Buyurtmalar ro'yxati</h1>
          <p class="print-date">Sana: ${formatDisplayDate(formatUzbekistanDate())}</p>
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
        <h2 className="text-2xl font-bold text-foreground mb-2">{t("orders.title")}</h2>
        <p className="text-muted-foreground">{t("orders.subtitle")}</p>
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
              <Label htmlFor="telefon">{t("form.phone")}</Label>
              <Input
                id="telefon"
                type="tel"
                value={form.telefon}
                onChange={(e) => {
                  setForm({ ...form, telefon: formatPhoneNumber(e.target.value) });
                }}
                placeholder="+998 90 123 45 67"
              />
            </div>

            <div>
              <Label htmlFor="od">{t("form.rightEye")}</Label>
              <Input
                id="od"
                value={form.od}
                onChange={(e) => setForm({ ...form, od: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="os">{t("form.leftEye")}</Label>
              <Input
                id="os"
                value={form.os}
                onChange={(e) => setForm({ ...form, os: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="oynaTuri">{t("form.lensType")}</Label>
              <Select value={form.oynaTuri} onValueChange={(value) => setForm({ ...form, oynaTuri: value })}>
                <SelectTrigger>
                  <SelectValue placeholder={t("form.select")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3B1 jigarrang">{t("lens.3b1Brown")}</SelectItem>
                  <SelectItem value="3B1 qora">{t("lens.3b1Black")}</SelectItem>
                  <SelectItem value="4B1">{t("lens.4b1")}</SelectItem>
                  <SelectItem value="420">{t("lens.420")}</SelectItem>
                  <SelectItem value="SR">{t("lens.sr")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="oynaNarxi">{t("form.lensPrice")}</Label>
              <Input
                id="oynaNarxi"
                type="number"
                value={form.oynaNarxi}
                onChange={(e) => setForm({ ...form, oynaNarxi: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="opravaTuri">{t("form.frameType")}</Label>
              <Select value={form.opravaTuri} onValueChange={(value) => setForm({ ...form, opravaTuri: value })}>
                <SelectTrigger>
                  <SelectValue placeholder={t("form.select")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dumaloq">{t("frame.round")}</SelectItem>
                  <SelectItem value="fabritsio">{t("frame.fabritsio")}</SelectItem>
                  <SelectItem value="alaniye">{t("frame.alaniye")}</SelectItem>
                  <SelectItem value="titanik">{t("frame.titanik")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="opravaNarxi">{t("form.framePrice")}</Label>
              <Input
                id="opravaNarxi"
                type="number"
                value={form.opravaNarxi}
                onChange={(e) => setForm({ ...form, opravaNarxi: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-border">
            <div className="text-lg font-semibold">
              {t("orders.totalAmount")}: {((parseFloat(form.oynaNarxi) || 0) + (parseFloat(form.opravaNarxi) || 0)).toLocaleString()} {t("common.sum")}
            </div>
            <Button type="submit" className="bg-primary hover:bg-primary/90">
              {t("orders.add")}
            </Button>
          </div>
        </form>
      </Card>

      <div className="bg-card rounded-lg p-4 border border-border">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <h3 className="text-lg font-semibold">{t("orders.list")}</h3>
            <div className="text-lg font-bold text-primary">
              {t("orders.total")}: {totalSum.toLocaleString()} {t("common.sum")}
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
                placeholder={t("orders.search")}
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
            {currentBuyurtmalar.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery ? "Qidiruv bo'yicha natija topilmadi" : "Hozircha buyurtmalar yo'q"}
              </div>
            ) : (
              currentBuyurtmalar.map((b) => (
              <div key={b.id} className="bg-card border border-border rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="font-semibold text-lg">№ {b.tartibRaqam}</div>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="text-sm text-muted-foreground cursor-help">
                            {formatDisplayDate(b.sana)}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{formatUzbekistanDateTime(new Date(b.createdAt))}</p>
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
                            onClick={() => handleEdit(b)}
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
                            onClick={() => setDeleteId(b.id)}
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
                    <span className="text-muted-foreground">{t("orders.client")}:</span>
                    <span className="ml-2 font-medium">{b.mijoz}</span>
                  </div>
                  {b.telefon && (
                    <div>
                      <span className="text-muted-foreground">{t("orders.phone")}:</span>
                      <span className="ml-2">{b.telefon}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground">OD / OS:</span>
                    <span className="ml-2">{b.od} / {b.os}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t("form.lensType")}:</span>
                    <span className="ml-2">{getLensTypeTranslation(b.oynaTuri)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t("form.frameType")}:</span>
                    <span className="ml-2">{getFrameTypeTranslation(b.opravaTuri)}</span>
                  </div>
                </div>
                
                <div className="pt-2 border-t border-border flex justify-between items-center">
                  <span className="text-muted-foreground text-sm">{t("orders.totalAmount")}:</span>
                  <span className="text-lg font-bold">{b.jamiSumma.toLocaleString()}</span>
                </div>
              </div>
            ))
            )}
          </div>
        ) : (
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            {currentBuyurtmalar.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery ? "Qidiruv bo'yicha natija topilmadi" : "Hozircha buyurtmalar yo'q"}
              </div>
            ) : (
              <table id="printable-table" className="w-full min-w-[640px]">
              <thead className="bg-secondary text-secondary-foreground">
                <tr>
                  <th className="px-2 sm:px-4 py-2 text-left text-sm">№</th>
                  <th className="px-2 sm:px-4 py-2 text-left text-sm">{t("common.date")}</th>
                  <th className="px-2 sm:px-4 py-2 text-left text-sm">{t("orders.client")}</th>
                  <th className="px-2 sm:px-4 py-2 text-left text-sm">{t("orders.phone")}</th>
                  <th className="px-2 sm:px-4 py-2 text-left text-sm">OD/OS</th>
                  <th className="px-2 sm:px-4 py-2 text-left text-sm">{t("form.lensType")}</th>
                  <th className="px-2 sm:px-4 py-2 text-left text-sm">{t("form.frameType")}</th>
                  <th className="px-2 sm:px-4 py-2 text-right text-sm">{t("orders.totalAmount")}</th>
                  <th className="px-2 sm:px-4 py-2 text-right"></th>
                </tr>
              </thead>
              <tbody>
                {currentBuyurtmalar.map((b) => (
                  <tr key={b.id} className="border-b border-border hover:bg-muted/50">
                    <td className="px-2 sm:px-4 py-2 text-sm">{b.tartibRaqam}</td>
                    <td className="px-2 sm:px-4 py-2 text-sm">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-help">{formatDisplayDate(b.sana)}</span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{formatUzbekistanDateTime(new Date(b.createdAt))}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </td>
                    <td className="px-2 sm:px-4 py-2 text-sm">{b.mijoz}</td>
                    <td className="px-2 sm:px-4 py-2 text-sm whitespace-nowrap">{b.telefon || "-"}</td>
                    <td className="px-2 sm:px-4 py-2 text-sm whitespace-nowrap">{b.od} / {b.os}</td>
                    <td className="px-2 sm:px-4 py-2 text-sm">{getLensTypeTranslation(b.oynaTuri)}</td>
                    <td className="px-2 sm:px-4 py-2 text-sm">{getFrameTypeTranslation(b.opravaTuri)}</td>
                    <td className="px-2 sm:px-4 py-2 text-right font-semibold text-sm whitespace-nowrap">{b.jamiSumma.toLocaleString()}</td>
                    <td className="px-2 sm:px-4 py-2 text-right">
                      <TooltipProvider>
                        <div className="flex gap-1 justify-end">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(b)}
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
                                onClick={() => setDeleteId(b.id)}
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
              <Label htmlFor="edit-mijoz" className="text-xs">{t("orders.client")}</Label>
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

            <div>
              <Label htmlFor="edit-telefon" className="text-xs">{t("form.phone")}</Label>
              <Input
                id="edit-telefon"
                type="tel"
                value={editingItem?.telefon || "+998 "}
                onChange={(e) => {
                  setEditingItem(
                    editingItem ? { ...editingItem, telefon: formatPhoneNumber(e.target.value) } : null
                  );
                }}
                placeholder="+998 90 123 45 67"
                className="h-9"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="edit-od" className="text-xs">{t("form.rightEye")}</Label>
              <Input
                id="edit-od"
                value={editingItem?.od || ""}
                onChange={(e) =>
                  setEditingItem(
                    editingItem ? { ...editingItem, od: e.target.value } : null
                  )
                }
                className="h-9"
              />
            </div>
            <div>
              <Label htmlFor="edit-os" className="text-xs">{t("form.leftEye")}</Label>
              <Input
                id="edit-os"
                value={editingItem?.os || ""}
                onChange={(e) =>
                  setEditingItem(
                    editingItem ? { ...editingItem, os: e.target.value } : null
                  )
                }
                className="h-9"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="edit-oynaTuri" className="text-xs">{t("form.lensType")}</Label>
              <Select
                value={editingItem?.oynaTuri || ""}
                onValueChange={(value) =>
                  setEditingItem(
                    editingItem ? { ...editingItem, oynaTuri: value } : null
                  )
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3B1 jigarrang">{t("lens.3b1Brown")}</SelectItem>
                  <SelectItem value="3B1 qora">{t("lens.3b1Black")}</SelectItem>
                  <SelectItem value="4B1">{t("lens.4b1")}</SelectItem>
                  <SelectItem value="420">{t("lens.420")}</SelectItem>
                  <SelectItem value="SR">{t("lens.sr")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="edit-oynaNarxi" className="text-xs">{t("orders.lensPrice")}</Label>
              <Input
                id="edit-oynaNarxi"
                type="number"
                value={editingItem?.oynaNarxi || ""}
                onChange={(e) =>
                  setEditingItem(
                    editingItem
                      ? { ...editingItem, oynaNarxi: parseFloat(e.target.value), jamiSumma: parseFloat(e.target.value) + (editingItem.opravaNarxi || 0) }
                      : null
                  )
                }
                required
                className="h-9"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="edit-opravaTuri" className="text-xs">{t("form.frameType")}</Label>
              <Select
                value={editingItem?.opravaTuri || ""}
                onValueChange={(value) =>
                  setEditingItem(
                    editingItem ? { ...editingItem, opravaTuri: value } : null
                  )
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dumaloq">{t("frame.round")}</SelectItem>
                  <SelectItem value="fabritsio">{t("frame.fabritsio")}</SelectItem>
                  <SelectItem value="alaniye">{t("frame.alaniye")}</SelectItem>
                  <SelectItem value="titanik">{t("frame.titanik")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="edit-opravaNarxi" className="text-xs">{t("orders.framePrice")}</Label>
              <Input
                id="edit-opravaNarxi"
                type="number"
                value={editingItem?.opravaNarxi || ""}
                onChange={(e) =>
                  setEditingItem(
                    editingItem
                      ? { ...editingItem, opravaNarxi: parseFloat(e.target.value), jamiSumma: (editingItem.oynaNarxi || 0) + parseFloat(e.target.value) }
                      : null
                  )
                }
                required
                className="h-9"
              />
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

export default Buyurtmalar;
