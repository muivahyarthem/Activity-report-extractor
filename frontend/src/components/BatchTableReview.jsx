import React from 'react';
import { CheckCheck, Eye, CheckCircle2, Clock, AlertCircle, FileText } from 'lucide-react';

function StatusBadge({ status }) {
  if (status === 'approved')
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 border border-green-300 rounded"><CheckCircle2 className="w-3 h-3" />Approved</span>;
  if (status === 'extracted')
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 border border-blue-300 rounded"><AlertCircle className="w-3 h-3" />Pending Review</span>;
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 border border-gray-300 rounded"><Clock className="w-3 h-3" />{status}</span>;
}

export default function BatchTableReview({ documents, onSelectDoc, onApproveAll, onProceedToExport }) {
  const approvedCount = documents.filter(d => d.status === 'approved').length;
  const readyCount = documents.filter(d => d.status === 'extracted').length;
  const total = documents.length;

  return (
    <div className="bg-white border border-gray-300 rounded-md shadow-sm overflow-hidden">

      {/* Toolbar */}
      <div className="bg-gray-100 border-b border-gray-300 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-semibold text-gray-800">Batch Document Review</span>
          </div>
          <span className="text-sm text-gray-500">{approvedCount} of {total} approved</span>
        </div>

        <div className="flex items-center gap-2">
          {readyCount > 0 && (
            <button
              onClick={onApproveAll}
              className="flex items-center gap-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium px-3.5 py-1.5 rounded shadow-sm transition-colors"
            >
              <CheckCheck className="w-4 h-4 text-green-700" />
              Approve All ({readyCount})
            </button>
          )}
          <button
            disabled={approvedCount === 0}
            onClick={onProceedToExport}
            className="flex items-center gap-1.5 bg-[#1a3a5c] hover:bg-[#14304f] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-1.5 rounded shadow-sm transition-colors"
          >
            Export Approved Records ({approvedCount})
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wide">
              <th className="py-2.5 px-4 w-10">#</th>
              <th className="py-2.5 px-4">Document File</th>
              <th className="py-2.5 px-4">Status</th>
              <th className="py-2.5 px-4">Activity Title</th>
              <th className="py-2.5 px-4">Type</th>
              <th className="py-2.5 px-4">Speaker / Resource Person</th>
              <th className="py-2.5 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {documents.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-sm text-gray-400">
                  No documents in queue. Upload and extract files first.
                </td>
              </tr>
            ) : (
              documents.map((doc, idx) => {
                const title = doc.fields?.general_information?.title || '—';
                const type = doc.fields?.general_information?.type || '—';
                const speaker = doc.fields?.speaker_details?.name || '—';
                const isApproved = doc.status === 'approved';

                return (
                  <tr key={doc.id} className={`hover:bg-gray-50 transition-colors ${isApproved ? 'bg-green-50/50' : ''}`}>
                    <td className="py-3 px-4 text-sm text-gray-400 tabular-nums">{idx + 1}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-4 h-4 text-gray-400 shrink-0" />
                        <span className="text-sm font-medium text-gray-900 truncate max-w-[200px]" title={doc.filename}>
                          {doc.filename}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <StatusBadge status={doc.status} />
                    </td>
                    <td className="py-3 px-4 max-w-[240px]">
                      <span className="text-sm text-gray-800 truncate block" title={title}>{title}</span>
                    </td>
                    <td className="py-3 px-4 max-w-[140px]">
                      <span className="text-sm text-gray-700 truncate block" title={type}>{type}</span>
                    </td>
                    <td className="py-3 px-4 max-w-[160px]">
                      <span className="text-sm text-gray-700 truncate block" title={speaker}>{speaker}</span>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => onSelectDoc(doc.id)}
                        className="flex items-center gap-1.5 ml-auto text-sm font-medium text-[#1a3a5c] hover:text-[#0f2640] hover:underline"
                      >
                        <Eye className="w-4 h-4" />
                        {isApproved ? 'View/Edit' : 'Review'}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      {documents.length > 0 && (
        <div className="px-4 py-2 border-t border-gray-200 bg-gray-50 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-gray-500">
            {total} total · {approvedCount} approved · {readyCount} pending review
          </span>
          <span className="text-xs text-gray-400">
            Approval required before export — data is never saved automatically.
          </span>
        </div>
      )}
    </div>
  );
}
