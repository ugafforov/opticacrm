import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Trash2, Search, Pencil, Download, CalendarIcon, Printer, Users } from "lucide-react";
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
import { useQarzdorlar, Qarzdor } from "@/hooks/useQarzdorlar";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { DateFilterSelect } from "@/components/DateFilterSelect";
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

const Qarzdorlar = () => {
  const { t, script } = useLanguage();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const { qarzdorlar, loading, addQarzdor, updateQarzdor, deleteQarzdor } = useQarzdorlar();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [dateFilter, setDateFilter] = useState<string>("all");
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

  const handleSubmit = async (e: React.FormEvent) => {
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
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteQarzdor(deleteId);
    setDeleteId(null);
  };

  const handleEdit = (item: Qarzdor) => {
    setEditingItem(item);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

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
  };

  const filteredQarzdorlar = qarzdorlar.filter((x) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = (
      x.mijoz.toLowerCase().includes(query) ||
      x.telefon.toLowerCase().includes(query) ||
      x.izoh.toLowerCase().includes(query) ||
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

  const totalPages = Math.ceil(filteredQarzdorlar.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentQarzdorlar = filteredQarzdorlar.slice(startIndex, endIndex);

  const totalSum = filteredQarzdorlar.reduce((sum, x) => sum + x.qarzSummasi, 0);

  const formatPrice = (price: number) => {
    return price.toLocaleString('uz-UZ');
  };

  const exportToExcel = () => {
    const dateTime = formatUzbekistanDateTime();
    
    const metadata = [
      { [t("export.info")]: t("export.exportedBy"), [t("export.value")]: user?.email || t("export.unknown") },
      { [t("export.info")]: t("export.dateTime"), [t("export.value")]: dateTime },
      { [t("export.info")]: t("debtors.totalDebt"), [t("export.value")]: `${totalSum.toLocaleString()} ${t("common.sum")}` },
    ];
    
    const data = filteredQarzdorlar.map((x) => ({
      [t("orders.number")]: x.tartibRaqam,
      [t("common.date")]: formatDisplayDate(x.sana),
      [t("debtors.debtorName")]: x.mijoz,
      [t("debtors.debtorPhone")]: x.telefon,
      [t("debtors.debtAmount")]: x.qarzSummasi,
      [t("debtors.note")]: x.izoh,
    }));

    const metaWs = XLSX.utils.json_to_sheet(metadata);
    const dataWs = XLSX.utils.json_to_sheet(data);
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, dataWs, t("common.sheet"));
    XLSX.utils.book_append_sheet(wb, metaWs, t("common.metadata"));
    
    XLSX.writeFile(wb, `Qarzdorlar_${formatUzbekistanDate()}.xlsx`);
    toast.success(t("toast.excelSuccess"));
  };

  const exportToPDF = async () => {
    try {
      const doc = await setupPdfDoc('landscape', script);
      
      const startY = addPdfHeader(
        doc,
        t("debtors.list"),
        user?.email,
        `${t("debtors.totalDebt")}: ${totalSum.toLocaleString()} ${t("common.sum")}`,
        t("common.exportedBy"),
        t("common.dateAndTime")
      );

      const tableData = filteredQarzdorlar.map((x) => [
        x.tartibRaqam,
        formatDisplayDate(x.sana),
        x.mijoz,
        x.telefon,
        `${x.qarzSummasi.toLocaleString()} ${t("common.currency")}`,
        x.izoh,
      ]);

      autoTable(doc, {
        startY,
        head: [[t("orders.number"), t("common.date"), t("debtors.debtorName"), t("debtors.debtorPhone"), t("debtors.debtAmount"), t("debtors.note")]],
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

      doc.save(`Qarzdorlar_${formatUzbekistanDate()}.pdf`);
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
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2 flex items-center gap-2">
          <Users className="w-6 h-6" />
          {t("debtors.title")}
        </h2>
        <p className="text-muted-foreground">{t("debtors.subtitle")}</p>
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
              <Button type="submit" className="w-full" disabled={!form.mijoz || !form.qarzSummasi}>
                {t("common.add")}
              </Button>
            </div>
          </div>
        </form>
      </Card>

      <div className="bg-card rounded-lg p-4 border border-border">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <h3 className="text-lg font-semibold">{t("debtors.list")}</h3>
            <div className="text-lg font-bold text-destructive">
              {t("debtors.totalDebt")}: {formatPrice(totalSum)} {t("common.currency")}
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <DateFilterSelect value={dateFilter} onValueChange={setDateFilter} />
            
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-primary/60 w-4 h-4 pointer-events-none z-10" />
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
              <Button variant="outline" size="sm" onClick={exportToExcel} className="gap-2">
                <Download className="w-4 h-4" />
                Excel
              </Button>
              <Button variant="outline" size="sm" onClick={exportToPDF} className="gap-2">
                <Download className="w-4 h-4" />
                PDF
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
                <Printer className="w-4 h-4" />
                Print
              </Button>
            </div>
          </div>
        </div>

        {isMobile ? (
          <div className="space-y-4">
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
                <div key={x.id} className="bg-card border border-border rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="font-semibold text-lg">№ {startIndex + index + 1}</div>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="text-sm text-muted-foreground cursor-help">
                              {formatDisplayDate(x.sana)}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{formatUzbekistanDateTime(new Date(x.createdAt))}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(x)}
                        className="hover:bg-primary/10 hover:text-primary"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteId(x.id)}
                        className="hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">{t("debtors.debtorName")}:</span>
                      <div className="font-medium">{x.mijoz}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">{t("debtors.debtorPhone")}:</span>
                      <div className="font-medium">{x.telefon || "-"}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">{t("debtors.debtAmount")}:</span>
                      <div className="font-bold text-destructive">{formatPrice(x.qarzSummasi)} {t("common.currency")}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">{t("debtors.note")}:</span>
                      <div className="font-medium">{x.izoh || "-"}</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table id="printable-table">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">{t("orders.number")}</TableHead>
                  <TableHead>{t("common.date")}</TableHead>
                  <TableHead>{t("debtors.debtorName")}</TableHead>
                  <TableHead>{t("debtors.debtorPhone")}</TableHead>
                  <TableHead className="text-right">{t("debtors.debtAmount")}</TableHead>
                  <TableHead>{t("debtors.note")}</TableHead>
                  <TableHead className="w-[100px]">{t("common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {t("common.loading")}
                    </TableCell>
                  </TableRow>
                ) : currentQarzdorlar.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {searchQuery ? t("lens.noResults") : t("debtors.empty")}
                    </TableCell>
                  </TableRow>
                ) : (
                  currentQarzdorlar.map((x, index) => (
                    <TableRow key={x.id}>
                      <TableCell className="font-medium">{startIndex + index + 1}</TableCell>
                      <TableCell>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-help">{formatDisplayDate(x.sana)}</span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{formatUzbekistanDateTime(new Date(x.createdAt))}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell>{x.mijoz}</TableCell>
                      <TableCell>{x.telefon || "-"}</TableCell>
                      <TableCell className="text-right font-bold text-destructive">
                        {formatPrice(x.qarzSummasi)} {t("common.currency")}
                      </TableCell>
                      <TableCell>{x.izoh || "-"}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <TooltipProvider>
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
