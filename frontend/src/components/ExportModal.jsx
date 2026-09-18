import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet, HardDrive, Download, Eye, ExternalLink,
  Check, AlertCircle, X, Loader2, ChevronRight
} from 'lucide-react';

export default function ExportModal({
  isOpen,
  onClose,
  approvedCount,
  authStatus,
  onExportLocal,
  onExportSheets,
  onExportDriveImages
}) {
  const [activeTab, setActiveTab] = useState('local');

  // Local file state
  const [localFilename, setLocalFilename] = useState('Activity_Reports_Export');
  const [localFileType, setLocalFileType] = useState('xlsx');

  // Google Sheets state
  const [sheetsAccount, setSheetsAccount] = useState('primary');
  const [sheetsDestType, setSheetsDestType] = useState('new');
  const [newSheetTitle, setNewSheetTitle] = useState(`Activity Reports ${new Date().toISOString().slice(0, 10)}`);
  const [existingSheets, setExistingSheets] = useState([]);
  const [selectedSheetId, setSelectedSheetId] = useState('');
  const [sheetsPreview, setSheetsPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Drive state
  const [driveYear, setDriveYear] = useState(String(new Date().getFullYear()));

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (activeTab === 'sheets' && sheetsDestType === 'existing' && authStatus?.is_authenticated) {
      fetch(`/api/export/google/sheets/list?account=${sheetsAccount}`)
        .then(res => res.json())
        .then(data => {
          setExistingSheets(data.spreadsheets || []);
          if (data.spreadsheets?.length > 0) setSelectedSheetId(data.spreadsheets[0].id);
        })
        .catch(err => console.error(err));
    }
  }, [activeTab, sheetsDestType, sheetsAccount, authStatus]);

  if (!isOpen) return null;

  const handlePreviewSheets = async () => {
    setPreviewLoading(true);
    try {
      const res = await fetch('/api/export/google/sheets/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destination_type: sheetsDestType,
          spreadsheet_id: selectedSheetId,
          new_title: newSheetTitle
        })
      });
      const data = await res.json();
      setSheetsPreview(data);
    } catch (e) {
      alert("Failed to load preview: " + e.message);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleCommitLocal = () => {
    onExportLocal({ filename: localFilename, file_type: localFileType, mode: 'new' });
  };

  const handleCommitSheets = async () => {
    setIsSubmitting(true);
    try {
      await onExportSheets({
        account: sheetsAccount,
        destination_type: sheetsDestType,
        spreadsheet_id: selectedSheetId,
        new_title: newSheetTitle
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCommitDrive = async () => {
    setIsSubmitting(true);
    try {
      await onExportDriveImages({ account: sheetsAccount, year: driveYear });
    } finally {
      setIsSubmitting(false);
    }
  };

  const TABS = [
    { id: 'local', label: 'Local File (xlsx / csv)', icon: Download },
    { id: 'sheets', label: 'Google Sheets', icon: FileSpreadsheet },
    { id: 'drive', label: 'Google Drive Images', icon: HardDrive },
  ];

  const AuthRequired = () => (
    <div className="flex items-start gap-3 p-4 border border-amber-300 bg-amber-50 rounded text-xs">
      <AlertCircle className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
      <div>
        <div className="font-semibold text-gray-900 mb-0.5">Google Account Required</div>
        <div className="text-gray-600">Sign in with Google using the button in the top navigation bar to enable this export destination.</div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded border border-gray-300 max-w-2xl w-full shadow-xl overflow-hidden flex flex-col max-h-[92vh]">

        {/* Modal header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200 bg-gray-50 shrink-0">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">
              Export Approved Records
            </h3>
            <p className="text-[11px] text-gray-500 mt-0.5">
              {approvedCount} approved record{approvedCount !== 1 ? 's' : ''} · Choose destination and configure options
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 rounded hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab navigation */}
        <div className="flex border-b border-gray-200 shrink-0 overflow-x-auto">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === id
                  ? 'border-[#1a3a5c] text-[#1a3a5c] bg-white'
                  : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Tab body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4 text-xs">

          {/* ── TAB: Local File ── */}
          {activeTab === 'local' && (
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  File Name
                </label>
                <input
                  type="text"
                  value={localFilename}
                  onChange={(e) => setLocalFilename(e.target.value)}
                  className="form-input font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Export Format
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'xlsx', label: 'Excel Workbook (.xlsx)', desc: 'Styled table with frozen headers' },
                    { id: 'csv', label: 'Standard CSV (.csv)', desc: 'Universal comma-separated format' },
                  ].map(({ id, label, desc }) => (
                    <label
                      key={id}
                      className={`flex items-start gap-2.5 border rounded p-3 cursor-pointer transition-colors ${
                        localFileType === id ? 'border-[#1a3a5c] bg-blue-50/30' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="fileType"
                        checked={localFileType === id}
                        onChange={() => setLocalFileType(id)}
                        className="mt-0.5 accent-[#1a3a5c]"
                      />
                      <div>
                        <div className="font-semibold text-gray-800">{label}</div>
                        <div className="text-[11px] text-gray-500 mt-0.5">{desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="p-3 border border-gray-200 bg-gray-50 rounded text-[11px] text-gray-600">
                <strong>Duplicate Protection:</strong> If a file named{' '}
                <code className="font-mono">{localFilename}.{localFileType}</code>{' '}
                already exists, an inspection dialog will prompt you to Append, create a New unique file, or Cancel.
              </div>

              <button
                onClick={handleCommitLocal}
                className="w-full btn-primary justify-center py-2"
              >
                <Download className="w-4 h-4" />
                Verify &amp; Export Local File
              </button>
            </div>
          )}

          {/* ── TAB: Google Sheets ── */}
          {activeTab === 'sheets' && (
            <div className="space-y-4">
              {!authStatus?.is_authenticated ? <AuthRequired /> : (
                <>
                  {/* Account indicator */}
                  <div className="flex items-center justify-between p-3 border border-gray-200 bg-gray-50 rounded">
                    <div className="text-[11px]">
                      <span className="text-gray-500">Signed in as: </span>
                      <span className="font-semibold text-gray-800">
                        {sheetsAccount === 'primary'
                          ? authStatus.primary_user?.email || 'Primary Account'
                          : authStatus.secondary_user?.email || 'Secondary Account'}
                      </span>
                    </div>
                    {authStatus.has_secondary && (
                      <select
                        value={sheetsAccount}
                        onChange={(e) => setSheetsAccount(e.target.value)}
                        className="form-input w-auto ml-2"
                      >
                        <option value="primary">Primary Account</option>
                        <option value="secondary">Secondary Account</option>
                      </select>
                    )}
                  </div>

                  {/* Destination type */}
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      Destination
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'new', label: 'Create New Sheet' },
                        { id: 'existing', label: 'Select Existing Sheet' }
                      ].map(({ id, label }) => (
                        <label
                          key={id}
                          className={`flex items-center gap-2.5 border rounded p-2.5 cursor-pointer transition-colors ${
                            sheetsDestType === id ? 'border-[#1a3a5c] bg-blue-50/30' : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name="sheetDest"
                            checked={sheetsDestType === id}
                            onChange={() => setSheetsDestType(id)}
                            className="accent-[#1a3a5c]"
                          />
                          <span className="font-semibold text-gray-800">{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Target config */}
                  <div>
                    {sheetsDestType === 'new' ? (
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                          New Spreadsheet Title
                        </label>
                        <input
                          type="text"
                          value={newSheetTitle}
                          onChange={(e) => setNewSheetTitle(e.target.value)}
                          className="form-input font-mono"
                        />
                      </div>
                    ) : (
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                          Spreadsheet
                        </label>
                        {existingSheets.length === 0 ? (
                          <input
                            type="text"
                            placeholder="Enter Google Spreadsheet ID (e.g. 1BxiMVs0XRA5...)"
                            value={selectedSheetId}
                            onChange={(e) => setSelectedSheetId(e.target.value)}
                            className="form-input font-mono"
                          />
                        ) : (
                          <select
                            value={selectedSheetId}
                            onChange={(e) => setSelectedSheetId(e.target.value)}
                            className="form-input"
                          >
                            {existingSheets.map(s => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Preview */}
                  <div>
                    <button
                      onClick={handlePreviewSheets}
                      disabled={previewLoading}
                      className="btn-secondary"
                    >
                      {previewLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
                      {previewLoading ? 'Loading preview…' : 'Preview Destination Layout'}
                    </button>
                  </div>

                  {sheetsPreview && (
                    <div className="border border-gray-200 rounded overflow-hidden">
                      <div className="panel-header">
                        <span className="panel-title">Destination Column Preview</span>
                      </div>
                      <div className="overflow-x-auto max-h-40">
                        <table className="text-[10px] border-collapse w-full bg-white">
                          <thead>
                            <tr className="bg-gray-50">
                              {sheetsPreview.headers.map((h, i) => (
                                <th key={i} className="border border-gray-200 px-2 py-1 font-semibold whitespace-nowrap text-gray-700">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {sheetsPreview.preview_rows.map((r, ri) => (
                              <tr key={ri} className="hover:bg-gray-50">
                                {r.map((c, ci) => (
                                  <td key={ci} className="border border-gray-100 px-2 py-1 truncate max-w-[120px] text-gray-600">{c}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  <button
                    disabled={isSubmitting}
                    onClick={handleCommitSheets}
                    className="w-full btn-success justify-center py-2 disabled:opacity-50"
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    {isSubmitting ? 'Writing to Sheets…' : 'Write to Google Sheets'}
                  </button>
                </>
              )}
            </div>
          )}

          {/* ── TAB: Google Drive Images ── */}
          {activeTab === 'drive' && (
            <div className="space-y-4">
              {!authStatus?.is_authenticated ? <AuthRequired /> : (
                <>
                  {/* Folder structure */}
                  <div className="border border-gray-200 rounded overflow-hidden">
                    <div className="panel-header">
                      <span className="panel-title">Drive Folder Architecture</span>
                    </div>
                    <div className="p-3 font-mono text-[11px] text-gray-700 leading-relaxed bg-gray-50">
                      Activity Reports / {driveYear} / &#123;Event_Name&#125; /<br />
                      &nbsp;&nbsp;├── Event_Poster/<br />
                      &nbsp;&nbsp;├── Photos/<br />
                      &nbsp;&nbsp;└── Attendance/
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                      Academic Year
                    </label>
                    <input
                      type="text"
                      value={driveYear}
                      onChange={(e) => setDriveYear(e.target.value)}
                      className="form-input font-mono w-40"
                    />
                  </div>

                  <p className="text-[11px] text-gray-500">
                    Existing filenames and folder hierarchies are automatically inspected to avoid duplicate uploads.
                  </p>

                  <button
                    disabled={isSubmitting}
                    onClick={handleCommitDrive}
                    className="w-full btn-primary justify-center py-2 disabled:opacity-50"
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <HardDrive className="w-4 h-4" />}
                    {isSubmitting ? 'Uploading Images…' : 'Upload Categorized Images to Google Drive'}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
