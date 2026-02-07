import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Search, Trash2, Pencil, Download, Printer } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatPrice, formatDisplayDate, formatUzbekistanDateTime } from "@/lib/utils";
import { Buyurtma } from "@/hooks/useBuyurtmalar";
import { DateFilterSelect } from "@/components/DateFilterSelect";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface BuyurtmalarTableProps {
  buyurtmalar: Buyurtma[];
  totalSum: number;
  onEdit: (item: Buyurtma) => void;
  onDelete: (id: string) => void;
  onExportExcel: () => void;
  onExportPDF: () => void;
  onPrint: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  dateFilter: string;
  setDateFilter: (filter: string) => void;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  totalPages: number;
  startIndex: number;
  getLensTypeTranslation: (type: string) => string;
  getFrameTypeTranslation: (type: string) => string;
}

export const BuyurtmalarTable = ({
  buyurtmalar,
  totalSum,
  onEdit,
  onDelete,
  onExportExcel,
  onExportPDF,
  onPrint,
  searchQuery,
  setSearchQuery,
  dateFilter,
  setDateFilter,
  currentPage,
  setCurrentPage,
  totalPages,
  startIndex = 0,
  getLensTypeTranslation,
  getFrameTypeTranslation,
}: BuyurtmalarTableProps) => {
  const { t } = useLanguage();
  const isMobile = useIsMobile();

  return (
    <div className="bg-card rounded-lg p-3 sm:p-4 border border-border">
      {/* Header with title and total */}
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base sm:text-lg font-semibold">{t("orders.list")}</h3>
          <div className="text-sm sm:text-lg font-bold text-primary">
            {t("orders.total")}: {formatPrice(totalSum)} {t("common.currency")}
          </div>
        </div>
        
        {/* Filters and actions row */}
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <DateFilterSelect value={dateFilter} onValueChange={setDateFilter} />
          
          <div className="relative flex-1 sm:max-w-64">
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
            <Button variant="outline" size="sm" onClick={onExportExcel} className="gap-1.5">
              <Download className="w-4 h-4" />
              <span className="hidden xs:inline">Excel</span>
            </Button>
            <Button variant="outline" size="sm" onClick={onExportPDF} className="gap-1.5">
              <Download className="w-4 h-4" />
              <span className="hidden xs:inline">PDF</span>
            </Button>
            <Button variant="outline" size="sm" onClick={onPrint} className="gap-1.5">
              <Printer className="w-4 h-4" />
              <span className="hidden xs:inline">Print</span>
            </Button>
          </div>
        </div>
      </div>

      {isMobile ? (
        <div className="space-y-4">
          {buyurtmalar.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? "Qidiruv bo'yicha natija topilmadi" : "Hozircha buyurtmalar yo'q"}
            </div>
          ) : (
            buyurtmalar.map((b, index) => (
              <div key={b.id} className="bg-card border border-border rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="font-semibold text-lg">№ {startIndex + index + 1}</div>
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
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(b)}
                      className="h-8 w-8 p-0 text-primary hover:bg-primary/10"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(b.id)}
                      className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
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
                <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-muted-foreground">OD:</span>
                      <span className="ml-2">{b.od}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">OS:</span>
                      <span className="ml-2">{b.os}</span>
                    </div>
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
                  <span className="text-lg font-bold">{formatPrice(b.jamiSumma)} {t("common.currency")}</span>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          {buyurtmalar.length === 0 ? (
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
                  <th className="px-2 sm:px-4 py-2 text-center text-sm">OD</th>
                  <th className="px-2 sm:px-4 py-2 text-center text-sm">OS</th>
                  <th className="px-2 sm:px-4 py-2 text-left text-sm">{t("form.lensType")}</th>
                  <th className="px-2 sm:px-4 py-2 text-left text-sm">{t("form.frameType")}</th>
                  <th className="px-2 sm:px-4 py-2 text-center text-sm">{t("orders.totalAmount")}</th>
                  <th className="px-2 sm:px-4 py-2 text-right"></th>
                </tr>
              </thead>
              <tbody>
                {buyurtmalar.map((b, index) => (
                  <tr key={b.id} className="border-b border-border hover:bg-muted/50">
                    <td className="px-2 sm:px-4 py-2 text-sm">{startIndex + index + 1}</td>
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
                    <td className="px-2 sm:px-4 py-2 text-sm text-center whitespace-nowrap">{b.od}</td>
                    <td className="px-2 sm:px-4 py-2 text-sm text-center whitespace-nowrap">{b.os}</td>
                    <td className="px-2 sm:px-4 py-2 text-sm">{getLensTypeTranslation(b.oynaTuri)}</td>
                    <td className="px-2 sm:px-4 py-2 text-sm">{getFrameTypeTranslation(b.opravaTuri)}</td>
                    <td className="px-2 sm:px-4 py-2 text-center font-semibold text-sm whitespace-nowrap">
                      {formatPrice(b.jamiSumma)} {t("common.currency")}
                    </td>
                    <td className="px-2 sm:px-4 py-2 text-right">
                      <TooltipProvider>
                        <div className="flex gap-1 justify-end">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onEdit(b)}
                                className="h-8 w-8 p-0 text-primary hover:bg-primary/10"
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Tahrirlash</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onDelete(b.id)}
                                className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>O'chirish</TooltipContent>
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
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
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
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
};
