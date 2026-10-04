"use client";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useImportEmployeesCsv } from "@/features/companies/useCompanies";
import type { CsvImportResponse } from "@/types";
import {
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  HelpCircle,
  Upload,
} from "lucide-react";
import { useState } from "react";

const SAMPLE_CSV = `name,email,canChooseDeliveryAddress,canChangeDeliveryTime,canChangePackaging
Alice Smith,alice.smith@example.com,true,false,true
Bob Jones,bob.jones@example.com,false,false,false
Charlie Brown,charlie.b@example.com,true,true,true`;

interface CsvImportModalProps {
  open: boolean;
  onClose: () => void;
  companyId: string;
  companyName: string;
}

export function CsvImportModal({
  open,
  onClose,
  companyId,
  companyName,
}: CsvImportModalProps) {
  const [csvContent, setCsvContent] = useState("");
  const [result, setResult] = useState<CsvImportResponse | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const importMutation = useImportEmployeesCsv(companyId);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCsvContent(event.target?.result as string);
        setResult(null);
        setImportError(null);
      };
      reader.readAsText(file);
    }
  };

  const handleLoadSample = () => {
    setCsvContent(SAMPLE_CSV);
    setResult(null);
    setImportError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvContent.trim()) {
      setImportError("Please provide CSV content or upload a file.");
      return;
    }

    setImportError(null);
    try {
      const res = await importMutation.mutateAsync({
        id: companyId,
        csvContent: csvContent.trim(),
      });
      setResult(res);
    } catch (err: any) {
      setImportError(err?.message || "Failed to import employee CSV.");
    }
  };

  const handleReset = () => {
    setCsvContent("");
    setResult(null);
    setImportError(null);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Bulk Employee CSV Import • ${companyName}`}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Instruction Banner */}
        <div className="rounded-2xl bg-[#fbfaf6] border border-[#eae5d8] p-3.5 space-y-2 text-xs text-[#5c685e]">
          <div className="flex items-center justify-between">
            <span className="font-bold text-[#26352a] flex items-center gap-1.5">
              <FileSpreadsheet size={15} className="text-[#294d33]" />
              Required CSV Header Format
            </span>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={handleLoadSample}
              icon={<FileText size={12} />}
            >
              Load Sample Template
            </Button>
          </div>
          <code className="block bg-[#f5f1e6] p-2 rounded-xl text-[11px] font-mono text-[#294d33] select-all overflow-x-auto">
            name,email,canChooseDeliveryAddress,canChangeDeliveryTime,canChangePackaging
          </code>
        </div>

        {importError && (
          <div className="rounded-xl bg-[#fff5f5] p-3 text-xs text-[#a34747] border border-[#ffdada]">
            {importError}
          </div>
        )}

        {/* Results Banner */}
        {result && (
          <div className="rounded-2xl bg-[#fbfaf6] border border-[#eae5d8] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-[#26352a] flex items-center gap-2">
                <CheckCircle2 size={16} className="text-[#294d33]" />
                Import Summary
              </h4>
              <div className="flex items-center gap-2 text-xs font-semibold">
                <span className="text-[#294d33] bg-[#294d33]/10 px-2 py-0.5 rounded-md">
                  {result.imported} Imported
                </span>
                {result.failed > 0 && (
                  <span className="text-[#a34747] bg-[#a34747]/10 px-2 py-0.5 rounded-md">
                    {result.failed} Failed
                  </span>
                )}
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="space-y-1.5 max-h-40 overflow-y-auto pt-2 border-t border-[#eae5d8]">
                <p className="text-[11px] font-semibold text-[#a34747]">
                  Line Errors Encountered:
                </p>
                {result.errors.map((err, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 text-[11px] text-[#a34747] bg-[#fff5f5] p-1.5 rounded-lg border border-[#ffdada]"
                  >
                    <AlertTriangle size={12} className="shrink-0" />
                    <span>Row {err.row}: {err.error}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* File Upload or Raw Text Area */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-[#4c594f]">
              Paste CSV Content or Upload File
            </label>
            <label className="cursor-pointer inline-flex items-center gap-1.5 text-xs text-[#294d33] font-semibold hover:underline">
              <Upload size={12} />
              Upload .csv file
              <input
                type="file"
                accept=".csv,text/csv,text/plain"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          <textarea
            rows={7}
            value={csvContent}
            onChange={(e) => {
              setCsvContent(e.target.value);
              setResult(null);
            }}
            placeholder="name,email,canChooseDeliveryAddress,canChangeDeliveryTime,canChangePackaging&#10;John Doe,john.doe@company.com,true,false,true"
            className="w-full rounded-2xl border border-[#d9d2c2] bg-white p-3 font-mono text-xs text-[#26352a] placeholder-[#9fa89e] focus:border-[#315d3c] focus:outline-none"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-[#eae5d8]">
          <Button type="button" variant="ghost" size="sm" onClick={handleReset}>
            Clear
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="secondary" type="button" onClick={onClose}>
              {result ? "Done" : "Cancel"}
            </Button>
            <Button
              variant="primary"
              type="submit"
              loading={importMutation.isPending}
              disabled={!csvContent.trim()}
            >
              Process CSV Import
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
