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

interface Tekshiruv {
  id: string;
  sana: string;
  tartibRaqam: number;
  mijoz: string;
  refraksiyametriya: boolean;
  tanometriya: boolean;
  jamiSumma: number;
}

const Tekshiruv = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [tekshiruvlar, setTekshiruvlar] = useState<Tekshiruv[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [dateFilter, setDateFilter] = useState<string>("all");
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
        tartibRaqam: item.tartib_raqam,
        mijoz: item.mijoz,
        refraksiyametriya: item.refraksiyametriya,
        tanometriya: item.tanometriya,
        jamiSumma: item.jami_summa,
      })) || [];

      setTekshiruvlar(mapped);
    } catch (error: any) {
      toast.error("Ma'lumotlarni yuklashda xatolik yuz berdi");
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
      toast.error("Ma'lumotni saqlashda xatolik yuz berdi");
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
      toast.error("Ma'lumotni o'chirishda xatolik yuz berdi");
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
      toast.error("Ma'lumotni yangilashda xatolik yuz berdi");
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

  const totalSum = tekshiruvlar.reduce((sum, t) => sum + t.jamiSumma, 0);

  const exportToExcel = () => {
    const dateTime = formatUzbekistanDateTime();
    
    // Metadata
    const metadata = [
      { "Ma'lumot": "Eksport qilgan", "Qiymat": user?.email || "Noma'lum" },
      { "Ma'lumot": "Sana va vaqt", "Qiymat": dateTime },
      { "Ma'lumot": "Jami summa", "Qiymat": `${totalSum.toLocaleString()} so'm` },
    ];
    
    // Main data
    const data = filteredTekshiruvlar.map((t) => ({
      "№": t.tartibRaqam,
      Sana: formatDisplayDate(t.sana),
      Mijoz: t.mijoz,
      Refraksiyametriya: t.refraksiyametriya ? "Ha" : "Yo'q",
      Tanometriya: t.tanometriya ? "Ha" : "Yo'q",
      Summa: t.jamiSumma,
    }));

    const metaWs = XLSX.utils.json_to_sheet(metadata);
    const dataWs = XLSX.utils.json_to_sheet(data);
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, dataWs, "Ma'lumotlar");
    XLSX.utils.book_append_sheet(wb, metaWs, "Metadata");
    
    XLSX.writeFile(wb, `Tekshiruvlar_${formatUzbekistanDate()}.xlsx`);
    toast.success("Excel fayl yuklab olindi");
  };

  const exportToPDF = () => {
    const doc = setupPdfDoc();
    
    const startY = addPdfHeader(
      doc,
      "Tekshiruvlar ro'yxati",
      user?.email,
      `Jami summa: ${totalSum.toLocaleString()} so'm`
    );

    const tableData = filteredTekshiruvlar.map((t) => [
      t.tartibRaqam,
      formatDisplayDate(t.sana),
      t.mijoz,
      (t.refraksiyametriya ? "Refr." : "") + (t.refraksiyametriya && t.tanometriya ? ", " : "") + (t.tanometriya ? "Tano." : ""),
      t.jamiSumma.toLocaleString(),
    ]);

    autoTable(doc, {
      startY,
      head: [['№', 'Sana', 'Mijoz', 'Tekshiruvlar', 'Summa']],
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
      columnStyles: {
        4: { halign: 'right' },
      },
    });

    doc.save(`Tekshiruvlar_${formatUzbekistanDate()}.pdf`);
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
          <title>Tekshiruvlar ro'yxati</title>
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
          <h1>Tekshiruvlar ro'yxati</h1>
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
            <div>
              <Label htmlFor="mijoz">{t("exam.patient")}</Label>
              <Input
                id="mijoz"
                value={form.mijoz}
                onChange={(e) => setForm({ ...form, mijoz: e.target.value })}
                required
              />
            </div>

            <div className="space-y-3 border border-border rounded-lg p-4">
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
                  {t("exam.refractometry")} — 50,000 {t("common.sum")}
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
                  {t("exam.tonometry")} — 15,000 {t("common.sum")}
                </label>
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
            <h3 className="text-lg font-semibold">Tekshiruvlar ro'yxati</h3>
            <div className="text-lg font-bold text-primary">
              Jami: {totalSum.toLocaleString()} so'm
            </div>
          </div>
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
                placeholder="Qidirish..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
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
        <div className="overflow-x-auto">
          <table id="printable-table" className="w-full">
            <thead className="bg-secondary text-secondary-foreground">
              <tr>
                <th className="px-4 py-2 text-left">№</th>
                <th className="px-4 py-2 text-left">Sana</th>
                <th className="px-4 py-2 text-left">Mijoz</th>
                <th className="px-4 py-2 text-left">Tekshiruvlar</th>
                <th className="px-4 py-2 text-right">Summa</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {filteredTekshiruvlar.map((t) => (
                <tr key={t.id} className="border-b border-border">
                  <td className="px-4 py-2">{t.tartibRaqam}</td>
                  <td className="px-4 py-2">{formatDisplayDate(t.sana)}</td>
                  <td className="px-4 py-2">{t.mijoz}</td>
                  <td className="px-4 py-2">
                    {t.refraksiyametriya && "Refraksiyametriya"}
                    {t.refraksiyametriya && t.tanometriya && ", "}
                    {t.tanometriya && "Tanometriya"}
                  </td>
                  <td className="px-4 py-2 text-right font-semibold">
                    {t.jamiSumma.toLocaleString()}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(t)}
                        className="hover:bg-secondary"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteId(t.id)}
                        className="text-destructive hover:text-destructive/90"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
        <form onSubmit={handleUpdate} className="space-y-4">
          <div>
            <Label htmlFor="edit-mijoz">{t("exam.patient")}</Label>
            <Input
              id="edit-mijoz"
              value={editingItem?.mijoz || ""}
              onChange={(e) =>
                setEditingItem(
                  editingItem ? { ...editingItem, mijoz: e.target.value } : null
                )
              }
              required
            />
          </div>

          <div className="space-y-3 border border-border rounded-lg p-4">
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
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
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
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {t("exam.tonometry")}
              </label>
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditingItem(null)}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit">{t("common.save")}</Button>
          </div>
        </form>
      </EditDialog>
    </div>
  );
};

export default Tekshiruv;
