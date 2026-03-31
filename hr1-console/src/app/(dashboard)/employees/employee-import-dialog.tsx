"use client";

import { useState, useCallback, useRef } from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { invokeCreateUser } from "@/lib/hooks/use-import";
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Mail } from "lucide-react";
import {
  parseFile,
  autoDetectMapping,
  validateRows,
  HR1_FIELDS,
  type ParsedFile,
  type ValidatedRow,
} from "@/lib/import-utils";

type Step = "upload" | "mapping" | "preview" | "importing" | "done";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  departments: { id: string; name: string }[];
  onComplete: () => void;
}

const ADDRESS_FIELDS = [
  "current_postal_code",
  "current_prefecture",
  "current_city",
  "current_street_address",
  "current_building",
  "registered_postal_code",
  "registered_prefecture",
  "registered_city",
  "registered_street_address",
  "registered_building",
];

export function EmployeeImportDialog({
  open,
  onOpenChange,
  organizationId,
  departments,
  onComplete,
}: Props) {
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
  const [sendInvite, setSendInvite] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setStep("upload");
    setParsedFile(null);
    setMapping({});
    setValidatedRows([]);

    setProgress({ current: 0, total: 0 });
    setResults({ success: 0, errors: [] });
    setDragOver(false);
    setSendInvite(false);
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
        const detected = autoDetectMapping(parsed.headers);
        setMapping(detected);
        setStep("mapping");
      } catch {
        showToast("ファイルの読み込みに失敗しました", "error");
      }
    },
    [showToast]
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
    const rows = validateRows(parsedFile.rows, mapping);
    setValidatedRows(rows);
    setStep("preview");
  }, [parsedFile, mapping]);

  const startImport = useCallback(async () => {
    const validRows = validatedRows.filter((r) => r.valid);
    if (validRows.length === 0) return;

    setStep("importing");
    setProgress({ current: 0, total: validRows.length });

    const errors: string[] = [];
    let successCount = 0;

    const deptNameMap = new Map(departments.map((d) => [d.name, d.id]));

    const genderMap: Record<string, string> = {
      男: "male",
      男性: "male",
      女: "female",
      女性: "female",
      その他: "other",
      male: "male",
      female: "female",
      other: "other",
    };

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      const v = row.values;

      const deptIds: string[] = [];
      if (v.department) {
        const names = v.department.split(/[,、]/).map((s) => s.trim());
        for (const name of names) {
          const id = deptNameMap.get(name);
          if (id) deptIds.push(id);
        }
      }

      try {
        const body: Record<string, unknown> = {
          email: v.email,
          role: "employee",
          organization_id: organizationId,
          send_invite: sendInvite,
        };
        if (v.display_name) body.display_name = v.display_name;
        if (v.name_kana) body.name_kana = v.name_kana;
        if (v.position) body.position = v.position;
        if (v.phone) body.phone = v.phone;
        if (v.hire_date) body.hire_date = v.hire_date;
        if (v.birth_date) body.birth_date = v.birth_date;
        if (v.gender && genderMap[v.gender]) body.gender = genderMap[v.gender];
        if (deptIds.length > 0) body.department_ids = deptIds;

        for (const key of ADDRESS_FIELDS) {
          if (v[key]) body[key] = v[key];
        }

        await invokeCreateUser(body);
        successCount++;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "不明なエラー";
        errors.push(`行${row.rowIndex + 2}: ${v.email} - ${msg}`);
      }

      setProgress({ current: i + 1, total: validRows.length });
    }

    setResults({ success: successCount, errors });

    setStep("done");
    if (successCount > 0) onComplete();
  }, [validatedRows, organizationId, departments, onComplete, sendInvite]);

  const validCount = validatedRows.filter((r) => r.valid).length;
  const invalidCount = validatedRows.filter((r) => !r.valid).length;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={handleOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/50 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <DialogPrimitive.Popup className="fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl rounded-xl bg-background ring-1 ring-foreground/10 shadow-lg outline-none flex flex-col data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 duration-100 max-h-[80vh]">
          <div className="px-6 py-4 border-b shrink-0">
            <DialogPrimitive.Title className="text-base font-semibold">
              社員一括インポート
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
                  {HR1_FIELDS.map((field) => {
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
                        <TableHead>メール</TableHead>
                        <TableHead>氏名</TableHead>
                        <TableHead>部署</TableHead>
                        <TableHead>状態</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {validatedRows.slice(0, 50).map((row) => (
                        <TableRow key={row.rowIndex} className={cn(!row.valid && "bg-red-50")}>
                          <TableCell className="text-muted-foreground">
                            {row.rowIndex + 2}
                          </TableCell>
                          <TableCell className="text-sm">{row.values.email || "-"}</TableCell>
                          <TableCell className="text-sm">
                            {row.values.display_name || "-"}
                          </TableCell>
                          <TableCell className="text-sm">{row.values.department || "-"}</TableCell>
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

                <div className="flex items-center gap-3 rounded-lg border p-4">
                  <Mail className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="flex-1">
                    <Label className="text-sm font-medium">招待メールを送信</Label>
                    <p className="text-xs text-muted-foreground">
                      ONにすると、インポートした社員に招待メールが送信されます
                    </p>
                  </div>
                  <Switch checked={sendInvite} onCheckedChange={setSendInvite} />
                </div>
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
                <Button onClick={goToPreview} disabled={mapping.email == null}>
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
