import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Trash2, Search, Pencil, Download, CalendarIcon, Printer, Wallet } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, subWeeks, subMonths } from "date-fns";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EditDialog } from "@/components/EditDialog";
import { formatUzbekistanDate, formatUzbekistanDateTime, formatDisplayDate } from "@/lib/utils";
import { PriceInput } from "@/components/PriceInput";
import { setupPdfDoc, addPdfHeader } from "@/lib/pdfHelpers";
import { useXarajatlar, Xarajat } from "@/hooks/useXarajatlar";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { DateFilterSelect } from "@/components/DateFilterSelect";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

const Xarajatlar = () => {
  const { t, script } = useLanguage();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const { xarajatlar, loading, addXarajat, updateXarajat, deleteXarajat } = useXarajatlar();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [dateFilter, setDateFilter] = useState<string>("today");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  
  const [form, setForm] = useState({
    kategoriya: "",
    tavsif: "",
    summa: "",
  });
  
  const [editingItem, setEditingItem] = useState<Xarajat | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const kategoriyalar = [
    { value: "ijara", label: t("expenses.rent") },
    { value: "oylik", label: t("expenses.salary") },
    { value: "kommunal", label: t("expenses.utilities") },
    { value: "transport", label: t("expenses.transport") },
    { value: "mahsulot", label: t("expenses.purchase") },
    { value: "boshqa", label: t("expenses.other") },
  ];

  const getKategoriyaLabel = (value: string): string => {
    const found = kategoriyalar.find(k => k.value === value);
    return found ? found.label : value;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const success = await addXarajat({
      sana: selectedDate,
      kategoriya: form.kategoriya,
      tavsif: form.tavsif,
      summa: parseFloat(form.summa) || 0,
    });

    if (success) {
      setSelectedDate(new Date());
      setForm({
        kategoriya: "",
        tavsif: "",
        summa: "",
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteXarajat(deleteId);
    setDeleteId(null);
  };

  const handleEdit = (item: Xarajat) => {
    setEditingItem(item);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    const success = await updateXarajat(editingItem.id, {
      sana: editingItem.sana,
      kategoriya: editingItem.kategoriya,
      tavsif: editingItem.tavsif,
      summa: editingItem.summa,
    });

    if (success) {
      setEditingItem(null);
    }
  };

  const filteredXarajatlar = xarajatlar.filter((x) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = (
      x.kategoriya.toLowerCase().includes(query) ||
      x.tavsif.toLowerCase().includes(query) ||
      x.sana.includes(query)
    );

    if (!matchesSearch) return false;

    if (dateFilter === "all") return true;

    const itemDate = new Date(x.sana.split('-').reverse().join('-'));
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

  const totalPages = Math.ceil(filteredXarajatlar.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentXarajatlar = filteredXarajatlar.slice(startIndex, endIndex);

  const totalSum = filteredXarajatlar.reduce((sum, x) => sum + x.summa, 0);

  const exportToExcel = () => {
    const dateTime = formatUzbekistanDateTime();
    
    const metadata = [
      { [t("export.info")]: t("export.exportedBy"), [t("export.value")]: user?.email || t("export.unknown") },
      { [t("export.info")]: t("export.dateTime"), [t("export.value")]: dateTime },
      { [t("export.info")]: t("expenses.totalExpenses"), [t("export.value")]: `${totalSum.toLocaleString()} ${t("common.sum")}` },
    ];
    
    const data = filteredXarajatlar.map((x) => ({
      [t("orders.number")]: x.tartibRaqam,
      [t("common.date")]: formatDisplayDate(x.sana),
      [t("expenses.category")]: getKategoriyaLabel(x.kategoriya),
      [t("expenses.description")]: x.tavsif,
      [t("expenses.amount")]: x.summa,
    }));

    const metaWs = XLSX.utils.json_to_sheet(metadata);
    const dataWs = XLSX.utils.json_to_sheet(data);
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, dataWs, t("common.sheet"));
    XLSX.utils.book_append_sheet(wb, metaWs, t("common.metadata"));
    
    XLSX.writeFile(wb, `Xarajatlar_${formatUzbekistanDate()}.xlsx`);
    toast.success(t("toast.excelSuccess"));
  };

  const exportToPDF = async () => {
    try {
      const doc = await setupPdfDoc('portrait', script);
      
      const startY = addPdfHeader(
        doc,
        t("expenses.list"),
        user?.email,
        `${t("expenses.totalExpenses")}: ${totalSum.toLocaleString()} ${t("common.sum")}`,
        t("common.exportedBy"),
        t("common.dateAndTime")
      );

      const tableData = filteredXarajatlar.map((x) => [
        x.tartibRaqam,
        formatDisplayDate(x.sana),
        getKategoriyaLabel(x.kategoriya),
        x.tavsif,
        `${x.summa.toLocaleString()} ${t("common.currency")}`,
      ]);

      autoTable(doc, {
        startY,
        head: [[t("orders.number"), t("common.date"), t("expenses.category"), t("expenses.description"), t("expenses.amount")]],
        body: tableData,
        styles: { 
          font: script === 'cyrillic' ? 'Roboto' : 'helvetica',
          fontSize: 10,
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
        },
      });

      doc.save(`Xarajatlar_${formatUzbekistanDate()}.pdf`);
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
          <title>${t("expenses.list")}</title>
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
          <h1>${t("expenses.list")}</h1>
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
        <h2 className="text-2xl font-bold text-foreground mb-2 flex items-center gap-2">
          <Wallet className="w-6 h-6" />
          {t("expenses.title")}
        </h2>
        <p className="text-muted-foreground">{t("expenses.subtitle")}</p>
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

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="kategoriya">{t("expenses.category")}</Label>
              <Select
                value={form.kategoriya}
                onValueChange={(value) => setForm({ ...form, kategoriya: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("form.select")} />
                </SelectTrigger>
                <SelectContent>
                  {kategoriyalar.map((k) => (
                    <SelectItem key={k.value} value={k.value}>
                      {k.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="tavsif">{t("expenses.description")}</Label>
              <Input
                id="tavsif"
                value={form.tavsif}
                onChange={(e) => setForm({ ...form, tavsif: e.target.value })}
                placeholder={t("expenses.descriptionPlaceholder")}
              />
            </div>

            <div>
              <Label htmlFor="summa">{t("expenses.amount")}</Label>
              <PriceInput
                value={form.summa}
                onChange={(value) => setForm({ ...form, summa: value })}
                placeholder="0"
              />
            </div>

            <div className="flex items-end">
              <Button type="submit" className="w-full" disabled={!form.kategoriya || !form.summa}>
                {t("common.add")}
              </Button>
            </div>
          </div>
        </form>
      </Card>

      <Card className="p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
          <h3 className="font-semibold text-lg">{t("expenses.list")}</h3>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder={t("orders.search")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-[200px]"
              />
            </div>
            <DateFilterSelect value={dateFilter} onValueChange={setDateFilter} />
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" onClick={exportToExcel}>
                    <Download className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Excel</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" onClick={exportToPDF}>
                    <Download className="h-4 w-4 text-red-500" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>PDF</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" onClick={handlePrint}>
                    <Printer className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Print</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-4">
          <p className="text-sm text-muted-foreground mb-1">{t("expenses.totalExpenses")}</p>
          <p className="text-2xl font-bold text-destructive">{totalSum.toLocaleString()} {t("common.currency")}</p>
          <p className="text-xs text-muted-foreground mt-1">{filteredXarajatlar.length} {t("reports.records")}</p>
        </div>

        <div className="overflow-x-auto">
          <table id="printable-table" className="w-full border-collapse">
            <thead>
              <tr className="bg-muted">
                <th className="border border-border p-2 text-left">{t("orders.number")}</th>
                <th className="border border-border p-2 text-left">{t("common.date")}</th>
                <th className="border border-border p-2 text-left">{t("expenses.category")}</th>
                <th className="border border-border p-2 text-left">{t("expenses.description")}</th>
                <th className="border border-border p-2 text-right">{t("expenses.amount")}</th>
                <th className="border border-border p-2 text-center">{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="border border-border p-4 text-center">
                    {t("common.loading")}
                  </td>
                </tr>
              ) : currentXarajatlar.length === 0 ? (
                <tr>
                  <td colSpan={6} className="border border-border p-4 text-center text-muted-foreground">
                    {t("expenses.empty")}
                  </td>
                </tr>
              ) : (
                currentXarajatlar.map((x) => (
                  <tr key={x.id} className="hover:bg-muted/50">
                    <td className="border border-border p-2">{x.tartibRaqam}</td>
                    <td className="border border-border p-2">{formatDisplayDate(x.sana)}</td>
                    <td className="border border-border p-2">{getKategoriyaLabel(x.kategoriya)}</td>
                    <td className="border border-border p-2">{x.tavsif}</td>
                    <td className="border border-border p-2 text-right font-medium">
                      {x.summa.toLocaleString()} {t("common.currency")}
                    </td>
                    <td className="border border-border p-2">
                      <div className="flex justify-center gap-1">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(x)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{t("common.edit")}</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeleteId(x.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{t("common.delete")}</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="mt-4">
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
      </Card>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title={t("delete.confirm")}
        description={t("delete.confirmDesc")}
        onConfirm={handleDelete}
      />

      <EditDialog
        open={!!editingItem}
        onOpenChange={(open) => !open && setEditingItem(null)}
        title={t("edit.title")}
      >
        {editingItem && (
          <form onSubmit={handleUpdate} className="space-y-4">
            <div>
              <Label>{t("common.date")}</Label>
              <Input
                type="date"
                value={editingItem.sana.split('-').reverse().join('-')}
                onChange={(e) => {
                  const [year, month, day] = e.target.value.split('-');
                  setEditingItem({ ...editingItem, sana: `${day}-${month}-${year}` });
                }}
              />
            </div>
            <div>
              <Label>{t("expenses.category")}</Label>
              <Select
                value={editingItem.kategoriya}
                onValueChange={(value) => setEditingItem({ ...editingItem, kategoriya: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {kategoriyalar.map((k) => (
                    <SelectItem key={k.value} value={k.value}>
                      {k.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("expenses.description")}</Label>
              <Input
                value={editingItem.tavsif}
                onChange={(e) => setEditingItem({ ...editingItem, tavsif: e.target.value })}
              />
            </div>
            <div>
              <Label>{t("expenses.amount")}</Label>
              <PriceInput
                value={editingItem.summa.toString()}
                onChange={(value) => setEditingItem({ ...editingItem, summa: parseFloat(value) || 0 })}
              />
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
    </div>
  );
};

export default Xarajatlar;
