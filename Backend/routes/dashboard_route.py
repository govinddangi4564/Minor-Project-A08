from uuid import UUID
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from schemas.dashboard_schema import (
    CompanyDashboardStatsResponse, 
    SkillsDistributionResponse, 
    MatchTrendsResponse,
    BenchmarksResponse,
    ReportSummaryResponse
)
from schemas.report_history_schema import ReportHistoryCreate, ReportHistoryResponse
from services.dashboard_service import (
    get_dashboard_stats, 
    get_skills_distribution, 
    get_match_trends,
    get_benchmarks,
    get_report_summary,
    generate_report_pdf,
    save_report_history,
    get_report_history
)
from models.base import get_db
from routes.company_route import get_current_company


router = APIRouter()


@router.get("/company/dashboard/stats", response_model=CompanyDashboardStatsResponse)
def dashboard_stats(
    current_company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    """
    Get dashboard stats for the logged-in company
    """
    data = get_dashboard_stats(current_company.id, db)
    return data


@router.get("/company/dashboard/skills-distribution", response_model=SkillsDistributionResponse)
def skills_distribution(
    days: int = Query(7, gt=0),
    current_company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    """
    Returns skill distribution for the company in the last `days` days
    """
    return get_skills_distribution(current_company.id, db, days)



@router.get("/company/dashboard/match-trends", response_model=MatchTrendsResponse)
def match_trends(
    days: int = Query(7, gt=0),
    jd_id: Optional[UUID] = Query(None),
    current_company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    """
    Returns match trends and JD breakdown for a company
    """
    return get_match_trends(current_company.id, db, days, jd_id)


@router.get("/company/dashboard/benchmarks", response_model=BenchmarksResponse)
def benchmarks(
    current_company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    """
    Get industry benchmarks comparison for the company
    """
    return get_benchmarks(current_company.id, db)


@router.get("/company/dashboard/reports/summary", response_model=ReportSummaryResponse)
def report_summary(
    report_type: str = Query("summary"),
    date_range: str = Query("7"),
    current_company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    """
    Get report summary based on type and date range
    """
    return get_report_summary(current_company.id, db, report_type, date_range)


@router.get("/company/dashboard/reports/export-pdf")
def export_report_pdf(
    report_type: str = Query("summary"),
    date_range: str = Query("7"),
    current_company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    """
    Generate and download PDF report
    """
    from fastapi.responses import Response
    
    try:
        pdf_bytes = generate_report_pdf(current_company.id, db, report_type, date_range)
        
        filename = f"hr_analytics_report_{report_type}_{date_range}days.pdf"
        
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )
    except ImportError as e:
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/company/dashboard/reports/history", response_model=ReportHistoryResponse)
def create_report_history(
    report_data: ReportHistoryCreate,
    current_company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    """
    Save a generated report to history
    """
    report = save_report_history(
        company_id=current_company.id,
        db=db,
        report_name=report_data.report_name,
        report_type=report_data.report_type,
        date_range=report_data.date_range,
        report_data=report_data.report_data
    )
    return report


@router.get("/company/dashboard/reports/history", response_model=list[ReportHistoryResponse])
def list_report_history(
    limit: int = Query(10, gt=0, le=50),
    current_company = Depends(get_current_company),
    db: Session = Depends(get_db)
):
    """
    Get report history for the company
    """
    return get_report_history(current_company.id, db, limit)
