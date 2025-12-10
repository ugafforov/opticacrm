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

interface TayyorKozoynak {
  id: string;
  sana: string;
  createdAt: string;
  tartibRaqam: number;
  kliyent: string;
  kozoynakTuri: string;
  summa: number;
}

const mapToLocal = (item: any): TayyorKozoynak => ({
  id: item.id,
  sana: item.sana,
  createdAt: item.created_at,
  tartibRaqam: item.tartib_raqam,
  kliyent: item.kliyent,
  kozoynakTuri: item.kozoynak_turi,
  summa: item.summa,
});

const TayyorKozoynaklar = () => {
  const { t, script } = useLanguage();
  const { user } = useAuth();
  const isMobile = useIsMobile();

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
            if (prev.some(k => k.id === newItem.id)) return prev;
            if (prev.some(k => k.id.startsWith('temp-') && k.kliyent === newItem.kliyent && k.sana === newItem.sana)) {
              return prev.map(k => 
                k.id.startsWith('temp-') && k.kliyent === newItem.kliyent && k.sana === newItem.sana 
                  ? newItem : k
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
          setKozoynaklar(prev => prev.filter(k => k.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const loadKozoynaklar = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("tayyor_kozoynaklar")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const mapped = data?.map(mapToLocal) || [];
      setKozoynaklar(mapped);
    } catch (error: any) {
      console.error("Error loading tayyor kozoynaklar:", error);
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
    const nextTartibRaqam = kozoynaklar.length > 0 ? Math.max(...kozoynaklar.map(k => k.tartibRaqam)) + 1 : 1;

    // Optimistik yangilanish
    const optimisticItem: TayyorKozoynak = {
      id: tempId,
      sana: formatUzbekistanDate(selectedDate),
      createdAt: new Date().toISOString(),
      tartibRaqam: nextTartibRaqam,
      kliyent: form.kliyent,
      kozoynakTuri: form.kozoynakTuri,
      summa: parseFloat(form.summa) || 0,
    };

    setKozoynaklar(prev => [optimisticItem, ...prev]);
    toast.success(t("ready.addSuccess"));

    // Formani tozalash
    const savedForm = { ...form };
    setSelectedDate(new Date());
    setForm({
      kliyent: script === 'cyrillic' ? "Мижоз" : "Mijoz",
      kozoynakTuri: "",
      summa: "",
    });

    try {
      const { data: maxData, error: maxError } = await supabase
        .from("tayyor_kozoynaklar")
        .select("tartib_raqam")
        .eq("user_id", user.id)
        .order("tartib_raqam", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (maxError) throw maxError;

      const serverTartibRaqam = maxData ? maxData.tartib_raqam + 1 : 1;

      const { data, error } = await supabase
        .from("tayyor_kozoynaklar")
        .insert({
          user_id: user.id,
          sana: formatUzbekistanDate(selectedDate),
          tartib_raqam: serverTartibRaqam,
          kliyent: savedForm.kliyent,
          kozoynak_turi: savedForm.kozoynakTuri,
          summa: parseFloat(savedForm.summa) || 0,
        })
        .select()
        .single();

      if (error) throw error;

      setKozoynaklar(prev => prev.map(k => k.id === tempId ? mapToLocal(data) : k));
    } catch (error: any) {
      setKozoynaklar(prev => prev.filter(k => k.id !== tempId));
      toast.error(t("common.error"));
    }
  };

  const handleDelete = async () => {
    if (!deleteId || !user) return;
    
    const itemToDelete = kozoynaklar.find((k) => k.id === deleteId);
    if (!itemToDelete) return;

    // Optimistik o'chirish
    setKozoynaklar(prev => prev.filter(k => k.id !== deleteId));
    setDeleteId(null);
    toast.success(t("ready.deleteSuccess"));

    try {
      await supabase.from("chiqindilar").insert([{
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
    } catch (error: any) {
      setKozoynaklar(prev => [itemToDelete, ...prev]);
      toast.error(t("common.error"));
    }
  };

  const handleEdit = (item: TayyorKozoynak) => {
    setEditingItem(item);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !user) return;

    const previousItem = kozoynaklar.find(k => k.id === editingItem.id);

    // Optimistik yangilash
    setKozoynaklar(prev => prev.map(k => k.id === editingItem.id ? editingItem : k));
    setEditingItem(null);
    toast.success(t("common.updateSuccess"));

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
    } catch (error: any) {
      if (previousItem) {
        setKozoynaklar(prev => prev.map(k => k.id === editingItem.id ? previousItem : k));
      }
      toast.error(t("common.error"));
    }
  };

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

  const totalSum = filteredKozoynaklar.reduce((sum, k) => sum + k.summa, 0);

  const exportToExcel = () => {
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

    const metaWs = XLSX.utils.json_to_sheet(metadata);
    const dataWs = XLSX.utils.json_to_sheet(data);
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, dataWs, t("common.sheet"));
    XLSX.utils.book_append_sheet(wb, metaWs, t("common.metadata"));
    
    XLSX.writeFile(wb, `Tayyor_Kozoynaklar_${formatUzbekistanDate()}.xlsx`);
    toast.success(t("toast.excelSuccess"));
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

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">{t("ready.title")}</h2>
          <p className="text-muted-foreground">{t("ready.subtitle")}</p>
        </div>
        <FormSkeleton />
        <TableSkeleton rows={10} columns={5} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">{t("ready.title")}</h2>
        <p className="text-muted-foreground">{t("ready.subtitle")}</p>
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
              <Label htmlFor="kliyent">{t("ready.client")}</Label>
              <Input
                id="kliyent"
                value={form.kliyent}
                onChange={(e) => setForm({ ...form, kliyent: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="kozoynakTuri">{t("ready.type")}</Label>
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
                placeholder={t("ready.selectType")}
                storageKey="tayyorKozoynakTypes"
                required
              />
            </div>

            <div>
              <Label htmlFor="summa">{t("ready.amount")}</Label>
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
              {t("ready.total")}: {filteredKozoynaklar.length} {t("common.items")}
            </span>
            <Button type="submit" disabled={!form.kozoynakTuri}>
              {t("ready.add")}
            </Button>
          </div>
        </form>
      </Card>

      <Card className="p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6 items-start md:items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-lg">{t("ready.list")}</h3>
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
                  <th className="text-left py-3 px-2">{t("ready.client")}</th>
                  <th className="text-left py-3 px-2">{t("ready.type")}</th>
                  <th className="text-right py-3 px-2">{t("ready.amount")}</th>
                  <th className="text-right py-3 px-2">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {currentKozoynaklar.map((k, index) => (
                  <tr key={k.id} className={`border-b hover:bg-muted/50 ${k.id.startsWith('temp-') ? 'opacity-70' : ''}`}>
                    <td className="py-3 px-2">{startIndex + index + 1}</td>
                    <td className="py-3 px-2">{formatDisplayDate(k.sana)}</td>
                    <td className="py-3 px-2">{k.kliyent}</td>
                    <td className="py-3 px-2">{getGlassesTypeTranslation(k.kozoynakTuri)}</td>
                    <td className="py-3 px-2 text-right">{k.summa.toLocaleString()} {t("common.sum")}</td>
                    <td className="py-3 px-2 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(k)} disabled={k.id.startsWith('temp-')}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(k.id)} disabled={k.id.startsWith('temp-')}>
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
            {currentKozoynaklar.map((k, index) => (
              <Card key={k.id} className={`p-4 ${k.id.startsWith('temp-') ? 'opacity-70' : ''}`}>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-medium">{k.kliyent}</p>
                    <p className="text-sm text-muted-foreground">{formatDisplayDate(k.sana)}</p>
                  </div>
                  <span className="text-sm font-medium">{k.summa.toLocaleString()} {t("common.sum")}</span>
                </div>
                <div className="text-sm text-muted-foreground mb-2">
                  {getGlassesTypeTranslation(k.kozoynakTuri)}
                </div>
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-xs text-muted-foreground">№{startIndex + index + 1}</span>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(k)} disabled={k.id.startsWith('temp-')}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleteId(k.id)} disabled={k.id.startsWith('temp-')}>
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

        {filteredKozoynaklar.length === 0 && (
          <p className="text-center text-muted-foreground py-8">{t("common.noData")}</p>
        )}
      </Card>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={handleDelete}
        title={t("common.confirmDelete")}
        description={t("ready.deleteConfirm")}
      />

      <EditDialog
        open={!!editingItem}
        onOpenChange={(open) => !open && setEditingItem(null)}
        onSubmit={handleUpdate}
        title={t("ready.edit")}
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
              <Label>{t("ready.client")}</Label>
              <Input
                value={editingItem.kliyent}
                onChange={(e) => setEditingItem({ ...editingItem, kliyent: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("ready.type")}</Label>
              <SelectWithOther
                value={editingItem.kozoynakTuri}
                onChange={(value) => setEditingItem({ ...editingItem, kozoynakTuri: value })}
                options={[
                  { value: "quyoshdan-himoya", label: t("ready.sunProtection") },
                  { value: "kompyuter-hameleon", label: t("ready.computerChameleon") },
                  { value: "kompyuter", label: t("ready.computer") },
                  { value: "zreniya", label: t("ready.vision") },
                ]}
                placeholder={t("ready.selectType")}
                storageKey="tayyorKozoynakTypes"
              />
            </div>
            <div className="space-y-2">
              <Label>{t("ready.amount")}</Label>
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

export default TayyorKozoynaklar;
