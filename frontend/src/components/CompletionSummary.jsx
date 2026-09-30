import React from 'react';
import {
  CheckCircle2, Download, ExternalLink, ArrowLeft,
  FileSpreadsheet, HardDrive, Check
} from 'lucide-react';

export default function CompletionSummary({ result, onReset }) {
  if (!result) return null;

  const isGoogleSheets = Boolean(result.spreadsheet_url);
  const isLocalFile = Boolean(result.download_url);
  const isDrive = Boolean(result.drive_results && result.drive_results.length > 0);

  return (
    <div className="max-w-lg mx-auto py-10 px-4">
      <div className="bg-white border border-gray-200/90 rounded-2xl shadow-sm p-6 sm:p-8 text-center">

        {/* Clean success badge */}
        <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm">
          <Check className="w-7 h-7 stroke-[2.5]" />
        </div>

        {/* Heading */}
        <h2 className="text-xl font-bold text-gray-900 tracking-tight">
          Export Completed Successfully
        </h2>

        {/* Informative message */}
        <p className="text-sm text-gray-600 mt-2 max-w-sm mx-auto leading-relaxed">
          {result.message || "Your approved records have been processed and saved successfully."}
        </p>

        {/* Google Sheets Card - Simple, clean, prominent */}
        {isGoogleSheets && (
          <div className="mt-6 p-4 rounded-xl bg-emerald-50/60 border border-emerald-200/90 text-left space-y-3.5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100/90 text-emerald-700 flex items-center justify-center shrink-0 shadow-xs">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                    Google Sheets
                  </span>
                  <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-emerald-200/80 text-emerald-800">
                    Live
                  </span>
                </div>
                <p className="text-xs text-emerald-700 truncate mt-0.5">
                  Records have been written in standard 28-column format
                </p>
              </div>
            </div>

            <a
              href={result.spreadsheet_url}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 bg-[#0f9d58] hover:bg-[#0b8043] active:bg-[#096e38] text-white text-sm font-semibold py-2.5 px-4 rounded-lg shadow-sm hover:shadow transition-all"
            >
              <ExternalLink className="w-4 h-4" />
              Open in Google Sheets
            </a>
          </div>
        )}

        {/* Local Download Card */}
        {isLocalFile && (
          <div className="mt-6 p-4 rounded-xl bg-blue-50/60 border border-blue-200/90 text-left space-y-3.5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100/90 text-blue-700 flex items-center justify-center shrink-0 shadow-xs">
                <Download className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-blue-950 uppercase tracking-wider">
                  Local File Ready
                </p>
                <p className="text-xs text-blue-700 font-mono truncate mt-0.5" title={result.file_name}>
                  {result.file_name}
                </p>
              </div>
            </div>

            <a
              href={result.download_url}
              download
              className="w-full inline-flex items-center justify-center gap-2 bg-[#1a3a5c] hover:bg-[#14304f] active:bg-[#0d2138] text-white text-sm font-semibold py-2.5 px-4 rounded-lg shadow-sm hover:shadow transition-all"
            >
              <Download className="w-4 h-4" />
              Download {result.file_name}
            </a>
          </div>
        )}

        {/* Google Drive Upload Results */}
        {isDrive && (
          <div className="mt-6 p-4 rounded-xl bg-gray-50 border border-gray-200 text-left space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-700 uppercase tracking-wider">
              <HardDrive className="w-4 h-4 text-[#1a3a5c]" />
              Google Drive Upload Summary
            </div>
            <div className="divide-y divide-gray-200 max-h-48 overflow-y-auto">
              {result.drive_results.map((res, i) => (
                <div key={i} className="py-2 flex items-center justify-between text-xs">
                  <div className="min-w-0 pr-2">
                    <p className="font-semibold text-gray-800 truncate">{res.event_name}</p>
                    <p className="text-[11px] text-gray-500 font-mono truncate">{res.folder_path}</p>
                  </div>
                  <span className="shrink-0 px-2 py-0.5 bg-gray-200/80 text-gray-700 rounded text-[11px] font-medium">
                    {res.uploaded_count} image{res.uploaded_count !== 1 ? 's' : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Clean footer action */}
        <div className="mt-8 pt-5 border-t border-gray-100 flex justify-center">
          <button
            onClick={onReset}
            className="inline-flex items-center gap-2 text-xs font-semibold text-gray-600 hover:text-gray-900 bg-white hover:bg-gray-50 active:bg-gray-100 border border-gray-300 hover:border-gray-400 px-4 py-2 rounded-lg transition-colors shadow-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Document Queue
          </button>
        </div>

      </div>
    </div>
  );
}
