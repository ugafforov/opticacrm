import { useState, useCallback, useEffect } from "react";
import { Cloud, CloudUpload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2, ArrowLeft } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ConfirmDialog";

// Table schemas for mapping
const TABLE_SCHEMAS = {
  buyurtmalar: {
    name: "Буюртмалар",
    columns: ["id", "user_id", "sana", "tartib_raqam", "mijoz", "telefon", "od", "os", "oyna_tури", "oyna_narxi", "oprava_turi", "oprava_narxi", "jami_summa", "created_at", "updated_at"],
    requiredFields: ["sana", "mijoz", "od", "os", "oyna_tури", "oprava_turi"],
    fieldMapping: {
      "oyna_turi": "oyna_tури" // Map Latin to Cyrillic column name
    }
  },
  tekshiruvlar: {
    name: "Текширувлар",
    columns: ["id", "user_id", "tartib_raqam", "mijoz", "sana", "refraksiyametriya", "tanometriya", "jami_summa", "created_at", "updated_at"],
    requiredFields: ["sana", "mijoz", "tartib_raqam"],
    fieldMapping: {}
  },
  tayyor_kozoynaklar: {
    name: "Тайёр кўзойнаклар",
    columns: ["id", "user_id", "tartib_raqam", "sana", "kliyent", "kozoynak_turi", "summa", "created_at", "updated_at"],
    requiredFields: ["sana", "kliyent", "kozoynak_turi", "tartib_raqam"],
    fieldMapping: {
      "linza_turi": "kozoynak_turi" // Map linza_turi from old data to kozoynak_turi
    }
  },
  linza_sotuvlari: {
    name: "Линза сотувлари",
    columns: ["id", "user_id", "tartib_raqam", "sana", "kliyent", "linza_turi", "summa", "created_at", "updated_at"],
    requiredFields: ["sana", "kliyent", "linza_turi"],
    fieldMapping: {}
  },
  linza_royxatlari: {
    name: "Линза рўйхатлари",
    columns: ["id", "user_id", "tartib_raqam", "sana", "mijoz", "telefon", "od", "os", "linza_turi", "tugilan_yili", "oxirgi_aloqa", "created_at", "updated_at"],
    requiredFields: ["sana", "mijoz", "telefon", "od", "os", "linza_turi"],
    fieldMapping: {}
  },
  xarajatlar: {
    name: "Харажатлар",
    columns: ["id", "user_id", "tartib_raqam", "sana", "kategoriya", "tavsif", "summa", "created_at", "updated_at"],
    requiredFields: ["sana", "kategoriya", "summa"],
    fieldMapping: {}
  },
  qarzdorlar: {
    name: "Қарздорлар",
    columns: ["id", "user_id", "tartib_raqam", "sana", "mijoz", "telefon", "qarz_summasi", "qoldiq_summa", "holat", "izoh", "oxirgi_aloqa", "created_at", "updated_at"],
    requiredFields: ["sana", "mijoz", "qarz_summasi"],
    fieldMapping: {}
  },
  bemor_tarixi: {
    name: "Бемор тарихи",
    columns: ["id", "user_id", "bemor_id", "sana", "mijoz", "telefon", "od", "os", "linza_turi", "tugilan_yili", "created_at"],
    requiredFields: ["sana", "od", "os", "linza_turi", "bemor_id"],
    fieldMapping: {}
  }
};

type TableName = keyof typeof TABLE_SCHEMAS;

interface ParsedData {
  headers: string[];
  rows: Record<string, any>[];
  errors: string[];
}

interface ImportResult {
  success: number;
  failed: number;
  errors: string[];
}

const AdminImport = () => {
  const { t } = useLanguage();
  const { isAdmin, user } = useAuth();
  const navigate = useNavigate();
  
  const [file, setFile] = useState<File | null>(null);
  const [selectedTable, setSelectedTable] = useState<TableName | "">("");
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [progress, setProgress] = useState(0);

  // Parse CSV with semicolon delimiter (Lovable Cloud export format)
  const parseCSV = useCallback((content: string): ParsedData => {
    const errors: string[] = [];
    let rows: Record<string, any>[] = [];
    let headers: string[] = [];

    try {
      const lines = content.trim().split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        errors.push("Файлда етарли маълумот йўқ (камида сарлавҳа ва бир қатор керак)");
        return { headers: [], rows: [], errors };
      }

      // First line is headers - split by semicolon
      headers = lines[0].split(';').map(h => h.trim());
      
      // Parse data rows
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(';');
        
        if (values.length !== headers.length) {
          // Skip malformed rows but continue
          continue;
        }
        
        const row: Record<string, any> = {};
        headers.forEach((header, idx) => {
          let value: any = values[idx]?.trim() || null;
          
          // Convert numeric strings to numbers for numeric fields
          if (value && !isNaN(Number(value)) && ['summa', 'qarz_summasi', 'qoldiq_summa', 'oyna_narxi', 'oprava_narxi', 'jami_summa', 'tartib_raqam', 'tugilan_yili'].includes(header)) {
            value = Number(value);
          }
          
          // Convert boolean strings
          if (value === 'true') value = true;
          if (value === 'false') value = false;
          
          row[header] = value;
        });
        
        rows.push(row);
      }

      if (rows.length === 0) {
        errors.push("Файлда маълумот топилмади");
        return { headers: [], rows: [], errors };
      }

    } catch (e) {
      errors.push(`CSV таҳлил қилишда хатолик: ${e instanceof Error ? e.message : 'Номаълум хатолик'}`);
    }

    return { headers, rows, errors };
  }, []);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setImportResult(null);
    setParsedData(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const parsed = parseCSV(content);
      setParsedData(parsed);
      
      if (parsed.errors.length > 0) {
        toast.error(parsed.errors[0]);
      } else {
        toast.success(`${parsed.rows.length} та ёзув топилди`);
      }
    };
    reader.onerror = () => {
      toast.error("Файлни ўқишда хатолик");
    };
    reader.readAsText(selectedFile, 'UTF-8');
  }, [parseCSV]);

  const handleImport = async () => {
    if (!parsedData || !selectedTable || !user) return;

    const schema = TABLE_SCHEMAS[selectedTable];
    if (!schema) return;

    setImporting(true);
    setProgress(0);
    setImportResult(null);

    const results: ImportResult = { success: 0, failed: 0, errors: [] };
    const batchSize = 50;
    const totalRows = parsedData.rows.length;

    try {
      for (let i = 0; i < totalRows; i += batchSize) {
        const batch = parsedData.rows.slice(i, i + batchSize);
        
        const preparedRows = batch.map((row, idx) => {
          const newRow: Record<string, any> = {};
          
          for (const [key, value] of Object.entries(row)) {
            // Apply field mapping (e.g., oyna_turi -> oyna_tури)
            const mappedKey = schema.fieldMapping[key] || key;
            
            // Skip user_id from source - we'll use current user
            if (key === 'user_id') continue;
            
            // Skip id if we want to generate new ones (optional)
            // For now, we'll keep the original IDs if they exist
            
            newRow[mappedKey] = value;
          }
          
          // Always set current user as the owner
          newRow.user_id = user.id;
          
          return newRow;
        });

        // Use type assertion for dynamic table insert
        const { error } = await supabase
          .from(selectedTable as any)
          .upsert(preparedRows as any[], { onConflict: 'id' });

        if (error) {
          results.failed += batch.length;
          results.errors.push(`Партия ${Math.floor(i / batchSize) + 1}: ${error.message}`);
        } else {
          results.success += batch.length;
        }

        setProgress(Math.round(((i + batch.length) / totalRows) * 100));
      }

      setImportResult(results);
      
      if (results.failed === 0) {
        toast.success(`${results.success} та ёзув муваффақиятли импорт қилинди!`);
      } else {
        toast.warning(`${results.success} муваффақият, ${results.failed} хатолик`);
      }
    } catch (error: any) {
      toast.error(`Импорт хатолиги: ${error.message}`);
      results.errors.push(error.message);
      setImportResult(results);
    } finally {
      setImporting(false);
    }
  };

  // ---------- Google Sheets Backup ----------
  const [backingUp, setBackingUp] = useState(false);
  const [lastBackup, setLastBackup] = useState<{ at: string; status: string } | null>(null);
  const [confirmBackupOpen, setConfirmBackupOpen] = useState(false);

  const loadLastBackup = useCallback(async () => {
    const { data } = await supabase
      .from("backup_logs" as any)
      .select("created_at,status")
      .order("created_at", { ascending: false })
      .limit(1);
    if (data && data.length) {
      const row: any = data[0];
      setLastBackup({ at: row.created_at, status: row.status });
    }
  }, []);

  useEffect(() => { loadLastBackup(); }, [loadLastBackup]);

  const handleBackup = async () => {
    setBackingUp(true);
    try {
      const { data, error } = await supabase.functions.invoke("backup-to-sheets", { body: {} });
      if (error) throw error;
      if (data?.ok === false) throw new Error(data?.error || "Backup xatoligi");
      toast.success(`Google Sheets ga muvaffaqiyatli saqlandi (${data?.totalRows ?? 0} qator)`);
      await loadLastBackup();
    } catch (e: any) {
      toast.error(`Backup xatoligi: ${e.message || e}`);
    } finally {
      setBackingUp(false);
    }
  };

  const getFieldMatch = (header: string): boolean => {
    if (!selectedTable) return false;
    const schema = TABLE_SCHEMAS[selectedTable];
    const mappedHeader = schema.fieldMapping[header] || header;
    return schema.columns.includes(mappedHeader) || schema.columns.includes(header);
  };

  const isRequiredField = (header: string): boolean => {
    if (!selectedTable) return false;
    const schema = TABLE_SCHEMAS[selectedTable];
    return schema.requiredFields.includes(header);
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Рухсат берилмаган</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            {t("import.title")}
          </h2>
          <p className="text-muted-foreground">
            {t("import.subtitle")}
          </p>
        </div>
      </div>

      {/* Google Sheets Backup */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5 text-primary" />
            Google Sheets ga saqlash
          </CardTitle>
          <CardDescription>
            Barcha jadvallardagi ma'lumotlarni Google Sheets ga zaxira nusxa qilib saqlash. Har kuni soat 00:00 (Toshkent) da avtomatik bajariladi.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row sm:items-center gap-3">
          <Button onClick={() => setConfirmBackupOpen(true)} disabled={backingUp} size="lg">
            {backingUp ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saqlanmoqda...</>
            ) : (
              <><CloudUpload className="h-4 w-4 mr-2" /> Google Sheets ga saqlash</>
            )}
          </Button>
          <span className="text-sm text-muted-foreground">
            {lastBackup
              ? `Oxirgi backup: ${new Date(lastBackup.at).toLocaleString("uz-UZ", { timeZone: "Asia/Tashkent" })} (${lastBackup.status})`
              : "Hali backup qilinmagan"}
          </span>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmBackupOpen}
        onOpenChange={setConfirmBackupOpen}
        onConfirm={() => { setConfirmBackupOpen(false); handleBackup(); }}
        title="Google Sheets ga saqlash"
        description="Barcha jadvallardagi ma'lumotlar Google Sheets ga zaxira nusxa qilinadi. Davom etamizmi?"
        confirmText="Ha, saqlash"
        cancelText="Bekor qilish"
      />


      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm">1</span>
            {t("import.selectTable")}
          </CardTitle>
          <CardDescription>{t("import.selectTableDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedTable} onValueChange={(val) => setSelectedTable(val as TableName)}>
            <SelectTrigger className="w-full md:w-72">
              <SelectValue placeholder={t("import.selectTablePlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(TABLE_SCHEMAS).map(([key, schema]) => (
                <SelectItem key={key} value={key}>
                  {schema.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Step 2: Upload File */}
      <Card className={!selectedTable ? "opacity-50 pointer-events-none" : ""}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm">2</span>
            {t("import.uploadFile")}
          </CardTitle>
          <CardDescription>{t("import.uploadFileDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Label
            htmlFor="file-upload"
            className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
          >
            {file ? (
              <div className="flex items-center gap-2">
                <FileText className="h-8 w-8 text-primary" />
                <span className="font-medium">{file.name}</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="h-8 w-8 text-muted-foreground" />
                <span className="text-muted-foreground">{t("import.dropOrClick")}</span>
              </div>
            )}
            <input
              id="file-upload"
              type="file"
              accept=".csv,.json,.txt"
              onChange={handleFileChange}
              className="hidden"
            />
          </Label>
        </CardContent>
      </Card>

      {/* Step 3: Preview & Column Mapping */}
      {parsedData && parsedData.rows.length > 0 && selectedTable && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm">3</span>
              {t("import.preview")}
            </CardTitle>
            <CardDescription>
              {parsedData.rows.length} {t("import.recordsFound")} • {parsedData.headers.length} {t("import.columnsFound")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Column Mapping Status */}
            <div className="space-y-2">
              <Label>{t("import.columnMapping")}</Label>
              <div className="flex flex-wrap gap-2">
                {parsedData.headers.map((header) => {
                  const matched = getFieldMatch(header);
                  const required = isRequiredField(header);
                  return (
                    <Badge
                      key={header}
                      variant={matched ? "default" : "secondary"}
                      className={matched ? "bg-primary/20 text-primary border-primary/30" : "bg-accent text-accent-foreground border-border"}
                    >
                      {matched ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <AlertCircle className="h-3 w-3 mr-1" />}
                      {header}
                      {required && <span className="ml-1 text-destructive">*</span>}
                    </Badge>
                  );
                })}
              </div>
            </div>

            {/* Data Preview */}
            <div className="space-y-2">
              <Label>{t("import.dataPreview")}</Label>
              <ScrollArea className="h-64 border rounded-lg">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">#</th>
                        {parsedData.headers.slice(0, 6).map((header) => (
                          <th key={header} className="px-3 py-2 text-left font-medium whitespace-nowrap">
                            {header}
                          </th>
                        ))}
                        {parsedData.headers.length > 6 && (
                          <th className="px-3 py-2 text-left font-medium">...</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {parsedData.rows.slice(0, 5).map((row, idx) => (
                        <tr key={idx} className="border-t border-border">
                          <td className="px-3 py-2 text-muted-foreground">{idx + 1}</td>
                          {parsedData.headers.slice(0, 6).map((header) => (
                            <td key={header} className="px-3 py-2 max-w-[200px] truncate">
                              {String(row[header] ?? '-')}
                            </td>
                          ))}
                          {parsedData.headers.length > 6 && (
                            <td className="px-3 py-2 text-muted-foreground">...</td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </ScrollArea>
              {parsedData.rows.length > 5 && (
                <p className="text-sm text-muted-foreground">
                  +{parsedData.rows.length - 5} {t("import.moreRecords")}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Import Button & Progress */}
      {parsedData && parsedData.rows.length > 0 && selectedTable && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm">4</span>
              {t("import.startImport")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {importing && (
              <div className="space-y-2">
                <Progress value={progress} className="h-2" />
                <p className="text-sm text-muted-foreground text-center">{progress}%</p>
              </div>
            )}

            {importResult && (
              <div className="p-4 rounded-lg bg-muted space-y-2">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-primary">
                    <CheckCircle2 className="h-5 w-5" />
                    <span>{importResult.success} {t("import.success")}</span>
                  </div>
                  {importResult.failed > 0 && (
                    <div className="flex items-center gap-2 text-destructive">
                      <AlertCircle className="h-5 w-5" />
                      <span>{importResult.failed} {t("import.failed")}</span>
                    </div>
                  )}
                </div>
                {importResult.errors.length > 0 && (
                  <div className="text-sm text-destructive">
                    {importResult.errors.slice(0, 3).map((err, idx) => (
                      <p key={idx}>• {err}</p>
                    ))}
                  </div>
                )}
              </div>
            )}

            <Button
              onClick={handleImport}
              disabled={importing || !parsedData || parsedData.rows.length === 0}
              className="w-full"
              size="lg"
            >
              {importing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("import.importing")}
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  {t("import.importNow")} ({parsedData.rows.length} {t("import.records")})
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminImport;
