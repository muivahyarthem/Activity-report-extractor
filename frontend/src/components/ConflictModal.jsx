import React from 'react';
import { AlertTriangle, Plus, FileSpreadsheet, X } from 'lucide-react';

export default function ConflictModal({ collisionInfo, onAppend, onCreateNew, onCancel }) {
  if (!collisionInfo || !collisionInfo.exists) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded border border-gray-300 max-w-lg w-full shadow-xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-200 bg-amber-50">
          <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
          <div>
            <h3 className="text-xs font-semibold text-gray-900">File Already Exists</h3>
            <p className="text-[11px] text-gray-500 mt-0.5">A file with this name was found at the destination path.</p>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Existing file metadata */}
          <table className="w-full text-xs border border-gray-200 rounded overflow-hidden">
            <tbody className="divide-y divide-gray-100">
              {[
                ['File Name', collisionInfo.file_name],
                ['File Type', collisionInfo.file_type?.toUpperCase()],
                ['Location', collisionInfo.file_path],
                ['File Size', collisionInfo.size_formatted],
                ['Last Modified', collisionInfo.last_modified],
                ...(collisionInfo.existing_rows >= 0 ? [['Existing Rows', `${collisionInfo.existing_rows} records`]] : []),
              ].map(([label, val]) => (
                <tr key={label}>
                  <td className="py-1.5 px-3 font-medium text-gray-500 bg-gray-50 whitespace-nowrap w-32">{label}</td>
                  <td className="py-1.5 px-3 text-gray-700 font-mono truncate max-w-xs" title={String(val)}>{val}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="text-xs text-gray-600">
            To prevent accidental data loss, files are never overwritten automatically. How would you like to proceed?
          </p>

          {/* Action options */}
          <div className="space-y-1.5">
            <button
              onClick={onAppend}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded border border-gray-200 hover:border-[#1a3a5c] hover:bg-blue-50/50 text-left transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4 text-[#1a3a5c] shrink-0" />
              <div>
                <div className="text-xs font-semibold text-gray-900">Append to Existing File</div>
                <div className="text-[11px] text-gray-500">Add new rows below the existing records without touching previous data</div>
              </div>
            </button>

            <button
              onClick={onCreateNew}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded border border-gray-200 hover:border-[#1a3a5c] hover:bg-blue-50/50 text-left transition-colors"
            >
              <Plus className="w-4 h-4 text-green-700 shrink-0" />
              <div>
                <div className="text-xs font-semibold text-gray-900">Create New File</div>
                <div className="text-[11px] text-gray-500">Save into a fresh file with an auto-generated timestamped name</div>
              </div>
            </button>

            <button
              onClick={onCancel}
              className="w-full flex items-center gap-3 px-4 py-2 rounded border border-gray-200 hover:bg-gray-100 text-left transition-colors text-gray-600"
            >
              <X className="w-4 h-4 text-gray-400 shrink-0" />
              <span className="text-xs font-medium">Cancel Operation</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
