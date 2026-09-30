import os
import re
import io
import docx
from typing import Dict, Any, List
try:
    import fitz  # PyMuPDF
except ImportError:
    fitz = None
try:
    import pdfplumber
except ImportError:
    pdfplumber = None

def clean_text(s: str) -> str:
    if not s:
        return ""
    return re.sub(r"\s+", " ", s).strip()

def extract_from_docx(file_path: str, output_image_dir: str) -> Dict[str, Any]:
    """
    Extracts the 8 specific fields and images from a DOCX activity report.
    Excludes Feedback and Impact Analysis.
    """
    doc = docx.Document(file_path)
    os.makedirs(output_image_dir, exist_ok=True)
    poster_dir = os.path.join(output_image_dir, "Event_Poster")
    photos_dir = os.path.join(output_image_dir, "Photos")
    attendance_dir = os.path.join(output_image_dir, "Attendance")
    for d in [poster_dir, photos_dir, attendance_dir]:
        os.makedirs(d, exist_ok=True)

    extracted_data = {
        "academic_mapping": {
            "naac": {"criteria": "", "sub_criteria_no": "", "sub_criteria_title": ""},
            "strategic_plan": {"criteria": "", "sub_criteria_no": "", "sub_criteria_title": ""},
            "graduate_attribute": {"criteria": "", "sub_criteria_no": "", "sub_criteria_title": ""}
        },
        "general_information": {
            "title": "",
            "type": "",
            "date": "",
            "time": "",
            "venue": "",
            "collaboration": ""
        },
        "speaker_details": {
            "name": "",
            "position": "",
            "organization": "",
            "presentation_title": ""
        },
        "participant_profile": {
            "participant_type": "",
            "participant_count": ""
        },
        "synopsis": "",
        "highlights": "",
        "key_objectives": "",
        "summary": "",
        "follow_up_plan": "None",
        "rapporteur_details": {
            "name": "",
            "contact": ""
        }
    }

    # Extract text from tables
    for table in doc.tables:
        for row in table.rows:
            cells = [clean_text(cell.text) for cell in row.cells]
            if len(cells) < 2:
                continue

            # Check 4-column mapping table: [Academic Body, Criteria, Sub-criteria No, Sub-criteria Title]
            if len(cells) >= 4:
                first_col = cells[0].lower()
                if "naac" in first_col:
                    extracted_data["academic_mapping"]["naac"]["criteria"] = cells[1]
                    extracted_data["academic_mapping"]["naac"]["sub_criteria_no"] = cells[2]
                    extracted_data["academic_mapping"]["naac"]["sub_criteria_title"] = cells[3]
                    continue
                elif "strategic" in first_col:
                    extracted_data["academic_mapping"]["strategic_plan"]["criteria"] = cells[1]
                    extracted_data["academic_mapping"]["strategic_plan"]["sub_criteria_no"] = cells[2]
                    extracted_data["academic_mapping"]["strategic_plan"]["sub_criteria_title"] = cells[3]
                    continue
                elif "grad" in first_col or "attribute" in first_col:
                    extracted_data["academic_mapping"]["graduate_attribute"]["criteria"] = cells[1]
                    extracted_data["academic_mapping"]["graduate_attribute"]["sub_criteria_no"] = cells[2]
                    extracted_data["academic_mapping"]["graduate_attribute"]["sub_criteria_title"] = cells[3]
                    continue
            
            label = cells[0].lower()
            val = cells[1]

            # General Info
            if "title of the activity" in label:
                extracted_data["general_information"]["title"] = val
            elif "type of activity" in label:
                extracted_data["general_information"]["type"] = val
            elif re.search(r"^date", label):
                extracted_data["general_information"]["date"] = val
            elif "time" in label:
                extracted_data["general_information"]["time"] = val
            elif "venue" in label:
                extracted_data["general_information"]["venue"] = val
            elif "collab" in label or "sponsor" in label:
                extracted_data["general_information"]["collaboration"] = val
            
            # Speaker
            elif label == "name" or re.search(r"^speaker\s*name", label):
                extracted_data["speaker_details"]["name"] = val
            elif "title/position" in label or "designation" in label:
                extracted_data["speaker_details"]["position"] = val
            elif "organization" in label or "institution" in label or "affiliation" in label:
                extracted_data["speaker_details"]["organization"] = val
            elif "presentation" in label:
                extracted_data["speaker_details"]["presentation_title"] = val
            
            # Participants
            elif "type of participant" in label:
                extracted_data["participant_profile"]["participant_type"] = val
            elif "no. of participant" in label or "number of participant" in label:
                extracted_data["participant_profile"]["participant_count"] = val
            
            # Highlights & Objectives
            elif "highlight" in label:
                extracted_data["highlights"] = val
            elif "key objective" in label or "takeaway" in label or "outcomes" in label:
                extracted_data["key_objectives"] = val
            
            # Summary & Follow up
            elif "summary of the activity" in label or (label.startswith("summary") and "feedback" not in label):
                extracted_data["summary"] = val
            elif "follow-up plan" in label or "follow up" in label:
                extracted_data["follow_up_plan"] = val if val else "None"
            elif "synopsis" in label:
                extracted_data["synopsis"] = val

            # Rapporteur Details
            elif "rapporteur" in label:
                extracted_data["rapporteur_details"]["name"] = val
            elif "email" in label and "contact" in label:
                extracted_data["rapporteur_details"]["contact"] = val

    # If synopsis is not in a table, scan paragraphs
    if not extracted_data["synopsis"]:
        p_texts = []
        capture_synopsis = False
        known_next_headers = ["rapporteur", "event poster", "geo tagged", "photo", "attendance", "highlight", "objective", "summary", "participant", "speaker", "feedback", "impact"]
        for p in doc.paragraphs:
            text = clean_text(p.text)
            if not text:
                continue
            lower = text.lower()
            if "synopsis" in lower:
                capture_synopsis = True
                after_label = re.sub(r"(?i)^synopsis\s*(of the activity)?\s*(\(description\))?\s*[:\-]?\s*", "", text).strip()
                if after_label:
                    p_texts.append(after_label)
                continue
            if capture_synopsis:
                # Stop if hitting another known header
                if any(hdr in lower for hdr in known_next_headers):
                    break
                p_texts.append(text)
        if p_texts:
            extracted_data["synopsis"] = " ".join(p_texts)

    # Extract images from docx media parts
    images = []
    image_counter = 0
    for rel in doc.part.rels.values():
        if "image" in rel.target_ref:
            try:
                image_counter += 1
                img_bytes = rel.target_part.blob
                ext = rel.target_ref.split(".")[-1].lower()
                if ext not in ["png", "jpg", "jpeg", "webp"]:
                    ext = "png"
                
                # Heuristic categorization based on order/content
                if image_counter == 1:
                    category = "Event_Poster"
                    filename = f"poster_{image_counter}.{ext}"
                    save_path = os.path.join(poster_dir, filename)
                elif image_counter >= 4:
                    category = "Attendance"
                    filename = f"attendance_{image_counter}.{ext}"
                    save_path = os.path.join(attendance_dir, filename)
                else:
                    category = "Photos"
                    filename = f"photo_{image_counter}.{ext}"
                    save_path = os.path.join(photos_dir, filename)
                
                with open(save_path, "wb") as f:
                    f.write(img_bytes)

                rel_web_path = f"/static/extracted/{os.path.basename(output_image_dir)}/{category}/{filename}"
                images.append({
                    "id": f"img_{image_counter}",
                    "filename": filename,
                    "category": category,
                    "local_path": save_path,
                    "web_url": rel_web_path
                })
            except Exception as e:
                print(f"Error extracting image {rel.target_ref}: {e}")

    return {
        "fields": extracted_data,
        "images": images
    }

def extract_from_pdf(file_path: str, output_image_dir: str) -> Dict[str, Any]:
    """
    Extracts text and images from PDF using pdfplumber & PyMuPDF.
    Excludes Feedback and Impact Analysis.
    Uses a paragraph-level state machine (mirrors DOCX extractor) for multi-line fields.
    """
    os.makedirs(output_image_dir, exist_ok=True)
    poster_dir = os.path.join(output_image_dir, "Event_Poster")
    photos_dir = os.path.join(output_image_dir, "Photos")
    attendance_dir = os.path.join(output_image_dir, "Attendance")
    for d in [poster_dir, photos_dir, attendance_dir]:
        os.makedirs(d, exist_ok=True)

    extracted_data = {
        "academic_mapping": {
            "naac": {"criteria": "", "sub_criteria_no": "", "sub_criteria_title": ""},
            "strategic_plan": {"criteria": "", "sub_criteria_no": "", "sub_criteria_title": ""},
            "graduate_attribute": {"criteria": "", "sub_criteria_no": "", "sub_criteria_title": ""}
        },
        "general_information": {
            "title": "",
            "type": "",
            "date": "",
            "time": "",
            "venue": "",
            "collaboration": ""
        },
        "speaker_details": {
            "name": "",
            "position": "",
            "organization": "",
            "presentation_title": ""
        },
        "participant_profile": {
            "participant_type": "",
            "participant_count": ""
        },
        "synopsis": "",
        "highlights": "",
        "key_objectives": "",
        "summary": "",
        "follow_up_plan": "None",
        "rapporteur_details": {
            "name": "",
            "contact": ""
        }
    }

    # ── Pass 1: structured table extraction with pdfplumber ──
    all_text = ""
    if pdfplumber:
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                tables = page.extract_tables()
                for table in tables:
                    for row in table:
                        if not row or len(row) < 2:
                            continue
                        cells = [clean_text(str(c)) for c in row if c is not None]
                        if len(cells) < 2:
                            continue

                        # 4-column academic mapping table
                        if len(cells) >= 4:
                            first_col = cells[0].lower()
                            if "naac" in first_col:
                                extracted_data["academic_mapping"]["naac"]["criteria"] = cells[1]
                                extracted_data["academic_mapping"]["naac"]["sub_criteria_no"] = cells[2]
                                extracted_data["academic_mapping"]["naac"]["sub_criteria_title"] = cells[3]
                                continue
                            elif "strategic" in first_col:
                                extracted_data["academic_mapping"]["strategic_plan"]["criteria"] = cells[1]
                                extracted_data["academic_mapping"]["strategic_plan"]["sub_criteria_no"] = cells[2]
                                extracted_data["academic_mapping"]["strategic_plan"]["sub_criteria_title"] = cells[3]
                                continue
                            elif "grad" in first_col or "attribute" in first_col:
                                extracted_data["academic_mapping"]["graduate_attribute"]["criteria"] = cells[1]
                                extracted_data["academic_mapping"]["graduate_attribute"]["sub_criteria_no"] = cells[2]
                                extracted_data["academic_mapping"]["graduate_attribute"]["sub_criteria_title"] = cells[3]
                                continue

                        label = cells[0].lower()
                        val = cells[1]

                        if "title of the activity" in label:
                            extracted_data["general_information"]["title"] = val
                        elif "type of activity" in label:
                            extracted_data["general_information"]["type"] = val
                        elif re.search(r"^date", label):
                            extracted_data["general_information"]["date"] = val
                        elif "time" in label and "title" not in label:
                            extracted_data["general_information"]["time"] = val
                        elif "venue" in label:
                            extracted_data["general_information"]["venue"] = val
                        elif "collab" in label or "sponsor" in label:
                            extracted_data["general_information"]["collaboration"] = val
                        elif label == "name" or re.search(r"^speaker\s*name", label):
                            extracted_data["speaker_details"]["name"] = val
                        elif "title/position" in label or "designation" in label:
                            extracted_data["speaker_details"]["position"] = val
                        elif "organization" in label or "institution" in label or "affiliation" in label:
                            extracted_data["speaker_details"]["organization"] = val
                        elif "presentation" in label:
                            extracted_data["speaker_details"]["presentation_title"] = val
                        elif "type of participant" in label:
                            extracted_data["participant_profile"]["participant_type"] = val
                        elif "no. of participant" in label or "number of participant" in label:
                            extracted_data["participant_profile"]["participant_count"] = val
                        elif "highlight" in label:
                            extracted_data["highlights"] = val
                        elif "key objective" in label or "takeaway" in label or "outcomes" in label:
                            extracted_data["key_objectives"] = val
                        elif ("summary of the activity" in label or
                              (label.startswith("summary") and "feedback" not in label)):
                            extracted_data["summary"] = val
                        elif "follow-up plan" in label or "follow up" in label:
                            extracted_data["follow_up_plan"] = val if val else "None"
                        elif "synopsis" in label:
                            extracted_data["synopsis"] = val
                        elif "rapporteur" in label:
                            extracted_data["rapporteur_details"]["name"] = val
                        elif "email" in label and "contact" in label:
                            extracted_data["rapporteur_details"]["contact"] = val

                # Accumulate full-page text for fallback paragraph parsing
                p_text = page.extract_text()
                if p_text:
                    all_text += "\n" + p_text

        # ── Pass 2: paragraph-level state machine (mirrors DOCX extractor) ──
        # Handles multi-line text blocks not captured cleanly in tables.
        SECTION_HEADERS = [
            "title of the activity", "type of activity", "date", "time", "venue",
            "collaboration", "sponsor", "speaker name", "speaker", "name",
            "designation", "organization", "institution", "affiliation", "presentation",
            "type of participant", "no. of participant", "number of participant",
            "highlight", "key objective", "takeaway", "outcomes",
            "summary of the activity", "summary", "follow-up plan", "follow up plan",
            "synopsis", "rapporteur", "email", "contact",
            "naac", "strategic", "graduate attribute",
            "feedback", "impact", "event poster", "geo tagged", "photo", "attendance",
        ]

        def _is_section_header(text: str) -> bool:
            t = text.lower().strip().rstrip(":")
            return len(t) < 80 and any(h in t for h in SECTION_HEADERS)

        def _flush_section(lbl: str, lns: list):
            """Write buffered lines to the appropriate field if still empty."""
            val = " ".join(lns).strip()
            if not val or not lbl:
                return
            ll = lbl.lower()
            if "synopsis" in ll and not extracted_data["synopsis"]:
                extracted_data["synopsis"] = val
            elif "highlight" in ll and not extracted_data["highlights"]:
                extracted_data["highlights"] = val
            elif ("key objective" in ll or "takeaway" in ll or "outcomes" in ll) and not extracted_data["key_objectives"]:
                extracted_data["key_objectives"] = val
            elif ("summary of the activity" in ll or (ll.startswith("summary") and "feedback" not in ll)) and not extracted_data["summary"]:
                extracted_data["summary"] = val
            elif ("follow-up plan" in ll or "follow up" in ll) and extracted_data["follow_up_plan"] == "None":
                extracted_data["follow_up_plan"] = val if val else "None"
            elif "rapporteur" in ll and not extracted_data["rapporteur_details"]["name"]:
                extracted_data["rapporteur_details"]["name"] = val

        current_label = None
        current_lines: list = []

        for line in (ln.strip() for ln in all_text.splitlines() if ln.strip()):
            # Try "Label : Value" or "Label: Value" split
            colon_match = re.split(r"\s*:\s*", line, maxsplit=1)
            potential_label = colon_match[0].strip()
            if len(colon_match) == 2 and _is_section_header(potential_label):
                _flush_section(current_label, current_lines)
                current_label = potential_label
                current_lines = [colon_match[1].strip()] if colon_match[1].strip() else []
            elif _is_section_header(line):
                _flush_section(current_label, current_lines)
                current_label = line.rstrip(":")
                current_lines = []
            elif current_label:
                current_lines.append(line)

        _flush_section(current_label, current_lines)

    # ── Pass 3: extract images with PyMuPDF (fitz) ──
    images = []
    if fitz:
        pdf_doc = fitz.open(file_path)
        img_idx = 0
        for page_num in range(len(pdf_doc)):
            page = pdf_doc[page_num]
            image_list = page.get_images(full=True)
            for img_info in image_list:
                img_idx += 1
                xref = img_info[0]
                base_image = pdf_doc.extract_image(xref)
                image_bytes = base_image["image"]
                ext = base_image["ext"]
                if ext not in ["png", "jpg", "jpeg", "webp"]:
                    ext = "png"

                if img_idx == 1:
                    category = "Event_Poster"
                    filename = f"poster_{img_idx}.{ext}"
                    save_path = os.path.join(poster_dir, filename)
                elif img_idx >= 4 or page_num >= len(pdf_doc) - 2:
                    category = "Attendance"
                    filename = f"attendance_{img_idx}.{ext}"
                    save_path = os.path.join(attendance_dir, filename)
                else:
                    category = "Photos"
                    filename = f"photo_{img_idx}.{ext}"
                    save_path = os.path.join(photos_dir, filename)

                with open(save_path, "wb") as f:
                    f.write(image_bytes)

                rel_web_path = f"/static/extracted/{os.path.basename(output_image_dir)}/{category}/{filename}"
                images.append({
                    "id": f"img_{img_idx}",
                    "filename": filename,
                    "category": category,
                    "local_path": save_path,
                    "web_url": rel_web_path
                })

    return {
        "fields": extracted_data,
        "images": images
    }

def extract_document(file_path: str, output_image_dir: str) -> Dict[str, Any]:
    ext = os.path.splitext(file_path)[1].lower()
    if ext in [".docx", ".doc"]:
        return extract_from_docx(file_path, output_image_dir)
    elif ext == ".pdf":
        return extract_from_pdf(file_path, output_image_dir)
    else:
        raise ValueError(f"Unsupported file format: {ext}")
