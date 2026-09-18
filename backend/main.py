import os
import uuid
import shutil
import json
from typing import Dict, Any, List, Optional
from datetime import datetime
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Response, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse, FileResponse
from pydantic import BaseModel

from extractor import extract_document
from exporter import check_file_collision, export_csv, export_excel, COMBINED_HEADERS, record_to_row
import google_service

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(BASE_DIR)
FRONTEND_DIST = os.path.join(REPO_ROOT, "frontend", "dist")
TEMP_DIR = os.path.join(BASE_DIR, "temp")
UPLOADS_DIR = os.path.join(TEMP_DIR, "uploads")
EXTRACTED_DIR = os.path.join(TEMP_DIR, "extracted")
EXPORTS_DIR = os.path.join(TEMP_DIR, "exports")

for d in [UPLOADS_DIR, EXTRACTED_DIR, EXPORTS_DIR]:
    os.makedirs(d, exist_ok=True)

app = FastAPI(title="Document-to-Data Automation API")

# Allow frontend CORS (supports local dev and any Vercel deployment URL)
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "https://activity-report-extractor.vercel.app",
]
env_frontend = os.environ.get("RENDER_FRONTEND_URL")
if env_frontend and env_frontend not in origins:
    origins.append(env_frontend.rstrip("/"))

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"^https:\/\/.*\.vercel\.app$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["x-session-id", "Content-Disposition"],
)

# Static file serving for image thumbnails
app.mount("/static/extracted", StaticFiles(directory=EXTRACTED_DIR), name="static_extracted")

@app.get("/")
def root():
    return {
        "status": "online",
        "service": "Activity Report Extractor API",
        "message": "API is up and running"
    }

# ----------------- In-Memory Session State (Zero Database) -----------------
# Schema:
# SESSIONS[session_id] = {
#     "documents": {
#         doc_id: {
#             "id": doc_id,
#             "filename": original_filename,
#             "filepath": saved_path,
#             "status": "queued" | "processing" | "extracted" | "approved" | "error",
#             "error": str,
#             "fields": {...},
#             "images": [...]
#         }
#     },
#     "google_auth": { "primary": {...}, "secondary": {...} }
# }
SESSIONS: Dict[str, Dict[str, Any]] = {}

def get_or_create_session(request: Request, response: Response) -> Dict[str, Any]:
    # Support both custom header (bulletproof across domains) and cookies
    session_id = request.headers.get("x-session-id") or request.cookies.get("session_id")
    if not session_id or session_id not in SESSIONS:
        session_id = str(uuid.uuid4())
        SESSIONS[session_id] = {
            "documents": {},
            "google_auth": {}
        }

    # Set cross-site cookie if possible (HTTPS in production)
    try:
        response.set_cookie(
            key="session_id",
            value=session_id,
            httponly=True,
            samesite="none",
            secure=True
        )
    except Exception:
        pass

    # Expose session ID in response header so frontend can store in localStorage
    response.headers["x-session-id"] = session_id
    return SESSIONS[session_id]

# ----------------- Google OAuth Config Loader -----------------
def load_google_client_config() -> Optional[Dict[str, Any]]:
    # 1. Check file paths (local backend folder, repo root, custom path, or Render secret file)
    possible_paths = [
        os.path.join(BASE_DIR, "credentials.json"),
        os.path.join(REPO_ROOT, "credentials.json"),
        os.environ.get("CREDENTIALS_FILE_PATH"),
        os.environ.get("GOOGLE_APPLICATION_CREDENTIALS"),
        "/etc/secrets/credentials.json",
    ]
    for p in possible_paths:
        if p and os.path.exists(p):
            try:
                with open(p, "r", encoding="utf-8") as f:
                    cfg = json.load(f)
                    print(f"Loaded Google OAuth config from file: {p}")
                    return cfg
            except Exception as e:
                print(f"Error reading credentials file {p}: {e}")

    # 2. Raw JSON string from environment variable (useful on Render/cloud hosts)
    env_json = os.environ.get("GOOGLE_CREDENTIALS_JSON") or os.environ.get("GOOGLE_CLIENT_CONFIG")
    if env_json:
        try:
            cfg = json.loads(env_json)
            print("Loaded Google OAuth config from GOOGLE_CREDENTIALS_JSON environment variable")
            return cfg
        except Exception as e:
            print(f"Error parsing GOOGLE_CREDENTIALS_JSON: {e}")

    # 3. Direct client ID & secret environment variables
    client_id = os.environ.get("GOOGLE_CLIENT_ID")
    client_secret = os.environ.get("GOOGLE_CLIENT_SECRET")
    if client_id and client_secret:
        print("Constructed Google OAuth config from GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET")
        return {
            "web": {
                "client_id": client_id,
                "client_secret": client_secret,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
            }
        }

    return None

GOOGLE_CLIENT_CONFIG = load_google_client_config()

# ----------------- Routes: Auth -----------------

@app.get("/api/auth/status")
def auth_status(request: Request, response: Response):
    session = get_or_create_session(request, response)
    has_oauth_config = GOOGLE_CLIENT_CONFIG is not None
    primary_auth = session.get("google_auth", {}).get("primary")
    secondary_auth = session.get("google_auth", {}).get("secondary")
    return {
        "oauth_configured": has_oauth_config,
        "is_authenticated": primary_auth is not None,
        "primary_user": primary_auth.get("user") if primary_auth else None,
        "has_secondary": secondary_auth is not None,
        "secondary_user": secondary_auth.get("user") if secondary_auth else None,
    }

@app.get("/api/auth/google/login")
def google_login(account_type: str = "primary", request: Request = None):
    """
    Generates OAuth login URL. account_type can be 'primary' or 'secondary'.
    """
    if not GOOGLE_CLIENT_CONFIG:
        return JSONResponse(
            status_code=400,
            content={"error": "credentials.json not found on server. Please add credentials.json or configure GOOGLE_CREDENTIALS_JSON."}
        )
    backend_url = os.environ.get("RENDER_BACKEND_URL")
    if not backend_url and request:
        backend_url = str(request.base_url).rstrip("/")
    if not backend_url:
        backend_url = "http://localhost:8000"
    redirect_uri = f"{backend_url}/api/auth/google/callback"
    flow = google_service.get_oauth_flow(GOOGLE_CLIENT_CONFIG, redirect_uri)
    auth_url, _ = flow.authorization_url(
        access_type="offline",
        prompt="consent",
        state=account_type
    )
    return {"auth_url": auth_url}

@app.get("/api/auth/google/callback")
def google_callback(code: str, state: str, request: Request, response: Response):
    if not GOOGLE_CLIENT_CONFIG:
        raise HTTPException(status_code=400, detail="Google credentials not configured.")
    backend_url = os.environ.get("RENDER_BACKEND_URL")
    if not backend_url and request:
        backend_url = str(request.base_url).rstrip("/")
    if not backend_url:
        backend_url = "http://localhost:8000"
    redirect_uri = f"{backend_url}/api/auth/google/callback"
    flow = google_service.get_oauth_flow(GOOGLE_CLIENT_CONFIG, redirect_uri)
    flow.fetch_token(code=code)
    creds = flow.credentials

    # User profile lookup
    import requests
    user_info = {}
    try:
        r = requests.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {creds.token}"}
        )
        if r.ok:
            user_info = r.json()
    except Exception:
        pass

    session = get_or_create_session(request, response)
    target_key = "secondary" if state == "secondary" else "primary"
    session["google_auth"][target_key] = {
        "token": creds.token,
        "refresh_token": creds.refresh_token,
        "token_uri": creds.token_uri,
        "client_id": creds.client_id,
        "client_secret": creds.client_secret,
        "scopes": creds.scopes,
        "user": user_info
    }

    # Redirect user back to frontend app
    frontend_url = os.environ.get("RENDER_FRONTEND_URL", "http://localhost:5173").rstrip("/")
    return Response(
        status_code=302,
        headers={"Location": f"{frontend_url}/?auth_success=1"}
    )

@app.post("/api/auth/logout")
def logout(request: Request, response: Response):
    session = get_or_create_session(request, response)
    session["google_auth"] = {}
    return {"message": "Logged out successfully"}

# ----------------- Routes: Document Upload & Queue -----------------

@app.post("/api/documents/upload")
async def upload_documents(
    files: List[UploadFile] = File(...),
    request: Request = None,
    response: Response = None
):
    session = get_or_create_session(request, response)
    queued_docs = []

    for file in files:
        ext = os.path.splitext(file.filename)[1].lower()
        if ext not in [".docx", ".doc", ".pdf"]:
            continue

        doc_id = str(uuid.uuid4())
        saved_filename = f"{doc_id}_{file.filename}"
        saved_path = os.path.join(UPLOADS_DIR, saved_filename)

        with open(saved_path, "wb") as f:
            shutil.copyfileobj(file.file, f)

        doc_entry = {
            "id": doc_id,
            "filename": file.filename,
            "filepath": saved_path,
            "status": "queued",
            "error": None,
            "fields": None,
            "images": []
        }
        session["documents"][doc_id] = doc_entry
        queued_docs.append({
            "id": doc_id,
            "filename": file.filename,
            "status": "queued"
        })

    return {"uploaded_count": len(queued_docs), "documents": queued_docs}

@app.get("/api/documents/queue")
def get_queue(request: Request, response: Response):
    session = get_or_create_session(request, response)
    docs = list(session["documents"].values())
    return {
        "documents": [
            {
                "id": d["id"],
                "filename": d["filename"],
                "status": d["status"],
                "error": d["error"],
                "has_fields": d["fields"] is not None,
                "images_count": len(d["images"])
            }
            for d in docs
        ]
    }

@app.delete("/api/documents/{doc_id}")
def delete_document(doc_id: str, request: Request, response: Response):
    session = get_or_create_session(request, response)
    if doc_id in session["documents"]:
        doc = session["documents"].pop(doc_id)
        if os.path.exists(doc.get("filepath", "")):
            try:
                os.remove(doc["filepath"])
            except Exception:
                pass
    return {"message": "Document removed"}

# ----------------- Routes: Extraction -----------------

@app.post("/api/extract/run")
def run_extraction(request: Request, response: Response):
    """
    Processes all queued documents sequentially.
    """
    session = get_or_create_session(request, response)
    results = []

    for doc_id, doc in session["documents"].items():
        if doc["status"] == "approved":
            continue  # Don't reprocess already approved docs
        
        doc["status"] = "processing"
        output_image_dir = os.path.join(EXTRACTED_DIR, doc_id)

        try:
            extraction_result = extract_document(doc["filepath"], output_image_dir)
            doc["fields"] = extraction_result["fields"]
            doc["images"] = extraction_result["images"]
            doc["status"] = "extracted"
            results.append({"id": doc_id, "status": "extracted", "filename": doc["filename"]})
        except Exception as e:
            doc["status"] = "error"
            doc["error"] = str(e)
            results.append({"id": doc_id, "status": "error", "error": str(e), "filename": doc["filename"]})

    return {"processed_count": len(results), "results": results}

# ----------------- Routes: Review & Approve -----------------

@app.get("/api/review/{doc_id}")
def get_review_data(doc_id: str, request: Request, response: Response):
    session = get_or_create_session(request, response)
    doc = session["documents"].get(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return {
        "id": doc["id"],
        "filename": doc["filename"],
        "status": doc["status"],
        "fields": doc["fields"],
        "images": doc["images"]
    }

class ReviewUpdateRequest(BaseModel):
    fields: Dict[str, Any]
    images: Optional[List[Dict[str, Any]]] = None

@app.put("/api/review/{doc_id}")
def update_review_data(doc_id: str, payload: ReviewUpdateRequest, request: Request, response: Response):
    session = get_or_create_session(request, response)
    doc = session["documents"].get(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    doc["fields"] = payload.fields
    if payload.images is not None:
        doc["images"] = payload.images
    return {"message": "Draft updated", "id": doc_id}

@app.post("/api/review/{doc_id}/approve")
def approve_document(doc_id: str, request: Request, response: Response):
    session = get_or_create_session(request, response)
    doc = session["documents"].get(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if not doc.get("fields"):
        raise HTTPException(status_code=400, detail="Cannot approve document before extraction")
    
    doc["status"] = "approved"
    return {"message": "Document approved", "id": doc_id}

@app.post("/api/review/approve-all")
def approve_all(request: Request, response: Response):
    session = get_or_create_session(request, response)
    approved_count = 0
    for doc in session["documents"].values():
        if doc.get("fields"):
            doc["status"] = "approved"
            approved_count += 1
    return {"approved_count": approved_count}

@app.get("/api/review/approved")
def get_approved_documents(request: Request, response: Response):
    session = get_or_create_session(request, response)
    approved = [
        {
            "id": d["id"],
            "filename": d["filename"],
            "fields": d["fields"],
            "images": d["images"]
        }
        for d in session["documents"].values()
        if d["status"] == "approved"
    ]
    return {"approved_documents": approved, "count": len(approved)}

# ----------------- Routes: Export & Conflict Resolution -----------------

@app.get("/api/export/system-locations")
def get_system_locations():
    """Returns common system locations to help user choose save location."""
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    locations = {
        "project": {
            "label": "Current Project Folder",
            "path": project_root
        },
        "documents": {
            "label": "Documents",
            "path": os.path.normpath(os.path.expanduser("~/Documents"))
        },
        "desktop": {
            "label": "Desktop",
            "path": os.path.normpath(os.path.expanduser("~/Desktop"))
        },
        "downloads": {
            "label": "Downloads",
            "path": os.path.normpath(os.path.expanduser("~/Downloads"))
        }
    }
    valid = {k: v for k, v in locations.items() if os.path.exists(v["path"])}
    return {"locations": valid}

class CollisionCheckRequest(BaseModel):
    filename: str
    file_type: str  # "csv" or "xlsx"
    system_path: Optional[str] = None
    save_dir: Optional[str] = None

@app.post("/api/export/check-collision")
def check_export_collision(payload: CollisionCheckRequest):
    ext = ".csv" if payload.file_type.lower() == "csv" else ".xlsx"
    clean_name = os.path.splitext(payload.filename)[0] + ext
    
    if payload.system_path and payload.system_path.strip():
        raw_path = os.path.expanduser(payload.system_path.strip())
        if os.path.isdir(raw_path):
            target_path = os.path.join(raw_path, clean_name)
        else:
            target_path = raw_path
    elif payload.save_dir and payload.save_dir.strip():
        target_path = os.path.join(os.path.expanduser(payload.save_dir.strip()), clean_name)
    else:
        target_path = os.path.join(EXPORTS_DIR, clean_name)

    collision_info = check_file_collision(target_path)
    return collision_info

@app.post("/api/export/file")
async def export_local_file(request: Request, response: Response):
    session = get_or_create_session(request, response)
    approved_docs = [d for d in session["documents"].values() if d["status"] == "approved" and d.get("fields")]
    if not approved_docs:
        raise HTTPException(status_code=400, detail="No approved documents to export.")

    records = [d["fields"] for d in approved_docs]
    content_type = request.headers.get("content-type", "")

    existing_file_bytes = None
    existing_filename = None
    file_type = "xlsx"
    filename = "Activity_Reports_Export"
    mode = "auto"
    system_path = None
    save_dir = None

    if "multipart/form-data" in content_type:
        form = await request.form()
        filename = str(form.get("filename") or filename)
        file_type = str(form.get("file_type") or "xlsx").lower()
        mode = str(form.get("mode") or "auto")
        system_path = form.get("system_path")
        if system_path:
            system_path = str(system_path).strip()
        save_dir = form.get("save_dir")
        if save_dir:
            save_dir = str(save_dir).strip()

        uploaded = form.get("existing_file")
        if uploaded and hasattr(uploaded, "read") and getattr(uploaded, "filename", None):
            existing_file_bytes = await uploaded.read()
            existing_filename = uploaded.filename
            mode = "append"
            ext = os.path.splitext(existing_filename)[1].lower()
            if ext in [".xlsx", ".xls"]:
                file_type = "xlsx"
            elif ext == ".csv":
                file_type = "csv"
            filename = os.path.splitext(existing_filename)[0]
    else:
        try:
            data = await request.json()
        except Exception:
            data = {}
        filename = data.get("filename", filename)
        file_type = data.get("file_type", "xlsx").lower()
        mode = data.get("mode", "auto")
        system_path = data.get("system_path")
        save_dir = data.get("save_dir")

    ext = ".csv" if file_type == "csv" else ".xlsx"
    clean_name = os.path.splitext(filename)[0] + ext

    # Determine destination target_path
    if system_path and str(system_path).strip():
        clean_sys_path = os.path.expanduser(str(system_path).strip())
        if os.path.isdir(clean_sys_path):
            target_path = os.path.join(clean_sys_path, clean_name)
        else:
            target_path = clean_sys_path
            # adjust ext / file_type based on target_path
            t_ext = os.path.splitext(target_path)[1].lower()
            if t_ext == ".csv":
                file_type = "csv"
                ext = ".csv"
            elif t_ext in [".xlsx", ".xls"]:
                file_type = "xlsx"
                ext = ".xlsx"
    elif save_dir and os.path.exists(os.path.expanduser(str(save_dir).strip())):
        target_path = os.path.join(os.path.expanduser(str(save_dir).strip()), clean_name)
    else:
        target_path = os.path.join(EXPORTS_DIR, clean_name)

    # Ensure parent directory exists
    os.makedirs(os.path.dirname(os.path.abspath(target_path)), exist_ok=True)

    # If the user uploaded an existing file from browser to append to
    if existing_file_bytes:
        with open(target_path, "wb") as f:
            f.write(existing_file_bytes)
        mode = "append"

    # Detect whether the file already existed before exporting
    was_existing = os.path.exists(target_path) and os.path.getsize(target_path) > 0

    if ext == ".csv":
        final_path = export_csv(target_path, records, mode=mode)
    else:
        final_path = export_excel(target_path, records, mode=mode)

    out_name = os.path.basename(final_path)

    # Always keep a copy in EXPORTS_DIR so frontend can fetch or download it
    exports_copy_path = os.path.join(EXPORTS_DIR, out_name)
    if os.path.abspath(final_path) != os.path.abspath(exports_copy_path):
        try:
            shutil.copyfile(final_path, exports_copy_path)
        except Exception:
            pass

    is_appended = was_existing or (mode == "append")

    return {
        "success": True,
        "exported_count": len(records),
        "file_name": out_name,
        "saved_path": os.path.abspath(final_path),
        "is_appended": is_appended,
        "download_url": f"/api/export/download/{out_name}",
        "mode": "append" if is_appended else "new"
    }

@app.get("/api/export/download/{file_name}")
def download_exported_file(file_name: str):
    file_path = os.path.join(EXPORTS_DIR, file_name)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(
        path=file_path,
        filename=file_name,
        media_type="application/octet-stream"
    )

# ----------------- Routes: Google Sheets Export -----------------

@app.get("/api/export/google/sheets/list")
def list_sheets(account: str = "primary", request: Request = None, response: Response = None):
    session = get_or_create_session(request, response)
    auth_data = session.get("google_auth", {}).get(account)
    if not auth_data:
        raise HTTPException(status_code=401, detail=f"Google account ({account}) not connected.")
    creds = google_service.get_credentials_from_dict(auth_data)
    sheets = google_service.list_user_spreadsheets(creds)
    return {"spreadsheets": sheets}

class SheetsPreviewRequest(BaseModel):
    destination_type: str  # "new" or "existing"
    spreadsheet_id: Optional[str] = None
    new_title: Optional[str] = None

@app.post("/api/export/google/sheets/preview")
def preview_sheets_export(payload: SheetsPreviewRequest, request: Request, response: Response):
    session = get_or_create_session(request, response)
    approved_docs = [d for d in session["documents"].values() if d["status"] == "approved" and d.get("fields")]
    if not approved_docs:
        raise HTTPException(status_code=400, detail="No approved documents to export.")

    headers = COMBINED_HEADERS
    rows = []
    for i, d in enumerate(approved_docs, start=1):
        rows.append(record_to_row(d["fields"], i))

    return {
        "destination_type": payload.destination_type,
        "target": payload.new_title if payload.destination_type == "new" else payload.spreadsheet_id,
        "headers": headers,
        "preview_rows": rows[:5],
        "total_rows": len(rows)
    }

class SheetsCommitRequest(BaseModel):
    account: str = "primary"
    destination_type: str  # "new" or "existing"
    spreadsheet_id: Optional[str] = None
    new_title: Optional[str] = None

@app.post("/api/export/google/sheets/commit")
def commit_sheets_export(payload: SheetsCommitRequest, request: Request, response: Response):
    session = get_or_create_session(request, response)
    auth_data = session.get("google_auth", {}).get(payload.account)
    if not auth_data:
        raise HTTPException(status_code=401, detail=f"Google account ({payload.account}) not connected.")

    approved_docs = [d for d in session["documents"].values() if d["status"] == "approved" and d.get("fields")]
    if not approved_docs:
        raise HTTPException(status_code=400, detail="No approved documents to export.")

    creds = google_service.get_credentials_from_dict(auth_data)
    records = [d["fields"] for d in approved_docs]

    if payload.destination_type == "new":
        title = payload.new_title or f"Activity Reports {datetime.now().strftime('%Y-%m-%d')}"
        res = google_service.create_new_spreadsheet(creds, title)
        sheet_id = res["spreadsheet_id"]
        sheet_url = res["spreadsheet_url"]
        google_service.append_to_spreadsheet(creds, sheet_id, records)
    else:
        if not payload.spreadsheet_id:
            raise HTTPException(status_code=400, detail="Spreadsheet ID required for existing destination.")
        sheet_id = payload.spreadsheet_id
        sheet_url = f"https://docs.google.com/spreadsheets/d/{sheet_id}/edit"
        google_service.append_to_spreadsheet(creds, sheet_id, records)

    return {
        "success": True,
        "spreadsheet_id": sheet_id,
        "spreadsheet_url": sheet_url,
        "exported_count": len(records)
    }

# ----------------- Routes: Google Drive Images Export -----------------

class DriveExportRequest(BaseModel):
    account: str = "primary"
    year: str = "2026"

@app.post("/api/export/google/drive/images")
def export_images_to_drive(payload: DriveExportRequest, request: Request, response: Response):
    session = get_or_create_session(request, response)
    auth_data = session.get("google_auth", {}).get(payload.account)
    if not auth_data:
        raise HTTPException(status_code=401, detail=f"Google account ({payload.account}) not connected.")

    approved_docs = [d for d in session["documents"].values() if d["status"] == "approved"]
    if not approved_docs:
        raise HTTPException(status_code=400, detail="No approved documents found.")

    creds = google_service.get_credentials_from_dict(auth_data)
    drive_results = []

    for doc in approved_docs:
        images = doc.get("images", [])
        if not images:
            continue
        event_name = doc.get("fields", {}).get("general_information", {}).get("title") or doc["filename"]
        res = google_service.upload_images_to_drive(creds, event_name, images, year=payload.year)
        drive_results.append({
            "doc_id": doc["id"],
            "event_name": event_name,
            "folder_path": res["folder_path"],
            "folder_id": res["folder_id"],
            "uploaded_count": len(res["uploaded_images"])
        })

    return {
        "success": True,
        "results": drive_results
    }
