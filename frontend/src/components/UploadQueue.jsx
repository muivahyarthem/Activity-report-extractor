import React, { useRef, useState } from 'react';
import {
  Upload, FileText, Trash2, Play, CheckCircle, Clock,
  AlertCircle, Eye, Loader2, FolderOpen, X
} from 'lucide-react';
import { API_BASE_URL } from '../api';

function StatusBadge({ status }) {
  if (status === 'queued')
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 border border-gray-300 rounded"><Clock className="w-3 h-3" />Queued</span>;
  if (status === 'processing')
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-800 border border-amber-300 rounded"><Loader2 className="w-3 h-3 animate-spin" />Extracting…</span>;
  if (status === 'extracted')
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 border border-blue-300 rounded"><AlertCircle className="w-3 h-3" />Ready for Review</span>;
  if (status === 'approved')
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 border border-green-300 rounded"><CheckCircle className="w-3 h-3" />Approved</span>;
  if (status === 'error')
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800 border border-red-300 rounded"><AlertCircle className="w-3 h-3" />Error</span>;
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 border border-gray-300 rounded">{status}</span>;
}

/** Upload a batch of files with XHR progress tracking. */
function useUploadWithProgress(onDone) {
  const [progress, setProgress] = useState(null); // null = idle, 0-100 = uploading

  const upload = (fileList) => {
    if (!fileList || fileList.length === 0) return;
    const formData = new FormData();
    for (let i = 0; i < fileList.length; i++) {
      formData.append('files', fileList[i]);
    }

    const sessionId = localStorage.getItem('activity_extractor_session_id');
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE_URL}/api/documents/upload`, true);
    if (sessionId) xhr.setRequestHeader('x-session-id', sessionId);
    xhr.withCredentials = true;

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        setProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      setProgress(null);
      if (xhr.status >= 200 && xhr.status < 300) {
        const returnedSessionId = xhr.getResponseHeader('x-session-id');
        if (returnedSessionId) {
          localStorage.setItem('activity_extractor_session_id', returnedSessionId);
        }
        if (typeof onDone === 'function') {
          onDone();
        }
      } else {
        try {
          const errData = JSON.parse(xhr.responseText);
          alert('Upload failed: ' + (errData.detail || xhr.statusText));
        } catch {
          alert('Upload failed: ' + (xhr.statusText || 'Server error'));
        }
      }
    };

    xhr.onerror = () => {
      setProgress(null);
      alert('Upload error. Please check your connection.');
    };

    setProgress(0);
    xhr.send(formData);
  };

  return { progress, upload };
}

export default function UploadQueue({
  queue, onUploadSuccess, onUploadFiles, onRemoveDoc, onStartExtraction, isProcessing, onSelectDoc
}) {
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDone = () => {
    if (typeof onUploadSuccess === 'function') {
      onUploadSuccess();
    } else if (typeof onUploadFiles === 'function') {
      onUploadFiles();
    }
  };

  const { progress, upload } = useUploadWithProgress(handleDone);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.length > 0) upload(e.dataTransfer.files);
  };

  const handleFileSelect = (e) => {
    if (e.target.files?.length > 0) {
      upload(e.target.files);
      e.target.value = '';
    }
  };

  const queuedCount = queue.filter(d => d.status === 'queued').length;
  const isUploading = progress !== null;

  return (
    <div className="space-y-4">

      {/* ── Upload panel ── */}
      <div className="bg-white border border-gray-300 rounded-md shadow-sm overflow-hidden">
        {/* Panel header */}
        <div className="bg-gray-100 border-b border-gray-300 px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
            <Upload className="w-4 h-4 text-gray-600" />
            Document Upload
          </div>
          <span className="text-xs text-gray-500">Accepts .docx, .doc, .pdf — multiple files supported</span>
        </div>

        {/* Drop zone */}
        <div
          className={`flex items-center gap-4 px-5 py-4 border-b border-dashed transition-colors cursor-pointer ${
            isDragging
              ? 'border-[#1a3a5c] bg-blue-50'
              : 'border-gray-300 hover:bg-gray-50'
          }`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => !isUploading && fileInputRef.current?.click()}
        >
          <input type="file" ref={fileInputRef} multiple accept=".docx,.doc,.pdf" onChange={handleFileSelect} className="hidden" />
          <div className={`w-10 h-10 border-2 border-dashed rounded flex items-center justify-center bg-gray-50 shrink-0 ${isDragging ? 'border-[#1a3a5c]' : 'border-gray-300'}`}>
            <FolderOpen className={`w-5 h-5 ${isDragging ? 'text-[#1a3a5c]' : 'text-gray-400'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-700">
              {isUploading ? 'Uploading…' : 'Browse files or drag & drop here'}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">Activity report documents (.docx, .doc, .pdf)</p>

            {/* ── Progress bar ── */}
            {isUploading && (
              <div className="mt-2 space-y-1">
                <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#1a3a5c] rounded-full transition-all duration-200"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500">{progress}% uploaded</p>
              </div>
            )}
          </div>

          {!isUploading && (
            <button
              type="button"
              className="ml-auto bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium px-4 py-1.5 rounded shadow-sm transition-colors shrink-0"
              onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
            >
              Browse…
            </button>
          )}
        </div>

        {/* Action bar */}
        {queue.length > 0 && (
          <div className="px-5 py-2.5 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
            <span className="text-sm text-gray-600">
              {queue.length} document{queue.length !== 1 ? 's' : ''} in queue
              {queuedCount > 0 && <span className="text-gray-400"> · {queuedCount} awaiting extraction</span>}
            </span>
            {queuedCount > 0 && (
              <button
                disabled={isProcessing}
                onClick={onStartExtraction}
                className="flex items-center gap-2 bg-[#1a3a5c] hover:bg-[#14304f] disabled:opacity-50 text-white text-sm font-semibold px-4 py-1.5 rounded shadow-sm transition-colors"
              >
                {isProcessing
                  ? <><Loader2 className="w-4 h-4 animate-spin" />Processing…</>
                  : <><Play className="w-4 h-4 fill-current" />Run Extraction</>
                }
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Document queue table ── */}
      {queue.length > 0 ? (
        <div className="bg-white border border-gray-300 rounded-md shadow-sm overflow-hidden">
          <div className="bg-gray-100 border-b border-gray-300 px-4 py-2.5 flex items-center gap-2">
            <FileText className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-semibold text-gray-800">Processing Queue</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  <th className="py-2.5 px-4 w-10">#</th>
                  <th className="py-2.5 px-4">File Name</th>
                  <th className="py-2.5 px-4 text-center">Images</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {queue.map((doc, idx) => (
                  <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 text-sm text-gray-400 tabular-nums">{idx + 1}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-4 h-4 text-gray-400 shrink-0" />
                        <span className="text-sm font-medium text-gray-900 truncate max-w-xs" title={doc.filename}>
                          {doc.filename}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-sm text-gray-500 tabular-nums">
                        {doc.images_count > 0 ? doc.images_count : '—'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={doc.status} />
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-2">
                        {doc.has_fields && (
                          <button
                            onClick={() => onSelectDoc(doc.id)}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1a3a5c] hover:text-white hover:bg-[#1a3a5c] border border-[#1a3a5c] px-2.5 py-1 rounded transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Review
                          </button>
                        )}
                        <button
                          onClick={() => onRemoveDoc(doc.id)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 px-2 py-1 rounded transition-colors"
                          title="Remove from queue"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-gray-300 rounded-md shadow-sm py-14 text-center">
          <FileText className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p className="text-sm font-medium text-gray-500">No documents uploaded yet</p>
          <p className="text-xs text-gray-400 mt-1">Use the upload area above to add activity report files.</p>
        </div>
      )}
    </div>
  );
}
