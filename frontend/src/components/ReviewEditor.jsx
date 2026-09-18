import React, { useState, useEffect } from 'react';
import {
  Check, Save, ArrowLeft, Image as ImageIcon,
  CheckCircle2, Tag, Loader2
} from 'lucide-react';
import { apiFetch, apiUrl } from '../api';

/* ── Shared input components with fully inlined styles ── */
function FieldLabel({ children }) {
  return (
    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
      {children}
    </label>
  );
}

function TextInput({ value, onChange, placeholder = '' }) {
  return (
    <input
      type="text"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="w-full px-3 py-1.5 border border-gray-300 rounded bg-white text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#1a3a5c] focus:ring-2 focus:ring-[#1a3a5c]/20 transition-colors"
    />
  );
}

function TextArea({ value, onChange, rows = 3, placeholder = '' }) {
  return (
    <textarea
      rows={rows}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="w-full px-3 py-1.5 border border-gray-300 rounded bg-white text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#1a3a5c] focus:ring-2 focus:ring-[#1a3a5c]/20 transition-colors resize-y leading-relaxed"
    />
  );
}

function SectionPanel({ number, title, children }) {
  return (
    <div className="bg-white border border-gray-300 rounded-md shadow-sm overflow-hidden">
      <div className="bg-gray-100 border-b border-gray-300 px-4 py-2.5 flex items-center gap-2">
        <span className="w-5 h-5 rounded bg-[#1a3a5c] text-white text-xs font-bold flex items-center justify-center shrink-0">
          {number}
        </span>
        <h4 className="text-sm font-semibold text-gray-800">{title}</h4>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function SubGroup({ label, color, children }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-800 border-blue-300',
    purple: 'bg-purple-50 text-purple-800 border-purple-300',
    teal: 'bg-teal-50 text-teal-800 border-teal-300',
  };
  return (
    <div className="space-y-2">
      <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-semibold border rounded ${colors[color] || 'bg-gray-100 text-gray-700 border-gray-300'}`}>
        <Tag className="w-3 h-3" />
        {label}
      </div>
      {children}
    </div>
  );
}

/* ── Main Component ── */
export default function ReviewEditor({ docId, onBack, onDocApproved }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [docData, setDocData] = useState(null);
  const [fields, setFields] = useState(null);
  const [images, setImages] = useState([]);
  const [activeImageCategory, setActiveImageCategory] = useState('ALL');
  const [activePanel, setActivePanel] = useState('fields');

  useEffect(() => {
    if (!docId) return;
    setLoading(true);
    setSaveMsg('');
    apiFetch(`/api/review/${docId}`)
      .then(res => res.json())
      .then(data => {
        setDocData(data);
        setFields(data.fields || {});
        setImages(data.images || []);
        setLoading(false);
      })
      .catch(err => { alert("Error loading document: " + err.message); setLoading(false); });
  }, [docId]);

  const handleAcademicChange = (group, key, val) =>
    setFields(prev => ({ ...prev, academic_mapping: { ...prev.academic_mapping, [group]: { ...prev.academic_mapping?.[group], [key]: val } } }));

  const handleGeneralChange = (key, val) =>
    setFields(prev => ({ ...prev, general_information: { ...prev.general_information, [key]: val } }));

  const handleSpeakerChange = (key, val) =>
    setFields(prev => ({ ...prev, speaker_details: { ...prev.speaker_details, [key]: val } }));

  const handleParticipantChange = (key, val) =>
    setFields(prev => ({ ...prev, participant_profile: { ...prev.participant_profile, [key]: val } }));

  const handleRapporteurChange = (key, val) =>
    setFields(prev => ({ ...prev, rapporteur_details: { ...prev.rapporteur_details, [key]: val } }));

  const handleFieldChange = (key, val) =>
    setFields(prev => ({ ...prev, [key]: val }));

  const handleCategoryChange = (imgId, newCategory) =>
    setImages(prev => prev.map(img => img.id === imgId ? { ...img, category: newCategory } : img));

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      const res = await apiFetch(`/api/review/${docId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields, images })
      });
      if (res.ok) { setSaveMsg('Draft saved successfully.'); setTimeout(() => setSaveMsg(''), 3000); }
    } catch (e) { alert("Failed to save draft: " + e.message); }
    finally { setSaving(false); }
  };

  const handleApprove = async () => {
    setSaving(true);
    try {
      await apiFetch(`/api/review/${docId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields, images })
      });
      const res = await apiFetch(`/api/review/${docId}/approve`, { method: 'POST' });
      if (res.ok) onDocApproved(docId);
    } catch (e) { alert("Failed to approve document: " + e.message); }
    finally { setSaving(false); }
  };

  if (loading) {
    return (
      <div className="bg-white border border-gray-300 rounded-md shadow-sm flex items-center justify-center py-20 gap-3 text-gray-500 text-sm">
        <Loader2 className="w-5 h-5 animate-spin text-[#1a3a5c]" />
        Loading document data…
      </div>
    );
  }

  const isApproved = docData?.status === 'approved';
  const filteredImages = activeImageCategory === 'ALL'
    ? images
    : images.filter(img => img.category === activeImageCategory);
  const IMAGE_CATS = ['ALL', 'Event_Poster', 'Photos', 'Attendance'];
  const catCount = (cat) => cat === 'ALL' ? images.length : images.filter(i => i.category === cat).length;

  return (
    <div className="space-y-3">

      {/* ── Document action header ── */}
      <div className="bg-white border border-gray-300 rounded-md shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          {/* Left: back + doc info */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back to Batch</span>
            </button>
            <span className="text-gray-300 hidden sm:inline">|</span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate max-w-sm" title={docData?.filename}>
                {docData?.filename}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                28-column standard template · to_follow.xlsx format
              </p>
            </div>
            {isApproved ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 border border-green-300 rounded shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5" />Approved
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 border border-blue-300 rounded shrink-0">
                Pending Review
              </span>
            )}
          </div>

          {/* Right: action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {saveMsg && <span className="text-sm text-green-700 font-medium">{saveMsg}</span>}
            <button
              disabled={saving}
              onClick={handleSaveDraft}
              className="flex items-center gap-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium px-3.5 py-1.5 rounded shadow-sm transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Draft
            </button>
            <button
              disabled={saving || isApproved}
              onClick={handleApprove}
              className="flex items-center gap-1.5 bg-[#1e6641] hover:bg-[#185535] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-1.5 rounded shadow-sm transition-colors"
            >
              <Check className="w-4 h-4" />
              {isApproved ? 'Already Approved' : 'Approve Record'}
            </button>
          </div>
        </div>

        {/* Mobile panel toggle */}
        <div className="flex border-t border-gray-200 lg:hidden">
          {['fields', 'images'].map(p => (
            <button
              key={p}
              onClick={() => setActivePanel(p)}
              className={`flex-1 py-2 text-sm font-medium transition-colors capitalize ${
                activePanel === p
                  ? 'bg-[#1a3a5c] text-white'
                  : 'bg-gray-50 text-gray-600 hover:text-gray-900'
              }`}
            >
              {p === 'images' ? `Images (${images.length})` : 'Extracted Fields'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Two-panel layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] xl:grid-cols-[1fr_360px] gap-3">

        {/* ── LEFT: Fields form ── */}
        <div className={`space-y-3 ${activePanel === 'images' ? 'hidden lg:block' : ''}`}>

          {/* § 1 Academic Mapping */}
          <SectionPanel number="1" title="Criteria & Academic Mapping">
            <div className="space-y-4">
              <SubGroup label="NAAC Mapping" color="blue">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div><FieldLabel>Criteria / Focus Area No.</FieldLabel><TextInput value={fields?.academic_mapping?.naac?.criteria || ''} onChange={e => handleAcademicChange('naac','criteria',e.target.value)} placeholder="e.g. 5" /></div>
                  <div><FieldLabel>Sub-Criteria No.</FieldLabel><TextInput value={fields?.academic_mapping?.naac?.sub_criteria_no || ''} onChange={e => handleAcademicChange('naac','sub_criteria_no',e.target.value)} placeholder="e.g. 5.1.3" /></div>
                  <div><FieldLabel>Sub-Criteria Title</FieldLabel><TextInput value={fields?.academic_mapping?.naac?.sub_criteria_title || ''} onChange={e => handleAcademicChange('naac','sub_criteria_title',e.target.value)} placeholder="e.g. Awareness Program" /></div>
                </div>
              </SubGroup>

              <div className="border-t border-gray-200 pt-4">
                <SubGroup label="Strategic Plan" color="purple">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div><FieldLabel>Criteria / Focus Area No.</FieldLabel><TextInput value={fields?.academic_mapping?.strategic_plan?.criteria || ''} onChange={e => handleAcademicChange('strategic_plan','criteria',e.target.value)} placeholder="e.g. 3" /></div>
                    <div><FieldLabel>Sub-Criteria No.</FieldLabel><TextInput value={fields?.academic_mapping?.strategic_plan?.sub_criteria_no || ''} onChange={e => handleAcademicChange('strategic_plan','sub_criteria_no',e.target.value)} placeholder="e.g. 3.2" /></div>
                    <div><FieldLabel>Sub-Criteria Title</FieldLabel><TextInput value={fields?.academic_mapping?.strategic_plan?.sub_criteria_title || ''} onChange={e => handleAcademicChange('strategic_plan','sub_criteria_title',e.target.value)} placeholder="e.g. Campus experience" /></div>
                  </div>
                </SubGroup>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <SubGroup label="Graduate Attribute" color="teal">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div><FieldLabel>Criteria / Focus Area No.</FieldLabel><TextInput value={fields?.academic_mapping?.graduate_attribute?.criteria || ''} onChange={e => handleAcademicChange('graduate_attribute','criteria',e.target.value)} /></div>
                    <div><FieldLabel>Sub-Criteria No.</FieldLabel><TextInput value={fields?.academic_mapping?.graduate_attribute?.sub_criteria_no || ''} onChange={e => handleAcademicChange('graduate_attribute','sub_criteria_no',e.target.value)} /></div>
                    <div><FieldLabel>Sub-Criteria Title</FieldLabel><TextInput value={fields?.academic_mapping?.graduate_attribute?.sub_criteria_title || ''} onChange={e => handleAcademicChange('graduate_attribute','sub_criteria_title',e.target.value)} placeholder="e.g. Societal (Law Abiding)" /></div>
                  </div>
                </SubGroup>
              </div>
            </div>
          </SectionPanel>

          {/* § 2 General Information */}
          <SectionPanel number="2" title="General Information">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <FieldLabel>Title of the Activity</FieldLabel>
                <TextInput value={fields?.general_information?.title || ''} onChange={e => handleGeneralChange('title', e.target.value)} />
              </div>
              <div>
                <FieldLabel>Type of Activity</FieldLabel>
                <TextInput value={fields?.general_information?.type || ''} onChange={e => handleGeneralChange('type', e.target.value)} />
              </div>
              <div>
                <FieldLabel>Date(s)</FieldLabel>
                <TextInput value={fields?.general_information?.date || ''} onChange={e => handleGeneralChange('date', e.target.value)} />
              </div>
              <div>
                <FieldLabel>Time</FieldLabel>
                <TextInput value={fields?.general_information?.time || ''} onChange={e => handleGeneralChange('time', e.target.value)} />
              </div>
              <div>
                <FieldLabel>Venue</FieldLabel>
                <TextInput value={fields?.general_information?.venue || ''} onChange={e => handleGeneralChange('venue', e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <FieldLabel>Collaboration / Sponsor</FieldLabel>
                <TextInput value={fields?.general_information?.collaboration || ''} onChange={e => handleGeneralChange('collaboration', e.target.value)} />
              </div>
            </div>
          </SectionPanel>

          {/* § 3 Speaker Details */}
          <SectionPanel number="3" title="Speaker / Guest / Presenter Details">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <FieldLabel>Speaker Name</FieldLabel>
                <TextInput value={fields?.speaker_details?.name || ''} onChange={e => handleSpeakerChange('name', e.target.value)} />
              </div>
              <div>
                <FieldLabel>Title / Position</FieldLabel>
                <TextInput value={fields?.speaker_details?.position || ''} onChange={e => handleSpeakerChange('position', e.target.value)} />
              </div>
              <div>
                <FieldLabel>Organization / Affiliation</FieldLabel>
                <TextInput value={fields?.speaker_details?.organization || ''} onChange={e => handleSpeakerChange('organization', e.target.value)} />
              </div>
              <div>
                <FieldLabel>Presentation Title</FieldLabel>
                <TextInput value={fields?.speaker_details?.presentation_title || ''} onChange={e => handleSpeakerChange('presentation_title', e.target.value)} />
              </div>
            </div>
          </SectionPanel>

          {/* § 4 Participant Profile */}
          <SectionPanel number="4" title="Participant Profile">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <FieldLabel>Type of Participants</FieldLabel>
                <TextInput value={fields?.participant_profile?.participant_type || ''} onChange={e => handleParticipantChange('participant_type', e.target.value)} />
              </div>
              <div>
                <FieldLabel>No. of Participants</FieldLabel>
                <TextInput value={fields?.participant_profile?.participant_count || ''} onChange={e => handleParticipantChange('participant_count', e.target.value)} />
              </div>
            </div>
          </SectionPanel>

          {/* § 5 Synopsis */}
          <SectionPanel number="5" title="Synopsis of the Activity">
            <div className="space-y-3">
              <div>
                <FieldLabel>Highlights of the Activity</FieldLabel>
                <TextArea rows={3} value={fields?.highlights || ''} onChange={e => handleFieldChange('highlights', e.target.value)} placeholder="Key highlights of the event…" />
              </div>
              <div>
                <FieldLabel>Key Objectives / Takeaways</FieldLabel>
                <TextArea rows={3} value={fields?.key_objectives || ''} onChange={e => handleFieldChange('key_objectives', e.target.value)} placeholder="Objectives and takeaways…" />
              </div>
              <div>
                <FieldLabel>Summary of the Activity</FieldLabel>
                <TextArea rows={4} value={fields?.summary || ''} onChange={e => handleFieldChange('summary', e.target.value)} placeholder="Narrative summary…" />
              </div>
              <div>
                <FieldLabel>Follow-up Plan</FieldLabel>
                <TextInput value={fields?.follow_up_plan || ''} onChange={e => handleFieldChange('follow_up_plan', e.target.value)} placeholder="None or next steps…" />
              </div>
            </div>
          </SectionPanel>

          {/* § 6 Rapporteur */}
          <SectionPanel number="6" title="Rapporteur Details">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <FieldLabel>Name of the Rapporteur</FieldLabel>
                <TextInput value={fields?.rapporteur_details?.name || ''} onChange={e => handleRapporteurChange('name', e.target.value)} placeholder="e.g. Rapporteur Name" />
              </div>
              <div>
                <FieldLabel>Email and Contact No.</FieldLabel>
                <TextInput value={fields?.rapporteur_details?.contact || ''} onChange={e => handleRapporteurChange('contact', e.target.value)} placeholder="e.g. rapporteur@christuniversity.in" />
              </div>
            </div>
          </SectionPanel>
        </div>

        {/* ── RIGHT: Extracted Images ── */}
        <div className={`${activePanel === 'fields' ? 'hidden lg:block' : ''}`}>
          <div className="bg-white border border-gray-300 rounded-md shadow-sm overflow-hidden">
            <div className="bg-gray-100 border-b border-gray-300 px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-semibold text-gray-800">Extracted Images</span>
              </div>
              <span className="text-xs text-gray-500">{images.length} found</span>
            </div>

            {/* Category tabs */}
            <div className="flex border-b border-gray-200 overflow-x-auto">
              {IMAGE_CATS.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveImageCategory(cat)}
                  className={`flex-1 min-w-fit px-2.5 py-2 text-xs font-medium whitespace-nowrap transition-colors border-b-2 ${
                    activeImageCategory === cat
                      ? 'border-[#1a3a5c] text-[#1a3a5c] bg-white'
                      : 'border-transparent text-gray-500 bg-gray-50 hover:text-gray-800'
                  }`}
                >
                  {cat.replace('_', ' ')}
                  <span className="ml-1 text-gray-400">({catCount(cat)})</span>
                </button>
              ))}
            </div>

            {/* Image list */}
            <div className="p-3 space-y-2 overflow-y-auto max-h-[calc(100vh-300px)]">
              {filteredImages.length === 0 ? (
                <div className="py-10 text-center">
                  <ImageIcon className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm text-gray-400">No images in this category.</p>
                </div>
              ) : (
                filteredImages.map((img) => (
                  <div key={img.id} className="border border-gray-200 rounded overflow-hidden bg-gray-50">
                    <div className="bg-gray-100 aspect-video flex items-center justify-center overflow-hidden">
                      <img
                        src={apiUrl(img.web_url)}
                        alt={img.filename}
                        className="max-h-full max-w-full object-contain"
                        loading="lazy"
                      />
                    </div>
                    <div className="flex items-center justify-between px-2.5 py-1.5 gap-2 bg-white border-t border-gray-200">
                      <span className="text-xs text-gray-500 font-mono truncate max-w-[110px]" title={img.filename}>
                        {img.filename}
                      </span>
                      <select
                        value={img.category}
                        onChange={(e) => handleCategoryChange(img.id, e.target.value)}
                        className="text-xs bg-white border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-[#1a3a5c]"
                      >
                        <option value="Event_Poster">Event Poster</option>
                        <option value="Photos">Photos</option>
                        <option value="Attendance">Attendance</option>
                      </select>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
