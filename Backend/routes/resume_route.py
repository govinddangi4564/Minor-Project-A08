from fastapi import APIRouter, File, HTTPException, UploadFile, Depends
from services.resume_service import (
    process_resume_pdf,
    get_resume_by_id,
    delete_resume_service
)
from fastapi.responses import FileResponse
from uuid import UUID
from utils.log_config import logger
from utils.security import get_authenticated_entity

router = APIRouter()


@router.post("/resumes/parse")
async def resume_upload(file: UploadFile = File(...),  auth = Depends(get_authenticated_entity)):
    extension = file.filename.split(".")[-1].lower()

    if extension not in ["pdf"]:
        raise HTTPException(
            status_code=400, detail="Unsupported file type. Only PDF  are allowed."
        )

    resp = await process_resume_pdf(file, auth)

    return resp


@router.get("/resumes/{resume_id}") 
async def get_resume(resume_id: UUID,  auth = Depends(get_authenticated_entity)):
    logger.info(f"Downloading resume with ID: {resume_id}")

    try:
        from services.resume_service import get_resume_by_id as get_resume_service
        row = await get_resume_service(resume_id)
    except Exception as e:
        logger.error(f"Error retrieving resume: {e}")
        raise HTTPException(status_code=500, detail="Error retrieving resume")

    if not row:
        raise HTTPException(status_code=404, detail=f"Resume not found for id: {resume_id}")

    return row

    
@router.get("/resumes/{resume_id}/download") 
async def download_resume(resume_id: UUID,  auth = Depends(get_authenticated_entity)):
    logger.info(f"Downloading resume with ID: {resume_id}")

    try:
        from services.resume_service import get_resume_by_id as get_resume_service
        row = await get_resume_service(resume_id)
    except Exception as e:
         logger.error(f"Error retrieving resume for download: {e}")
         raise HTTPException(status_code=500, detail="Error retrieving resume for download")
   
    if not row:
        raise HTTPException(status_code=404, detail=f"Resume not found for id: {resume_id}")

    file_path = row["uploaded_path"]
    file_name = row["actual_name"]

    return FileResponse(
        path=file_path, filename=file_name, media_type="application/pdf"
    )



@router.delete("/resumes/{resume_id}")
async def delete_resume(resume_id: UUID,  auth = Depends(get_authenticated_entity)):
    try:
        row = await get_resume_by_id(resume_id)
    except Exception as e:
         logger.error(f"Error retrieving resume for deletion: {e}")
         raise HTTPException(status_code=500, detail="Error retrieving resume for deletion")
   
    if not row:
        raise HTTPException(status_code=404, detail=f"Resume not found for id: {resume_id}")

    path = dict(row)['uploaded_path']
    await delete_resume_service(resume_id, path) 

    return f"Resume {resume_id} delete successfully"
