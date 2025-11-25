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

interface LinzaRoyxat {
  id: string;
  sana: string;
  tartibRaqam: number;
  mijoz: string;
  od: string;
  os: string;
  telefon: string;
  linzaTuri: string;
}

const LinzaRoyxati = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [royxatlar, setRoyxatlar] = useState<LinzaRoyxat[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [editingItem, setEditingItem] = useState<LinzaRoyxat | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [form, setForm] = useState({
    mijoz: "",
    od: "",
    os: "",
    telefon: "+998 ",
    linzaTuri: "",
  });

  useEffect(() => {
    if (user) {
      loadRoyxatlar();
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('linza-royxatlari-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'linza_royxatlari',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          loadRoyxatlar();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const loadRoyxatlar = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("linza_royxatlari")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const mapped = data?.map((item) => ({
        id: item.id,
        sana: item.sana,
        tartibRaqam: item.tartib_raqam,
        mijoz: item.mijoz,
        od: item.od,
        os: item.os,
        telefon: item.telefon,
        linzaTuri: item.linza_turi,
      })) || [];

      setRoyxatlar(mapped);
    } catch (error: any) {
      console.error("Error loading linza royxatlari:", error);
      toast.error(t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error("Iltimos, tizimga kiring");
      return;
    }

    try {
      // Get the maximum tartib_raqam for this user
      const { data: maxData, error: maxError } = await supabase
        .from("linza_royxatlari")
        .select("tartib_raqam")
        .eq("user_id", user.id)
        .order("tartib_raqam", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (maxError) throw maxError;

      const nextTartibRaqam = maxData ? maxData.tartib_raqam + 1 : 1;

      const { error } = await supabase
        .from("linza_royxatlari")
        .insert({
          user_id: user.id,
          sana: formatUzbekistanDate(selectedDate),
          tartib_raqam: nextTartibRaqam,
          mijoz: form.mijoz,
          od: form.od,
          os: form.os,
          telefon: form.telefon,
          linza_turi: form.linzaTuri,
        });

      if (error) throw error;

      await loadRoyxatlar();

      setSelectedDate(new Date());
      setForm({
        mijoz: "",
        od: "",
        os: "",
        telefon: "+998 ",
        linzaTuri: "",
      });

      toast.success(t("lens.addSuccess"));
    } catch (error: any) {
      console.error("Error adding linza royxat:", error);
      toast.error(t("common.error"));
    }
  };

  const handleDelete = async (id: string) => {
    if (!user) return;

    const itemToDelete = royxatlar.find((r) => r.id === id);
    if (!itemToDelete) return;

    try {
      const { error: trashError } = await supabase.from("chiqindilar").insert([{
        user_id: user.id,
        item_id: id,
        type: "linzaRoyxatlari",
        data: itemToDelete as any,
        deleted_at: getUzbekistanISOString(),
      }]);

      const { error } = await supabase
        .from("linza_royxatlari")
        .delete()
        .eq("id", id);

      if (error) throw error;

      await loadRoyxatlar();
      toast.success(t("lens.deleteSuccess"));
      setDeleteId(null);
    } catch (error: any) {
      console.error("Error deleting linza royxat:", error);
      toast.error(t("common.error"));
    }
  };

  const handleEdit = (item: LinzaRoyxat) => {
    setEditingItem(item);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !user) return;

    try {
      const { error } = await supabase
        .from("linza_royxatlari")
        .update({
          mijoz: editingItem.mijoz,
          od: editingItem.od,
          os: editingItem.os,
          telefon: editingItem.telefon,
          linza_turi: editingItem.linzaTuri,
        })
        .eq("id", editingItem.id);

      if (error) throw error;

      await loadRoyxatlar();
      setEditingItem(null);
      toast.success(t("edit.success"));
    } catch (error: any) {
      console.error("Error updating linza royxat:", error);
      toast.error(t("common.error"));
    }
  };

  const filteredRoyxatlar = royxatlar.filter((r) => {
    const query = searchQuery.toLowerCase();
    const searchDigits = searchQuery.replace(/\D/g, "");
    const phoneDigits = r.telefon.replace(/\D/g, "");
    
    const matchesSearch = (
      r.mijoz.toLowerCase().includes(query) ||
      r.sana.includes(query) ||
      (searchDigits && phoneDigits.includes(searchDigits))
    );

    if (!matchesSearch) return false;

    if (dateFilter === "all") return true;

    const itemDate = new Date(r.sana.split('-').reverse().join('-'));
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

  const totalPages = Math.ceil(filteredRoyxatlar.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentRoyxatlar = filteredRoyxatlar.slice(startIndex, endIndex);

  const exportToExcel = () => {
    const dateTime = formatUzbekistanDateTime();
    
    // Metadata
    const metadata = [
      { "Ma'lumot": "Eksport qilgan", "Qiymat": user?.email || "Noma'lum" },
      { "Ma'lumot": "Sana va vaqt", "Qiymat": dateTime },
    ];
    
    // Main data
    const data = filteredRoyxatlar.map((r) => ({
      "№": r.tartibRaqam,
      Sana: formatDisplayDate(r.sana),
      Mijoz: r.mijoz,
      "OD (o'ng)": r.od,
      "OS (chap)": r.os,
      Telefon: r.telefon,
      "Linza turi": r.linzaTuri,
    }));

    const metaWs = XLSX.utils.json_to_sheet(metadata);
    const dataWs = XLSX.utils.json_to_sheet(data);
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, dataWs, "Ma'lumotlar");
    XLSX.utils.book_append_sheet(wb, metaWs, "Metadata");
    
    XLSX.writeFile(wb, `Linza_Royxati_${formatUzbekistanDate()}.xlsx`);
    toast.success("Excel fayl yuklab olindi");
  };

  const exportToPDF = () => {
    const doc = setupPdfDoc();
    
    const startY = addPdfHeader(
      doc,
      "Linza Ro'yxati",
      user?.email
    );

    const tableData = filteredRoyxatlar.map((r) => [
      r.tartibRaqam,
      formatDisplayDate(r.sana),
      r.mijoz,
      `${r.od} / ${r.os}`,
      r.telefon,
      r.linzaTuri,
    ]);

    autoTable(doc, {
      startY,
      head: [['№', 'Sana', 'Mijoz', 'OD/OS', 'Telefon', 'Linza turi']],
      body: tableData,
      styles: { 
        font: 'helvetica', 
        fontSize: 9,
        cellPadding: 2,
      },
      headStyles: { 
        fillColor: [66, 66, 66],
        textColor: 255,
        fontStyle: 'bold',
      },
      alternateRowStyles: { 
        fillColor: [245, 245, 245] 
      },
    });

    doc.save(`Linza_Royxati_${formatUzbekistanDate()}.pdf`);
    toast.success("PDF fayl yuklab olindi");
  };

  const handlePrint = () => {
    const printContent = document.getElementById('printable-table');
    if (!printContent) {
      toast.error("Chop etish uchun jadval topilmadi");
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
      toast.error("Chop etishda xatolik yuz berdi");
      document.body.removeChild(iframe);
      return;
    }
    
    doc.open();
    doc.write(`
      <html>
        <head>
          <title>Linza ro'yxati</title>
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
          <h1>Linza ro'yxati</h1>
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
        <h2 className="text-2xl font-bold text-foreground mb-2">{t("lens.title")}</h2>
        <p className="text-muted-foreground">{t("lens.subtitle")}</p>
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
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="od">{t("form.rightEye")}</Label>
                <Input
                  id="od"
                  value={form.od}
                  onChange={(e) => setForm({ ...form, od: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="os">{t("form.leftEye")}</Label>
                <Input
                  id="os"
                  value={form.os}
                  onChange={(e) => setForm({ ...form, os: e.target.value })}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="linzaTuri">{t("form.lensTypeRegistry")}</Label>
              <Input
                id="linzaTuri"
                value={form.linzaTuri}
                onChange={(e) => setForm({ ...form, linzaTuri: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-border">
            <Button type="submit" className="bg-primary hover:bg-primary/90">
              {t("lens.add")}
            </Button>
          </div>
        </form>
      </Card>

      <div className="bg-card rounded-lg p-4 border border-border">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <h3 className="text-lg font-semibold">{t("lens.list")}</h3>
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Sana filtri" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Barchasi</SelectItem>
                <SelectItem value="today">Bugun</SelectItem>
                <SelectItem value="yesterday">Kecha</SelectItem>
                <SelectItem value="thisWeek">Hozirgi hafta</SelectItem>
                <SelectItem value="lastWeek">O'tgan hafta</SelectItem>
                <SelectItem value="thisMonth">Hozirgi oy</SelectItem>
                <SelectItem value="lastMonth">O'tgan oy</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder={t("lens.search")}
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
            {currentRoyxatlar.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery ? "Qidiruv bo'yicha natija topilmadi" : "Hozircha ro'yxat bo'sh"}
              </div>
            ) : (
              currentRoyxatlar.map((r) => (
              <div key={r.id} className="bg-card border border-border rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="font-semibold text-lg">№ {r.tartibRaqam}</div>
                    <div className="text-sm text-muted-foreground">{formatDisplayDate(r.sana)}</div>
                  </div>
                  <div className="flex gap-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(r)}
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
                            onClick={() => setDeleteId(r.id)}
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
                    <span className="text-muted-foreground">Mijoz:</span>
                    <span className="ml-2 font-medium">{r.mijoz}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">OD / OS:</span>
                    <span className="ml-2">{r.od} / {r.os}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Telefon:</span>
                    <span className="ml-2">{r.telefon}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Linza turi:</span>
                    <span className="ml-2">{r.linzaTuri}</span>
                  </div>
                </div>
              </div>
            ))
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            {currentRoyxatlar.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery ? "Qidiruv bo'yicha natija topilmadi" : "Hozircha ro'yxat bo'sh"}
              </div>
            ) : (
              <table id="printable-table" className="w-full">
              <thead className="bg-secondary text-secondary-foreground">
                <tr>
                  <th className="px-4 py-2 text-left">№</th>
                  <th className="px-4 py-2 text-left">Sana</th>
                  <th className="px-4 py-2 text-left">Mijoz</th>
                  <th className="px-4 py-2 text-left">OD/OS</th>
                  <th className="px-4 py-2 text-left">Telefon</th>
                  <th className="px-4 py-2 text-left">Linza turi</th>
                  <th className="px-4 py-2 text-right"></th>
                </tr>
              </thead>
              <tbody>
                {currentRoyxatlar.map((r) => (
                  <tr key={r.id} className="border-b border-border">
                    <td className="px-4 py-2">{r.tartibRaqam}</td>
                    <td className="px-4 py-2">{formatDisplayDate(r.sana)}</td>
                    <td className="px-4 py-2">{r.mijoz}</td>
                    <td className="px-4 py-2">{r.od} / {r.os}</td>
                    <td className="px-4 py-2">{r.telefon}</td>
                    <td className="px-4 py-2">{r.linzaTuri}</td>
                    <td className="px-4 py-2 text-right">
                      <TooltipProvider>
                        <div className="flex gap-2 justify-end">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(r)}
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
                                onClick={() => setDeleteId(r.id)}
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
        onConfirm={() => deleteId && handleDelete(deleteId)}
        title={t("delete.confirm")}
        description={t("delete.confirmDesc")}
        confirmText={t("common.yes")}
        cancelText={t("common.no")}
      />

      <EditDialog
        open={editingItem !== null}
        onOpenChange={(open) => !open && setEditingItem(null)}
        title={t("edit.title")}
      >
        <form onSubmit={handleUpdate} className="space-y-4">
          <div>
            <Label htmlFor="edit-mijoz">{t("form.clientName")}</Label>
            <Input
              id="edit-mijoz"
              value={editingItem?.mijoz || ""}
              onChange={(e) =>
                setEditingItem(editingItem ? { ...editingItem, mijoz: e.target.value } : null)
              }
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="edit-od">{t("form.rightEye")}</Label>
              <Input
                id="edit-od"
                value={editingItem?.od || ""}
                onChange={(e) =>
                  setEditingItem(editingItem ? { ...editingItem, od: e.target.value } : null)
                }
                required
              />
            </div>
            <div>
              <Label htmlFor="edit-os">{t("form.leftEye")}</Label>
              <Input
                id="edit-os"
                value={editingItem?.os || ""}
                onChange={(e) =>
                  setEditingItem(editingItem ? { ...editingItem, os: e.target.value } : null)
                }
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="edit-telefon">{t("form.phone")}</Label>
            <Input
              id="edit-telefon"
              type="tel"
              value={editingItem?.telefon || "+998 "}
              onChange={(e) => {
                setEditingItem(editingItem ? { ...editingItem, telefon: formatPhoneNumber(e.target.value) } : null);
              }}
              placeholder="+998 90 123 45 67"
              required
            />
          </div>

          <div>
            <Label htmlFor="edit-linzaTuri">{t("form.lensTypeRegistry")}</Label>
            <Input
              id="edit-linzaTuri"
              value={editingItem?.linzaTuri || ""}
              onChange={(e) =>
                setEditingItem(editingItem ? { ...editingItem, linzaTuri: e.target.value } : null)
              }
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => setEditingItem(null)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" className="bg-primary hover:bg-primary/90">
              {t("common.save")}
            </Button>
          </div>
        </form>
      </EditDialog>
    </div>
  );
};

export default LinzaRoyxati;
