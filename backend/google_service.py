import os
import json
from typing import Dict, Any, List, Optional
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload
from exporter import EXPORT_COLUMNS_R1, EXPORT_COLUMNS_R2, record_to_row

SCOPES = [
    "openid",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive.file"
]

def get_oauth_flow(client_config: Dict[str, Any], redirect_uri: str, code_verifier: Optional[str] = None) -> Flow:
    flow = Flow.from_client_config(
        client_config=client_config,
        scopes=SCOPES,
        redirect_uri=redirect_uri
    )
    if code_verifier:
        flow.code_verifier = code_verifier
    else:
        flow.autogenerate_code_verifier = False
    return flow

def get_credentials_from_dict(creds_dict: Dict[str, Any]) -> Credentials:
    return Credentials(
        token=creds_dict.get("token"),
        refresh_token=creds_dict.get("refresh_token"),
        token_uri=creds_dict.get("token_uri", "https://oauth2.googleapis.com/token"),
        client_id=creds_dict.get("client_id"),
        client_secret=creds_dict.get("client_secret"),
        scopes=creds_dict.get("scopes", SCOPES)
    )

def list_user_spreadsheets(credentials: Credentials) -> List[Dict[str, str]]:
    """List spreadsheets created or accessible by the app."""
    try:
        drive_service = build("drive", "v3", credentials=credentials)
        results = drive_service.files().list(
            q="mimeType='application/vnd.google-apps.spreadsheet' and trashed=false",
            fields="files(id, name, modifiedTime, webViewLink)",
            pageSize=30
        ).execute()
        return results.get("files", [])
    except Exception as e:
        print(f"Error listing spreadsheets: {e}")
        return []

def create_new_spreadsheet(credentials: Credentials, title: str) -> Dict[str, Any]:
    """Creates a new Google Spreadsheet with 2-tier headers matching to_follow.xlsx."""
    sheets_service = build("sheets", "v4", credentials=credentials)
    r1_headers = [c or "" for c in EXPORT_COLUMNS_R1]
    r2_headers = [c or "" for c in EXPORT_COLUMNS_R2]

    spreadsheet_body = {
        "properties": {"title": title},
        "sheets": [
            {
                "properties": {
                    "title": "Sheet1",
                    "gridProperties": {"frozenRowCount": 2}
                }
            }
        ]
    }
    spreadsheet = sheets_service.spreadsheets().create(
        body=spreadsheet_body,
        fields="spreadsheetId,spreadsheetUrl"
    ).execute()
    
    sheet_id = spreadsheet.get("spreadsheetId")
    
    # Write 2-tier header rows matching to_follow.xlsx
    sheets_service.spreadsheets().values().update(
        spreadsheetId=sheet_id,
        range="Sheet1!A1:AB2",
        valueInputOption="USER_ENTERED",
        body={"values": [r1_headers, r2_headers]}
    ).execute()

    return {
        "spreadsheet_id": sheet_id,
        "spreadsheet_url": spreadsheet.get("spreadsheetUrl")
    }

def append_to_spreadsheet(credentials: Credentials, spreadsheet_id: str, records: List[Dict[str, Any]], sheet_name: str = "Sheet1") -> Dict[str, Any]:
    """Appends extracted records as rows into an existing Google Spreadsheet matching to_follow.xlsx."""
    sheets_service = build("sheets", "v4", credentials=credentials)

    # Determine start serial number by checking existing rows count
    start_sr = 1
    try:
        existing_data = sheets_service.spreadsheets().values().get(
            spreadsheetId=spreadsheet_id,
            range=f"{sheet_name}!A:A"
        ).execute()
        existing_rows_count = len(existing_data.get("values", []))
        start_sr = max(1, existing_rows_count - 2 + 1)
    except Exception:
        start_sr = 1

    rows = []
    for i, r in enumerate(records):
        rows.append(record_to_row(r, start_sr + i))

    range_name = f"{sheet_name}!A1" if sheet_name else "A1"
    response = sheets_service.spreadsheets().values().append(
        spreadsheetId=spreadsheet_id,
        range=range_name,
        valueInputOption="USER_ENTERED",
        insertDataOption="INSERT_ROWS",
        body={"values": rows}
    ).execute()

    return response

def get_or_create_drive_folder(drive_service, folder_name: str, parent_id: Optional[str] = None) -> str:
    """Finds or creates a folder under a parent folder."""
    query = f"mimeType='application/vnd.google-apps.folder' and name='{folder_name}' and trashed=false"
    if parent_id:
        query += f" and '{parent_id}' in parents"
    
    response = drive_service.files().list(q=query, fields="files(id, name)", spaces="drive").execute()
    files = response.get("files", [])
    if files:
        return files[0]["id"]

    metadata = {
        "name": folder_name,
        "mimeType": "application/vnd.google-apps.folder"
    }
    if parent_id:
        metadata["parents"] = [parent_id]

    folder = drive_service.files().create(body=metadata, fields="id").execute()
    return folder.get("id")

def upload_images_to_drive(
    credentials: Credentials,
    event_name: str,
    images: List[Dict[str, Any]],
    year: str = "2026"
) -> Dict[str, Any]:
    """
    Creates the hierarchy:
    Activity Reports / 2026 / {Event_Name} /
        ├── Event_Poster/
        ├── Photos/
        └── Attendance/
    Uploads images and returns their Google Drive web links.
    """
    drive_service = build("drive", "v3", credentials=credentials)
    clean_event_name = "".join(c for c in event_name if c.isalnum() or c in (" ", "-", "_")).strip() or "Untitled_Event"

    # Step 1: Root Folder "Activity Reports"
    root_id = get_or_create_drive_folder(drive_service, "Activity Reports")
    # Step 2: Year Folder (e.g. "2026")
    year_id = get_or_create_drive_folder(drive_service, str(year), parent_id=root_id)
    # Step 3: Event Folder
    event_id = get_or_create_drive_folder(drive_service, clean_event_name, parent_id=year_id)

    # Step 4: Subfolders
    poster_folder_id = get_or_create_drive_folder(drive_service, "Event_Poster", parent_id=event_id)
    photos_folder_id = get_or_create_drive_folder(drive_service, "Photos", parent_id=event_id)
    attendance_folder_id = get_or_create_drive_folder(drive_service, "Attendance", parent_id=event_id)

    folder_map = {
        "Event_Poster": poster_folder_id,
        "Photos": photos_folder_id,
        "Attendance": attendance_folder_id
    }

    uploaded = []
    for img in images:
        local_path = img.get("local_path")
        if not local_path or not os.path.exists(local_path):
            continue

        cat = img.get("category", "Photos")
        target_folder_id = folder_map.get(cat, photos_folder_id)
        filename = img.get("filename", os.path.basename(local_path))

        # Check if file already exists in folder to avoid duplicate uploads
        check_q = f"name='{filename}' and '{target_folder_id}' in parents and trashed=false"
        existing = drive_service.files().list(q=check_q, fields="files(id, name, webViewLink)").execute().get("files", [])
        
        if existing:
            uploaded.append({
                "filename": filename,
                "category": cat,
                "drive_id": existing[0]["id"],
                "drive_url": existing[0].get("webViewLink", ""),
                "status": "already_exists"
            })
            continue

        file_metadata = {
            "name": filename,
            "parents": [target_folder_id]
        }
        media = MediaFileUpload(local_path, resumable=True)
        drive_file = drive_service.files().create(
            body=file_metadata,
            media_body=media,
            fields="id, webViewLink"
        ).execute()

        uploaded.append({
            "filename": filename,
            "category": cat,
            "drive_id": drive_file.get("id"),
            "drive_url": drive_file.get("webViewLink", ""),
            "status": "uploaded"
        })

    return {
        "folder_id": event_id,
        "folder_path": f"Activity Reports / {year} / {clean_event_name}",
        "uploaded_images": uploaded
    }
