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
      await updateBuyurtma(editingItem);
      setEditingItem(null);
    }
  };

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
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">{t("form.clientName")}</label>
              <input
                type="text"
                value={editingItem.mijoz}
                onChange={(e) => setEditingItem({ ...editingItem, mijoz: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            <div>
              <label className="text-sm font-medium">{t("form.phone")}</label>
              <input
                type="tel"
                value={editingItem.telefon || ""}
                onChange={(e) => setEditingItem({ ...editingItem, telefon: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="w-20">
                <label className="text-sm font-medium">{t("form.rightEye")}</label>
                <input
                  type="text"
                  value={editingItem.od}
                  onChange={(e) => setEditingItem({ ...editingItem, od: e.target.value })}
                  onBlur={(e) => {
                    if (e.target.value && /^\d+$/.test(e.target.value)) {
                      setEditingItem({ ...editingItem, od: e.target.value + '.0' });
                    }
                  }}
                  className="w-full px-3 py-2 border rounded-md text-center"
                  maxLength={4}
                />
              </div>
              <div className="w-20">
                <label className="text-sm font-medium">{t("form.leftEye")}</label>
                <input
                  type="text"
                  value={editingItem.os}
                  onChange={(e) => setEditingItem({ ...editingItem, os: e.target.value })}
                  onBlur={(e) => {
                    if (e.target.value && /^\d+$/.test(e.target.value)) {
                      setEditingItem({ ...editingItem, os: e.target.value + '.0' });
                    }
                  }}
                  className="w-full px-3 py-2 border rounded-md text-center"
                  maxLength={4}
                />
              </div>
            </div>
            <button
              onClick={handleUpdate}
              className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              {t("common.save")}
            </button>
          </div>
        </EditDialog>
      )}
    </div>
  );
};

export default Buyurtmalar;
