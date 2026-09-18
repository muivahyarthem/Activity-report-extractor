import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import UploadQueue from './components/UploadQueue';
import ReviewEditor from './components/ReviewEditor';
import BatchTableReview from './components/BatchTableReview';
import ExportModal from './components/ExportModal';
import ConflictModal from './components/ConflictModal';
import CompletionSummary from './components/CompletionSummary';
import { Upload, TableProperties, CheckCircle2 } from 'lucide-react';
import { apiFetch, apiUrl } from './api';

const TABS = [
  { id: 'queue', label: 'Upload & Queue', icon: Upload },
  { id: 'batch', label: 'Batch Review', icon: TableProperties },
];

export default function App() {
  const [authStatus, setAuthStatus] = useState(null);
  const [queue, setQueue] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [activeView, setActiveView] = useState('queue'); // 'queue' | 'batch' | 'editor' | 'summary'

  // Modals
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [collisionInfo, setCollisionInfo] = useState(null);
  const [pendingLocalExport, setPendingLocalExport] = useState(null);
  const [exportResult, setExportResult] = useState(null);

  const fetchAuthStatus = () => {
    apiFetch('/api/auth/status')
      .then(res => res.json())
      .then(data => setAuthStatus(data))
      .catch(err => console.error("Error fetching auth:", err));
  };

  const fetchQueue = () => {
    apiFetch('/api/documents/queue')
      .then(res => res.json())
      .then(data => setQueue(data.documents || []))
      .catch(err => console.error("Error fetching queue:", err));
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlSessionId = params.get('session_id');
    if (urlSessionId) {
      localStorage.setItem('activity_extractor_session_id', urlSessionId);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    fetchAuthStatus();
    fetchQueue();
  }, []);

  const handleLogout = async () => {
    await apiFetch('/api/auth/logout', { method: 'POST' });
    fetchAuthStatus();
  };

  const handleUploadFiles = async (fileList) => {
    const formData = new FormData();
    for (let i = 0; i < fileList.length; i++) {
      formData.append('files', fileList[i]);
    }
    try {
      const res = await apiFetch('/api/documents/upload', { method: 'POST', body: formData });
      if (res.ok) fetchQueue();
    } catch (e) {
      alert("Failed to upload files: " + e.message);
    }
  };

  const handleRemoveDoc = async (docId) => {
    try {
      await apiFetch(`/api/documents/${docId}`, { method: 'DELETE' });
      fetchQueue();
      if (selectedDocId === docId) {
        setSelectedDocId(null);
        setActiveView('queue');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleStartExtraction = async () => {
    setIsProcessing(true);
    try {
      const res = await apiFetch('/api/extract/run', { method: 'POST' });
      if (res.ok) {
        fetchQueue();
        setActiveView('batch');
      }
    } catch (e) {
      alert("Extraction error: " + e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSelectDoc = (docId) => {
    setSelectedDocId(docId);
    setActiveView('editor');
  };

  const handleDocApproved = (docId) => {
    fetchQueue();
    setActiveView('batch');
  };

  const handleApproveAll = async () => {
    try {
      const res = await apiFetch('/api/review/approve-all', { method: 'POST' });
      if (res.ok) fetchQueue();
    } catch (e) {
      alert("Error approving all: " + e.message);
    }
  };

  const handleExportLocal = async (config) => {
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append('filename', config.filename || 'Activity_Reports_Export');
      formData.append('file_type', config.file_type || 'xlsx');
      formData.append('mode', config.mode || 'new');
      if (config.existing_file) {
        formData.append('existing_file', config.existing_file);
      }

      const res = await apiFetch('/api/export/file', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        // Automatically trigger download directly to user's system
        const downloadUrl = apiUrl(data.download_url);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = data.file_name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setIsExportModalOpen(false);
        setCollisionInfo(null);
        setPendingLocalExport(null);
        setExportResult({
          message: data.mode === 'append'
            ? `Successfully appended ${data.exported_count} approved records to ${data.file_name} and saved to your system.`
            : `Successfully generated ${data.file_name} with ${data.exported_count} approved records and saved to your system.`,
          file_name: data.file_name,
          download_url: downloadUrl
        });
        setActiveView('summary');
      } else {
        alert("Export error: " + (data.detail || "Failed to export."));
      }
    } catch (e) {
      alert("Export failed: " + e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const executeLocalExport = async (config, mode) => {
    handleExportLocal({ ...config, mode });
  };

  const handleExportSheets = async (config) => {
    try {
      const res = await apiFetch('/api/export/google/sheets/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      const data = await res.json();
      if (res.ok) {
        setIsExportModalOpen(false);
        setExportResult({
          message: `Successfully wrote ${data.exported_count} approved records to Google Sheets.`,
          spreadsheet_url: data.spreadsheet_url
        });
        setActiveView('summary');
      } else {
        alert("Sheets export failed: " + data.detail);
      }
    } catch (e) {
      alert("Sheets export error: " + e.message);
    }
  };

  const handleExportDriveImages = async (config) => {
    try {
      const res = await apiFetch('/api/export/google/drive/images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      const data = await res.json();
      if (res.ok) {
        setIsExportModalOpen(false);
        setExportResult({
          message: "Uploaded categorized images to Google Drive according to standard folder architecture.",
          drive_results: data.results
        });
        setActiveView('summary');
      } else {
        alert("Drive export error: " + data.detail);
      }
    } catch (e) {
      alert("Drive upload error: " + e.message);
    }
  };

  const approvedCount = queue.filter(d => d.status === 'approved').length;
  const showTabs = activeView !== 'summary' && activeView !== 'editor';

  return (
    <div className="min-h-screen bg-[#f1f3f5] flex flex-col">
      <Navbar
        authStatus={authStatus}
        onRefreshAuth={fetchAuthStatus}
        onLogout={handleLogout}
      />

      {/* ── Secondary toolbar (tabs + export action) ── */}
      {showTabs && (
        <div className="bg-white border-b border-gray-200 sticky top-11 z-20 shadow-sm">
          <div className="max-w-screen-xl mx-auto px-4 sm:px-6 flex items-center justify-between h-9">
            {/* Tab navigation */}
            <nav className="flex items-center h-full">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveView(id)}
                  className={`h-full flex items-center gap-1.5 px-3 text-xs font-medium border-b-2 transition-colors ${
                    activeView === id
                      ? 'border-[#1a3a5c] text-[#1a3a5c]'
                      : 'border-transparent text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                  {id === 'queue' && queue.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-semibold">
                      {queue.length}
                    </span>
                  )}
                  {id === 'batch' && approvedCount > 0 && (
                    <span className="ml-1 flex items-center gap-0.5 px-1.5 py-0.5 bg-green-100 text-green-800 rounded text-[10px] font-semibold">
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      {approvedCount}
                    </span>
                  )}
                </button>
              ))}
            </nav>

            {/* Export action */}
            {approvedCount > 0 && (
              <button
                onClick={() => setIsExportModalOpen(true)}
                className="btn-primary"
              >
                Export Approved ({approvedCount})
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Page content ── */}
      <main className="flex-1 max-w-screen-xl w-full mx-auto px-4 sm:px-6 py-4">
        {activeView === 'queue' && (
          <UploadQueue
            queue={queue}
            onUploadFiles={handleUploadFiles}
            onRemoveDoc={handleRemoveDoc}
            onStartExtraction={handleStartExtraction}
            isProcessing={isProcessing}
            onSelectDoc={handleSelectDoc}
          />
        )}

        {activeView === 'batch' && (
          <BatchTableReview
            documents={queue}
            onSelectDoc={handleSelectDoc}
            onApproveAll={handleApproveAll}
            onProceedToExport={() => setIsExportModalOpen(true)}
          />
        )}

        {activeView === 'editor' && (
          <ReviewEditor
            docId={selectedDocId}
            onBack={() => setActiveView(queue.some(d => d.status === 'extracted') ? 'batch' : 'queue')}
            onDocApproved={handleDocApproved}
          />
        )}

        {activeView === 'summary' && (
          <CompletionSummary
            result={exportResult}
            onReset={() => {
              setExportResult(null);
              fetchQueue();
              setActiveView('queue');
            }}
          />
        )}
      </main>

      {/* ── Modals ── */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        approvedCount={approvedCount}
        authStatus={authStatus}
        onExportLocal={handleExportLocal}
        onExportSheets={handleExportSheets}
        onExportDriveImages={handleExportDriveImages}
      />

      <ConflictModal
        collisionInfo={collisionInfo}
        onAppend={() => pendingLocalExport && executeLocalExport(pendingLocalExport, 'append')}
        onCreateNew={() => pendingLocalExport && executeLocalExport(pendingLocalExport, 'new')}
        onCancel={() => {
          setCollisionInfo(null);
          setPendingLocalExport(null);
        }}
      />
    </div>
  );
}
