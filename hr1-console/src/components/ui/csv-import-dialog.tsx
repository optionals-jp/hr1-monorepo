"use client";

import { useState, useCallback, useRef } from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { Button } from "@hr1/shared-ui/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hr1/shared-ui/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@hr1/shared-ui/components/ui/table";
import { cn } from "@/lib/utils";
import { useToast } from "@hr1/shared-ui/components/ui/toast";
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle } from "lucide-react";
import {
  parseFile,
  autoDetectMapping,
  type ColumnMapping,
  type ParsedFile,
  type ValidatedRow,
} from "@/lib/import-utils";

type Step = "upload" | "mapping" | "preview" | "importing" | "done";

export interface CsvImportField extends ColumnMapping {
  /** プレビュー列に表示するか (デフォルト true) */
  preview?: boolean;
}

interface CsvImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  fields: CsvImportField[];
  headerPatterns: Record<string, RegExp[]>;
  /** プレビューで表示する列キー（省略時は preview !== false のフィールド） */
  previewColumns?: string[];
  /** 各行のバリデーション。errors配列を返す */
  validateRow: (
    values: Record<string, string>,
    rowIndex: number,
    allValues: Record<string, string>[]
  ) => string[];
  /** 1行をインポートする関数。エラー時は throw する */
  importRow: (values: Record<string, string>) => Promise<void>;
  onComplete: () => void;
  /** 追加のプレビュー下部コンテンツ（招待メール送信トグル等） */
  previewFooter?: React.ReactNode;
}

export function CsvImportDialog({
  open,
  onOpenChange,
  title,
  fields,
  headerPatterns,
  previewColumns,
  validateRow,
  importRow,
  onComplete,
  previewFooter,
}: CsvImportDialogProps) {
  const { showToast } = useToast();
  const [step, setStep] = useState<Step>("upload");
  const [parsedFile, setParsedFile] = useState<ParsedFile | null>(null);
  const [mapping, setMapping] = useState<Record<string, number | null>>({});
  const [validatedRows, setValidatedRows] = useState<ValidatedRow[]>([]);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [results, setResults] = useState<{ success: number; errors: string[] }>({
    success: 0,
    errors: [],
  });
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setStep("upload");
    setParsedFile(null);
    setMapping({});
    setValidatedRows([]);
    setProgress({ current: 0, total: 0 });
    setResults({ success: 0, errors: [] });
    setDragOver(false);
  }, []);

  const handleOpenChange = useCallback(
    (v: boolean) => {
      if (!v) reset();
      onOpenChange(v);
    },
    [onOpenChange, reset]
  );

  const handleFile = useCallback(
    async (file: File) => {
      try {
        const parsed = await parseFile(file);
        setParsedFile(parsed);
        const detected = autoDetectMapping(parsed.headers, fields, headerPatterns);
        setMapping(detected);
        setStep("mapping");
      } catch {
        showToast("ファイルの読み込みに失敗しました", "error");
      }
    },
    [showToast, fields, headerPatterns]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const updateMapping = useCallback((fieldKey: string, headerIndex: string) => {
    setMapping((prev) => ({
      ...prev,
      [fieldKey]: headerIndex === "__none__" ? null : Number(headerIndex),
    }));
  }, []);

  const goToPreview = useCallback(() => {
    if (!parsedFile) return;

    // 値の抽出
    const allValues = parsedFile.rows.map((row) => {
      const values: Record<string, string> = {};
      for (const field of fields) {
        const colIdx = mapping[field.key];
        values[field.key] = colIdx != null ? (row[colIdx] ?? "").trim() : "";
      }
      return values;
    });

    // バリデーション
    const rows: ValidatedRow[] = allValues.map((values, rowIndex) => {
      const errors = validateRow(values, rowIndex, allValues);
      return { rowIndex, values, valid: errors.length === 0, errors };
    });

    setValidatedRows(rows);
    setStep("preview");
  }, [parsedFile, mapping, fields, validateRow]);

  const startImport = useCallback(async () => {
    const validRows = validatedRows.filter((r) => r.valid);
    if (validRows.length === 0) return;

    setStep("importing");
    setProgress({ current: 0, total: validRows.length });

    const errors: string[] = [];
    let successCount = 0;

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      try {
        await importRow(row.values);
        successCount++;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "不明なエラー";
        const label = row.values[fields[0].key] || `行${row.rowIndex + 2}`;
        errors.push(`${label}: ${msg}`);
      }
      setProgress({ current: i + 1, total: validRows.length });
    }

    setResults({ success: successCount, errors });
    setStep("done");
    if (successCount > 0) onComplete();
  }, [validatedRows, importRow, fields, onComplete]);

  const validCount = validatedRows.filter((r) => r.valid).length;
  const invalidCount = validatedRows.filter((r) => !r.valid).length;

  const visibleColumns =
    previewColumns ?? fields.filter((f) => f.preview !== false).map((f) => f.key);
  const requiredFieldKeys = fields.filter((f) => f.required).map((f) => f.key);
  const hasRequiredMapped = requiredFieldKeys.every((k) => mapping[k] != null);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={handleOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/50 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <DialogPrimitive.Popup className="fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl rounded-2xl sm:rounded-[2rem] bg-background ring-1 ring-foreground/10 shadow-lg outline-none flex flex-col data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 duration-100 max-h-[80vh]">
          <div className="px-6 py-4 border-b shrink-0">
            <DialogPrimitive.Title className="text-base font-semibold">
              {title}
            </DialogPrimitive.Title>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {step === "upload" && (
              <div
                className={cn(
                  "border-2 border-dashed rounded-lg p-12 text-center transition-colors cursor-pointer",
                  dragOver
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/25 hover:border-muted-foreground/50"
                )}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
                <p className="text-sm font-medium mb-1">ファイルをドラッグ＆ドロップ</p>
                <p className="text-xs text-muted-foreground mb-4">
                  またはクリックしてファイルを選択
                </p>
                <p className="text-xs text-muted-foreground">
                  対応形式: CSV, TSV, Excel (.xlsx, .xls)
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.tsv,.xlsx,.xls"
                  className="hidden"
                  onChange={handleFileInput}
                />
              </div>
            )}

            {step === "mapping" && parsedFile && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileSpreadsheet className="h-4 w-4" />
                  <span>{parsedFile.fileName}</span>
                  <span>（{parsedFile.rows.length}行）</span>
                </div>
                <div className="space-y-3">
                  {fields.map((field) => {
                    const usedByOthers = new Set(
                      Object.entries(mapping)
                        .filter(([k, v]) => k !== field.key && v != null)
                        .map(([, v]) => v)
                    );
                    return (
                      <div key={field.key} className="flex items-center gap-3">
                        <span className="text-sm w-44 shrink-0">
                          {field.label}
                          {field.required && <span className="text-red-500 ml-0.5">*</span>}
                        </span>
                        <Select
                          value={
                            mapping[field.key] != null ? String(mapping[field.key]) : "__none__"
                          }
                          onValueChange={(v) => v != null && updateMapping(field.key, String(v))}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue>
                              {(v: string) =>
                                v === "__none__"
                                  ? "（未選択）"
                                  : (parsedFile.headers[Number(v)] ?? "（未選択）")
                              }
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">（未選択）</SelectItem>
                            {parsedFile.headers.map((header, idx) => (
                              <SelectItem
                                key={idx}
                                value={String(idx)}
                                disabled={usedByOthers.has(idx)}
                              >
                                {header}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {step === "preview" && (
              <div className="space-y-4">
                <div className="flex items-center gap-4 text-sm">
                  <span>
                    全{validatedRows.length}件中、
                    <span className="font-medium text-green-600">{validCount}件</span>
                    インポート可能
                  </span>
                  {invalidCount > 0 && <span className="text-red-500">{invalidCount}件エラー</span>}
                </div>
                <div className="border rounded-lg overflow-auto max-h-80">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">#</TableHead>
                        {visibleColumns.map((key) => (
                          <TableHead key={key}>
                            {fields.find((f) => f.key === key)?.label ?? key}
                          </TableHead>
                        ))}
                        <TableHead>状態</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {validatedRows.slice(0, 50).map((row) => (
                        <TableRow key={row.rowIndex} className={cn(!row.valid && "bg-red-50")}>
                          <TableCell className="text-muted-foreground">
                            {row.rowIndex + 2}
                          </TableCell>
                          {visibleColumns.map((key) => (
                            <TableCell key={key} className="text-sm">
                              {row.values[key] || "—"}
                            </TableCell>
                          ))}
                          <TableCell>
                            {row.valid ? (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            ) : (
                              <span className="text-xs text-red-500">{row.errors.join(", ")}</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {validatedRows.length > 50 && (
                  <p className="text-xs text-muted-foreground">
                    先頭50行を表示しています（全{validatedRows.length}行）
                  </p>
                )}
                {previewFooter}
              </div>
            )}

            {step === "importing" && (
              <div className="space-y-4 py-8">
                <p className="text-sm text-center">
                  インポート中... {progress.current} / {progress.total}
                </p>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-300"
                    style={{
                      width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {step === "done" && (
              <div className="space-y-4 py-4">
                <div className="text-center space-y-2">
                  <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
                  <p className="text-lg font-medium">インポート完了</p>
                  <p className="text-sm text-muted-foreground">{results.success}件を追加しました</p>
                </div>
                {results.errors.length > 0 && (
                  <div className="border border-red-200 rounded-lg p-4 bg-red-50 max-h-40 overflow-y-auto">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="h-4 w-4 text-red-500" />
                      <span className="text-sm font-medium text-red-700">
                        {results.errors.length}件のエラー
                      </span>
                    </div>
                    <ul className="space-y-1">
                      {results.errors.map((err, i) => (
                        <li key={i} className="text-xs text-red-600">
                          {err}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="px-6 py-3 border-t flex items-center justify-between shrink-0">
            <div>
              {step === "mapping" && (
                <Button variant="outline" onClick={() => setStep("upload")}>
                  戻る
                </Button>
              )}
              {step === "preview" && (
                <Button variant="outline" onClick={() => setStep("mapping")}>
                  戻る
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              {step !== "importing" && (
                <Button variant="outline" onClick={() => handleOpenChange(false)}>
                  {step === "done" ? "閉じる" : "キャンセル"}
                </Button>
              )}
              {step === "mapping" && (
                <Button onClick={goToPreview} disabled={!hasRequiredMapped}>
                  プレビュー
                </Button>
              )}
              {step === "preview" && (
                <Button onClick={startImport} disabled={validCount === 0}>
                  インポート開始（{validCount}件）
                </Button>
              )}
            </div>
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
