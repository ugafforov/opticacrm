import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EditDialog } from "@/components/EditDialog";
import { BuyurtmalarForm } from "@/components/buyurtmalar/BuyurtmalarForm";
import { BuyurtmalarTable } from "@/components/buyurtmalar/BuyurtmalarTable";
import { useBuyurtmalar, Buyurtma } from "@/hooks/useBuyurtmalar";
import { useBuyurtmalarExport } from "@/hooks/useBuyurtmalarExport";
import { useSearchFilter } from "@/hooks/useSearchFilter";
import { useDateFilter } from "@/hooks/useDateFilter";
import { useTablePagination } from "@/hooks/useTablePagination";
import { TableSkeleton, FormSkeleton } from "@/components/skeletons/TableSkeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PriceInput } from "@/components/PriceInput";
import { SelectWithOther } from "@/components/SelectWithOther";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn, formatPhoneNumber, formatOdOs } from "@/lib/utils";

const Buyurtmalar = () => {
  const { t } = useLanguage();
  const { buyurtmalar, loading, createBuyurtma, updateBuyurtma, deleteBuyurtma } = useBuyurtmalar();
  const [editingItem, setEditingItem] = useState<Buyurtma | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Search filter
  const { searchQuery, setSearchQuery, filteredItems: searchFiltered } = useSearchFilter(
    buyurtmalar,
    ["mijoz", "sana", "telefon"]
  );

  // Date filter
  const { dateFilter, setDateFilter, filteredItems: dateFiltered } = useDateFilter(searchFiltered);

  // Pagination - 20 items per page
  const { currentPage, setCurrentPage, totalPages, paginatedItems, startIndex } = useTablePagination(dateFiltered, 20);

  // Export functionality
  const { exportToExcel, exportToPDF, handlePrint, getLensTypeTranslation, getFrameTypeTranslation } = 
    useBuyurtmalarExport(dateFiltered);

  const handleDelete = async () => {
    if (deleteId) {
      await deleteBuyurtma(deleteId);
      setDeleteId(null);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingItem) {
      // Recalculate total
      const jamiSumma = editingItem.oynaNarxi + editingItem.opravaNarxi;
      await updateBuyurtma({ ...editingItem, jamiSumma });
      setEditingItem(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">{t("orders.title")}</h2>
          <p className="text-muted-foreground">{t("orders.subtitle")}</p>
        </div>
        <FormSkeleton />
        <TableSkeleton rows={10} columns={8} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">{t("orders.title")}</h2>
        <p className="text-muted-foreground">{t("orders.subtitle")}</p>
      </div>

      <BuyurtmalarForm onSubmit={createBuyurtma} />

      <BuyurtmalarTable
        buyurtmalar={paginatedItems}
        totalSum={dateFiltered.reduce((sum, b) => sum + b.jamiSumma, 0)}
        onEdit={setEditingItem}
        onDelete={setDeleteId}
        onExportExcel={exportToExcel}
        onExportPDF={exportToPDF}
        onPrint={handlePrint}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        dateFilter={dateFilter}
        setDateFilter={setDateFilter}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        totalPages={totalPages}
        startIndex={startIndex}
        getLensTypeTranslation={getLensTypeTranslation}
        getFrameTypeTranslation={getFrameTypeTranslation}
      />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={handleDelete}
        title={t("common.confirmDelete")}
        description={t("common.confirmDeleteDescription")}
      />

      {editingItem && (
        <EditDialog
          open={!!editingItem}
          onOpenChange={(open) => !open && setEditingItem(null)}
          title={t("common.edit")}
        >
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="border border-primary/30 bg-primary/5 rounded-md p-3 mb-4">
              <Label className="text-sm font-medium text-primary">{t("form.date")}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal h-10 mt-1.5",
                      !editingItem.sana && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {editingItem.sana && !isNaN(new Date(editingItem.sana).getTime()) 
                      ? format(new Date(editingItem.sana), "dd.MM.yyyy") 
                      : t("form.selectDate")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={editingItem.sana && !isNaN(new Date(editingItem.sana).getTime()) 
                      ? new Date(editingItem.sana) 
                      : undefined}
                    onSelect={(date) => {
                      if (date) {
                        setEditingItem({ ...editingItem, sana: format(date, "yyyy-MM-dd") });
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
                <Label htmlFor="edit-mijoz" className="text-sm">{t("form.clientName")}</Label>
                <Input
                  id="edit-mijoz"
                  value={editingItem.mijoz}
                  onChange={(e) => setEditingItem({ ...editingItem, mijoz: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-telefon" className="text-sm">{t("form.phone")}</Label>
                <Input
                  id="edit-telefon"
                  type="tel"
                  value={editingItem.telefon || ""}
                  onChange={(e) => setEditingItem({ ...editingItem, telefon: formatPhoneNumber(e.target.value) })}
                  placeholder="+998 90 123 45 67"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="edit-od" className="text-sm">{t("form.rightEye")}</Label>
                <Input
                  id="edit-od"
                  value={editingItem.od}
                  onChange={(e) => setEditingItem({ ...editingItem, od: e.target.value })}
                  onBlur={(e) => {
                    const formatted = formatOdOs(e.target.value);
                    if (formatted !== e.target.value) {
                      setEditingItem({ ...editingItem, od: formatted });
                    }
                  }}
                  className="text-center"
                  maxLength={15}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-os" className="text-sm">{t("form.leftEye")}</Label>
                <Input
                  id="edit-os"
                  value={editingItem.os}
                  onChange={(e) => setEditingItem({ ...editingItem, os: e.target.value })}
                  onBlur={(e) => {
                    const formatted = formatOdOs(e.target.value);
                    if (formatted !== e.target.value) {
                      setEditingItem({ ...editingItem, os: formatted });
                    }
                  }}
                  className="text-center"
                  maxLength={15}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="edit-oynaTuri" className="text-sm">{t("form.lensType")}</Label>
                <SelectWithOther
                  id="edit-oynaTuri"
                  value={editingItem.oynaTuri}
                  onChange={(value) => setEditingItem({ ...editingItem, oynaTuri: value })}
                  options={[
                    { value: "3B1 jigarrang", label: t("lens.3b1Brown") },
                    { value: "3B1 qora", label: t("lens.3b1Black") },
                    { value: "4B1", label: t("lens.4b1") },
                    { value: "420", label: t("lens.420") },
                    { value: "SR", label: t("lens.sr") },
                  ]}
                  placeholder={t("form.select")}
                  otherLabel={t("form.other")}
                  customInputLabel={t("form.enterCustomValue")}
                />
              </div>
              <div>
                <Label htmlFor="edit-oynaNarxi" className="text-sm">{t("form.lensPrice")}</Label>
                <PriceInput
                  id="edit-oynaNarxi"
                  value={editingItem.oynaNarxi.toString()}
                  onChange={(value) => setEditingItem({ ...editingItem, oynaNarxi: parseFloat(value) || 0 })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="edit-opravaTuri" className="text-sm">{t("form.frameType")}</Label>
                <SelectWithOther
                  id="edit-opravaTuri"
                  value={editingItem.opravaTuri}
                  onChange={(value) => setEditingItem({ ...editingItem, opravaTuri: value })}
                  options={[
                    { value: "dumaloq", label: t("frame.round") },
                    { value: "fabritsio", label: t("frame.fabritsio") },
                    { value: "alaniye", label: t("frame.alaniye") },
                    { value: "titanik", label: t("frame.titanik") },
                  ]}
                  placeholder={t("form.select")}
                  otherLabel={t("form.other")}
                  customInputLabel={t("form.enterCustomValue")}
                />
              </div>
              <div>
                <Label htmlFor="edit-opravaNarxi" className="text-sm">{t("form.framePrice")}</Label>
                <PriceInput
                  id="edit-opravaNarxi"
                  value={editingItem.opravaNarxi.toString()}
                  onChange={(value) => setEditingItem({ ...editingItem, opravaNarxi: parseFloat(value) || 0 })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button type="button" variant="outline" onClick={() => setEditingItem(null)}>
                {t("common.cancel")}
              </Button>
              <Button type="submit">
                {t("common.save")}
              </Button>
            </div>
          </form>
        </EditDialog>
      )}
    </div>
  );
};

export default Buyurtmalar;
