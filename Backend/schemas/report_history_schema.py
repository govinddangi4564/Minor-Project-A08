from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import datetime


class ReportHistoryCreate(BaseModel):
    report_name: str
    report_type: str
    date_range: str
    report_data: Optional[str] = None


class ReportHistoryResponse(BaseModel):
    id: UUID
    company_id: UUID
    report_name: str
    report_type: str
    date_range: str
    generated_at: datetime
    report_data: Optional[str] = None

    class Config:
        from_attributes = True
