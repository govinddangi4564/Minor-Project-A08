from pydantic import BaseModel, UUID4
from typing import Optional, List, Any
from datetime import datetime


class JDBase(BaseModel):
    title: str
    department: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None   # currently text; later can become file
    keywords: Optional[List[Any]] = None


class JDUpdate(BaseModel):
    title: Optional[str] = None
    department: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None
    keywords: Optional[List[Any]] = None


class JDOut(JDBase):
    id: UUID4
    created_at: datetime
    updated_at: Optional[datetime]
    created_by: UUID4 | None = None
    company_id: UUID4 | None = None

    class Config:
        orm_mode = True
