import React from 'react';
import { CheckCircle2, Download, ExternalLink, RefreshCw, FolderOpen } from 'lucide-react';

export default function CompletionSummary({ result, onReset }) {
  if (!result) return null;

  return (
    <div className="max-w-xl mx-auto">
      <div className="panel overflow-hidden">
        {/* Header */}
        <div className="panel-header bg-green-50 border-b border-green-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-700 shrink-0" />
            <span className="panel-title text-green-800">Export Completed Successfully</span>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Message */}
          <p className="text-xs text-gray-600 leading-relaxed">
            {result.message || "Approved data has been safely processed and exported without data loss."}
          </p>

          {/* Local download */}
          {result.download_url && (
            <div className="border border-gray-200 rounded p-3 flex items-center justify-between gap-3 bg-gray-50">
              <div className="flex items-center gap-2 min-w-0">
                <Download className="w-4 h-4 text-gray-500 shrink-0" />
                <span className="text-xs font-medium text-gray-700 truncate">{result.file_name}</span>
              </div>
              <a
                href={result.download_url}
                download
                className="btn-success shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                Download File
              </a>
            </div>
          )}

          {/* Google Sheets link */}
          {result.spreadsheet_url && (
            <div className="border border-gray-200 rounded p-3 flex items-center justify-between gap-3 bg-gray-50">
              <div className="flex items-center gap-2 min-w-0">
                <ExternalLink className="w-4 h-4 text-gray-500 shrink-0" />
                <span className="text-xs font-medium text-gray-700 truncate">Google Spreadsheet ready</span>
              </div>
              <a
                href={result.spreadsheet_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary shrink-0"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open in Google Sheets
              </a>
            </div>
          )}

          {/* Drive results */}
          {result.drive_results && result.drive_results.length > 0 && (
            <div className="border border-gray-200 rounded overflow-hidden">
              <div className="px-3 py-2 border-b border-gray-200 bg-gray-50 flex items-center gap-1.5">
                <FolderOpen className="w-3.5 h-3.5 text-gray-500" />
                <span className="text-[11px] font-semibold text-gray-600 uppercase tracking-wide">
                  Google Drive Upload Results
                </span>
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                    <th className="py-1.5 px-3 text-left">Event Name</th>
                    <th className="py-1.5 px-3 text-center">Images Uploaded</th>
                    <th className="py-1.5 px-3 text-left">Folder Path</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {result.drive_results.map((res, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="py-2 px-3 font-medium text-gray-800">{res.event_name}</td>
                      <td className="py-2 px-3 text-center text-gray-600 tabular-nums">{res.uploaded_count}</td>
                      <td className="py-2 px-3 text-gray-400 font-mono text-[10px]">{res.folder_path}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Return action */}
          <div className="pt-2 border-t border-gray-100 flex justify-end">
            <button
              onClick={onReset}
              className="btn-secondary"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
