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
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PriceInput } from "@/components/PriceInput";
import { SelectWithOther } from "@/components/SelectWithOther";

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

  // Pagination
  const { currentPage, setCurrentPage, totalPages, paginatedItems } = useTablePagination(dateFiltered, 10);

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
      const updatedItem = {
        ...editingItem,
        jamiSumma: editTotalAmount
      };
      await updateBuyurtma(updatedItem);
      setEditingItem(null);
    }
  };

  const handleOdOsBlur = (field: 'od' | 'os', value: string) => {
    if (!value || !editingItem) return;
    const trimmed = value.trim();
    if (/^\d+$/.test(trimmed)) {
      setEditingItem({ ...editingItem, [field]: `${trimmed}.0` });
    }
  };

  const editTotalAmount = editingItem 
    ? (parseFloat(String(editingItem.oynaNarxi)) || 0) + (parseFloat(String(editingItem.opravaNarxi)) || 0)
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-mijoz">{t("form.clientName")}</Label>
                <Input
                  id="edit-mijoz"
                  value={editingItem.mijoz}
                  onChange={(e) => setEditingItem({ ...editingItem, mijoz: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="edit-telefon">{t("form.phone")}</Label>
                <Input
                  id="edit-telefon"
                  type="tel"
                  value={editingItem.telefon || ""}
                  onChange={(e) => setEditingItem({ ...editingItem, telefon: e.target.value })}
                  placeholder="+998 90 123 45 67"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-od">{t("form.rightEye")}</Label>
                <Input
                  id="edit-od"
                  value={editingItem.od}
                  onChange={(e) => setEditingItem({ ...editingItem, od: e.target.value })}
                  onBlur={(e) => handleOdOsBlur('od', e.target.value)}
                  placeholder="1.0"
                  className="text-center"
                />
              </div>

              <div>
                <Label htmlFor="edit-os">{t("form.leftEye")}</Label>
                <Input
                  id="edit-os"
                  value={editingItem.os}
                  onChange={(e) => setEditingItem({ ...editingItem, os: e.target.value })}
                  onBlur={(e) => handleOdOsBlur('os', e.target.value)}
                  placeholder="1.0"
                  className="text-center"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-oynaTuri">{t("form.lensType")}</Label>
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
                <Label htmlFor="edit-oynaNarxi">{t("form.lensPrice")}</Label>
                <PriceInput
                  id="edit-oynaNarxi"
                  value={String(editingItem.oynaNarxi)}
                  onChange={(value) => setEditingItem({ ...editingItem, oynaNarxi: parseFloat(value) || 0 })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-opravaTuri">{t("form.frameType")}</Label>
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
                <Label htmlFor="edit-opravaNarxi">{t("form.framePrice")}</Label>
                <PriceInput
                  id="edit-opravaNarxi"
                  value={String(editingItem.opravaNarxi)}
                  onChange={(value) => setEditingItem({ ...editingItem, opravaNarxi: parseFloat(value) || 0 })}
                  required
                />
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-border">
              <div className="text-lg font-semibold">
                {t("orders.totalAmount")}: {editTotalAmount.toLocaleString()} {t("common.currency")}
              </div>
              <Button type="submit" className="bg-primary hover:bg-primary/90">
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
