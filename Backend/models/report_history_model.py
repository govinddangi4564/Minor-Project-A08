from sqlalchemy import Column, String, DateTime, UUID, ForeignKey, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from models.base import Base


class ReportHistory(Base):
    __tablename__ = "report_history"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id"), nullable=False)
    report_name = Column(String(255), nullable=False)
    report_type = Column(String(50), nullable=False)  # summary, detailed, weekly, monthly
    date_range = Column(String(20), nullable=False)  # 7, 30, 90, all
    generated_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Optional: store report data as JSON for quick access
    report_data = Column(Text, nullable=True)  # JSON string of report summary
    
    # Relationship
    company = relationship("Company", backref="report_histories")
