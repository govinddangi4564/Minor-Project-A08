import uuid
import aiofiles
from pathlib import Path
from fastapi import HTTPException, UploadFile

from utils.utility import format_datetime_to_ist, BASE_DIR, get_current_datetime_utc
from utils.log_config import logger
from utils.resume_parser import extract_text_from_pdf, parse_resume
from models.base import session
from models.resume_model import Resume
from models.candidate_model import Candidate


UPLOADS_DIR = BASE_DIR / "uploads" / "resumes" 
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)


def get_entity_id(auth):
    if auth['type'] == 'user':
        return auth['entity'].user_id
    if auth['type'] == 'company':
        return auth['entity'].id
    raise HTTPException(401, "Auth type not supported")


async def get_resume_by_id_db(resume_id):
    try:
        resp = session.query(Resume).filter(Resume.resume_id == resume_id).first()
    except Exception as e:
        logger.error(f"Error fetching resume by ID: {e}")
        raise HTTPException(status_code=500, detail="Error fetching resume")

    if resp is None:
        raise HTTPException(status_code=404, detail=f"Resume not found for id: {resume_id}")
    
    D = {
        "resume_id":resp.resume_id, 
        "uploaded_path":resp.uploaded_path, 
        "actual_name":resp.actual_name,  
        "parsed_text": resp.parsed_text,
        "created_at": format_datetime_to_ist(resp.created_at)
    }
    return D


async def delete_resume_db(resume_id):
    try:
        resp = session.query(Resume).filter(Resume.resume_id == resume_id).first()
        if resp is None:
            raise HTTPException(status_code=404, detail=f"Resume not found for id: {resume_id}")   
        session.delete(resp)
        session.commit()
    except Exception as e:
        logger.error(f"Error deleting resume: {e}")
        raise HTTPException(status_code=500, detail="Error deleting resume")


async def insert_resume_db(resume_id, uploaded_path, actual_name, file_format, auth, parsed_text):
    logger.info(f"Inserting resume with ID: {resume_id}")
    try:
        new_resume = Resume(
            resume_id=resume_id,
            uploaded_path=uploaded_path,
            actual_name=actual_name,
            file_format=file_format,
            parsed_text=parsed_text
        )
        if auth['type'] == 'user':
            new_resume.user_id = auth['entity'].user_id
        else:
            new_resume.company_id = auth['entity'].id
        session.add(new_resume)
        session.commit()
    except Exception as e:
        logger.error(f"Error inserting resume: {e}")
        raise HTTPException(status_code=500, detail="Error inserting resume") 


async def process_resume_pdf(file: UploadFile, auth):
    """
    Process the uploaded PDF resume and save it to the uploads/pdf directory.
    """
    
    resume_id = uuid.uuid4()
    logger.info(f"Processing started for resume: {resume_id}")
    file_name = f"resume_{resume_id}.pdf"
    file_path = f"{UPLOADS_DIR}/{file_name}"
    uploaded_at = get_current_datetime_utc()

    try:
        async with aiofiles.open(file_path, "wb") as f:
            content = await file.read()
            await f.write(content)
        logger.info(f"Resume written to disk: {resume_id}")
    except Exception as e:
        logger.error(f"Error saving uploaded resume: {e}")
        raise e
    
    parsed_text = extract_text_from_pdf(file_path)

    try:
        await insert_resume_db(resume_id, file_path, file.filename, "pdf", auth, parsed_text)
        logger.info(f"Resume inserted to DB: {resume_id}")
    except Exception as e:
        logger.error(f"Error inserting resume into database: {e}")
        await delete_resume_service(None, file_path)
        raise e
    
    # parse and create candidate
    try:
        logger.info(f"Parsing started for resume: {resume_id}")
        parse_res = parse_resume(parsed_text, "Engineering")
        logger.info(f"Parsing completed and starting candidate creation")
        parsed_at = get_current_datetime_utc()
        cand = Candidate(
            name=parse_res["name"],
            email=parse_res["email"],
            phone=parse_res["phone"],
            skills=parse_res["skills"],
            experience_years=parse_res["experience_years"],
            experience=parse_res["experience"],
            education=parse_res["education"],
            summary=parse_res["summary"],
            projects=parse_res["projects"],
            department=parse_res["department"],
            role=parse_res["role"],
            uploaded_at=uploaded_at,
            parsed_at=parsed_at,
            resume_id=resume_id
        )
        if auth['type'] == 'user':
            cand.user_id = auth['entity'].user_id
        else:
            cand.company_id = auth['entity'].id
        session.add(cand)
        session.commit()
        session.refresh(cand)
        logger.info("candidate creation successful")
    except Exception:
        logger.exception("error creating resume")
        raise HTTPException(500, "Error creating candidate")

    # Trigger matching
    try:
        if auth['type'] == 'company':
            from services.matching_service import match_candidate
            match_candidate(session, cand.id, auth['entity'].id)
            logger.info(f"Matching triggered for candidate: {cand.id}")
    except Exception as e:
        logger.error(f"Error triggering matching: {e}")

    return {
        "message": "Resume uploaded successfully", 
        "resume_id": resume_id, 
        "parsed_text": parsed_text,
        "candidate_id": cand.id
    }


async def get_resume_by_id(resume_id):
    try:
        resp = await get_resume_by_id_db(resume_id)
    except Exception as e:
        raise e
    
    return resp

    
async def delete_resume_service(resume_id, path):
    logger.info(f"Deleting resume with ID: {resume_id} and path: {path}")
    file_path = Path(path)
    if file_path.exists():
        file_path.unlink()
        print(f"file deleted in disk for path: {file_path}")
    else:
        print(f"No file exist in disk for path: {file_path}")

    if resume_id:
        await delete_resume_db(resume_id)
    logger.info(f"Resume with ID: {resume_id} deleted successfully from database.")
