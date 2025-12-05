import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { formatUzbekistanDate, formatUzbekistanDateTime, formatDisplayDate } from "@/lib/utils";
import { setupPdfDoc, addPdfHeader } from "@/lib/pdfHelpers";
import { Buyurtma } from "./useBuyurtmalar";

export const useBuyurtmalarExport = (buyurtmalar: Buyurtma[]) => {
  const { t, script } = useLanguage();
  const { user } = useAuth();

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

  const totalSum = buyurtmalar.reduce((sum, b) => sum + b.jamiSumma, 0);

  const exportToExcel = () => {
    const dateTime = formatUzbekistanDateTime();
    
    const metadata = [
      { [t("export.info")]: t("export.exportedBy"), [t("export.value")]: user?.email || t("export.unknown") },
      { [t("export.info")]: t("export.dateTime"), [t("export.value")]: dateTime },
      { [t("export.info")]: t("export.totalSum"), [t("export.value")]: `${totalSum.toLocaleString()} ${t("common.sum")}` },
    ];
    
    const data = buyurtmalar.map((b) => ({
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
        `${t("export.totalSum")}: ${totalSum.toLocaleString()} ${t("common.currency")}`,
        t("common.exportedBy"),
        t("common.dateAndTime")
      );

      const tableData = buyurtmalar.map((b) => [
        b.tartibRaqam,
        formatDisplayDate(b.sana),
        b.mijoz,
        b.telefon || "-",
        b.od,
        b.os,
        getLensTypeTranslation(b.oynaTuri),
        getFrameTypeTranslation(b.opravaTuri),
        `${b.jamiSumma.toLocaleString()} ${t("common.currency")}`,
      ]);

      autoTable(doc, {
        startY,
        head: [['№', t("common.date"), t("orders.client"), t("orders.phone"), 'OD', 'OS', t("form.lensType"), t("form.frameType"), t("orders.totalAmount")]],
        body: tableData,
        styles: { 
          font: script === 'cyrillic' ? 'Roboto' : 'helvetica',
          fontSize: 10,
          cellPadding: 1.5,
          lineWidth: 0.5,
          lineColor: [200, 200, 200],
        },
        headStyles: { 
          fillColor: [41, 128, 185],
          textColor: 255,
          font: script === 'cyrillic' ? 'Roboto' : 'helvetica',
          fontStyle: 'normal',
          lineWidth: 0.5,
        },
        alternateRowStyles: { 
          fillColor: [245, 245, 245] 
        },
        columnStyles: {
          8: { halign: 'center' },
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

  return {
    exportToExcel,
    exportToPDF,
    handlePrint,
    getLensTypeTranslation,
    getFrameTypeTranslation,
  };
};
