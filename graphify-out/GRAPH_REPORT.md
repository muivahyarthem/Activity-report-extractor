# Graph Report - Activity-report-extractor  (2026-09-20)

## Corpus Check
- 217 files · ~466,141 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 375 nodes · 702 edges · 15 communities (10 shown, 5 thin omitted)
- Extraction: 51% EXTRACTED · 49% INFERRED · 0% AMBIGUOUS · INFERRED: 343 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Attendance Sheet Images
- Event Photos & Posters
- Export & File Generation
- Frontend Dependencies
- Frontend API & UI
- Backend Dependencies & Config
- Google Sheets & Drive Integration
- Document Extraction Engine
- Frontend Linting Rules
- NAAC Accreditation Framework
- Christ University Institution
- Vercel Deployment Config
- Excel (openpyxl) Library
- Vite React Template
- Drag-Drop Upload UI

## God Nodes (most connected - your core abstractions)
1. `Image Categorization (Event_Poster, Photos, Attendance)` - 182 edges
2. `Cybercrime Awareness Session Activity Report` - 156 edges
3. `get_or_create_session()` - 22 edges
4. `Activity Report Extractor` - 11 edges
5. `commit_sheets_export()` - 10 edges
6. `react` - 10 edges
7. `apiFetch()` - 10 edges
8. `record_to_row()` - 9 edges
9. `export_images_to_drive()` - 9 edges
10. `lucide-react` - 9 edges

## Surprising Connections (you probably didn't know these)
- `Attendance Sheet - attendance_10` --conceptually_related_to--> `Image Categorization (Event_Poster, Photos, Attendance)`  [INFERRED]
  backend/temp/extracted/07915737-0eb6-4bf6-929e-510196378110/Attendance/attendance_10.jpg → README.md
- `Attendance Sheet - attendance_11` --conceptually_related_to--> `Image Categorization (Event_Poster, Photos, Attendance)`  [INFERRED]
  backend/temp/extracted/07915737-0eb6-4bf6-929e-510196378110/Attendance/attendance_11.png → README.md
- `Attendance Sheet - attendance_12` --conceptually_related_to--> `Image Categorization (Event_Poster, Photos, Attendance)`  [INFERRED]
  backend/temp/extracted/07915737-0eb6-4bf6-929e-510196378110/Attendance/attendance_12.jpg → README.md
- `Attendance Sheet - attendance_5` --conceptually_related_to--> `Image Categorization (Event_Poster, Photos, Attendance)`  [INFERRED]
  backend/temp/extracted/07915737-0eb6-4bf6-929e-510196378110/Attendance/attendance_5.jpg → README.md
- `Attendance Sheet - attendance_7` --conceptually_related_to--> `Image Categorization (Event_Poster, Photos, Attendance)`  [INFERRED]
  backend/temp/extracted/07915737-0eb6-4bf6-929e-510196378110/Attendance/attendance_7.jpg → README.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Activity Report Processing Pipeline** — readme_activity_report_extractor, readme_fastapi_backend, readme_vite_frontend, backend_requirements_fastapi, render_yaml_service [INFERRED 0.85]
- **Google API Integration (Sheets + Drive + OAuth)** — readme_google_sheets_export, readme_google_drive_hierarchy, readme_google_oauth_setup, backend_requirements_google_auth [EXTRACTED 1.00]
- **NAAC Accreditation Evidence Framework** — converted_11d453ea_naac_5_1_3, converted_to_follow_naac_criteria_mapping, converted_11d453ea_cybercrime_awareness_session, converted_to_follow_activity_tracking_sheet [EXTRACTED 1.00]

## Communities (15 total, 5 thin omitted)

### Community 0 - "Attendance Sheet Images"
Cohesion: 0.02
Nodes (93): Attendance Sheet - attendance_10, Attendance Sheet - attendance_11, Attendance Sheet - attendance_12, Attendance Sheet - attendance_5, Attendance Sheet - attendance_7, Attendance Sheet - attendance_8, Event Poster - poster_1, Attendance Sheet - attendance_10 (+85 more)

### Community 1 - "Event Photos & Posters"
Cohesion: 0.02
Nodes (93): Attendance Sheet - attendance_4, Attendance Sheet - attendance_6, Attendance Sheet - attendance_9, Event Photo - photo_2, Event Photo - photo_3, Attendance Sheet - attendance_6, Attendance Sheet - attendance_7, Attendance Sheet - attendance_8 (+85 more)

### Community 2 - "Export & File Generation"
Cohesion: 0.09
Nodes (61): apply_to_follow_header_styles(), check_file_collision(), export_csv(), export_excel(), get_unique_filename(), Any, Extracts row values strictly following the 28 columns of to_follow.xlsx., Checks if target file already exists and returns its metadata for the conflict… (+53 more)

### Community 3 - "Frontend Dependencies"
Cohesion: 0.06
Nodes (31): dependencies, axios, lucide-react, react, react-dom, devDependencies, oxlint, tailwindcss (+23 more)

### Community 4 - "Frontend API & UI"
Cohesion: 0.15
Nodes (14): API_BASE_URL, apiFetch(), apiUrl(), App(), TABS, BatchTableReview(), CompletionSummary(), ConflictModal() (+6 more)

### Community 5 - "Backend Dependencies & Config"
Cohesion: 0.10
Nodes (21): FastAPI Web Framework, Google Auth Library, pdfplumber (PDF Text/Table Extractor), PyMuPDF (PDF Image Extractor), python-docx (.docx Parser), Frontend HTML Entry Point, UI Icon/Favicon - favicon, UI Icon/Favicon - icons (+13 more)

### Community 6 - "Google Sheets & Drive Integration"
Cohesion: 0.20
Nodes (14): append_to_spreadsheet(), create_new_spreadsheet(), get_oauth_flow(), get_or_create_drive_folder(), list_user_spreadsheets(), Any, Finds or creates a folder under a parent folder., Creates the hierarchy: Activity Reports / 2026 / {Event_Name} / ├──… (+6 more)

### Community 7 - "Document Extraction Engine"
Cohesion: 0.46
Nodes (7): clean_text(), extract_document(), extract_from_docx(), extract_from_pdf(), Any, Extracts the 8 specific fields and images from a DOCX activity report. Excludes…, Extracts text and images from PDF using pdfplumber & PyMuPDF. Excludes Feedback…

### Community 8 - "Frontend Linting Rules"
Cohesion: 0.33
Nodes (5): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema

### Community 9 - "NAAC Accreditation Framework"
Cohesion: 0.40
Nodes (5): NAAC Criteria 5.1.3 Awareness Program, Activity Tracking Master Sheet (to_follow.xlsx), Graduate Attribute Mapping, NAAC Criteria/Standard Mapping, Strategic Plan Standard Mapping

## Knowledge Gaps
- **86 isolated node(s):** `$schema`, `plugins`, `react/rules-of-hooks`, `react/only-export-components`, `name` (+81 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 117 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Image Categorization (Event_Poster, Photos, Attendance)` connect `Event Photos & Posters` to `Attendance Sheet Images`, `Backend Dependencies & Config`?**
  _High betweenness centrality (0.190) - this node is a cross-community bridge._
- **Why does `Cybercrime Awareness Session Activity Report` connect `Attendance Sheet Images` to `Event Photos & Posters`, `Christ University Institution`, `Backend Dependencies & Config`, `NAAC Accreditation Framework`?**
  _High betweenness centrality (0.132) - this node is a cross-community bridge._
- **Why does `Activity Report Extractor` connect `Backend Dependencies & Config` to `Attendance Sheet Images`, `Event Photos & Posters`?**
  _High betweenness centrality (0.058) - this node is a cross-community bridge._
- **Are the 180 inferred relationships involving `Image Categorization (Event_Poster, Photos, Attendance)` (e.g. with `Attendance Sheet - attendance_10` and `Attendance Sheet - attendance_11`) actually correct?**
  _`Image Categorization (Event_Poster, Photos, Attendance)` has 180 INFERRED edges - model-reasoned connections that need verification._
- **Are the 151 inferred relationships involving `Cybercrime Awareness Session Activity Report` (e.g. with `Attendance Sheet - attendance_10` and `Attendance Sheet - attendance_11`) actually correct?**
  _`Cybercrime Awareness Session Activity Report` has 151 INFERRED edges - model-reasoned connections that need verification._
- **What connects `$schema`, `plugins`, `react/rules-of-hooks` to the rest of the system?**
  _86 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Attendance Sheet Images` be split into smaller, more focused modules?**
  _Cohesion score 0.021505376344086023 - nodes in this community are weakly interconnected._