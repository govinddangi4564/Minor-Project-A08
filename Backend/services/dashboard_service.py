from sqlalchemy import func, cast, Date, and_
from datetime import datetime, timedelta, timezone
from models import Resume, Candidate, CandidateMatch, Shortlist, JobDescription
from sqlalchemy.orm import Session
from uuid import UUID
from typing import Optional


def get_dashboard_stats(company_id: UUID, db: Session):
    # Resumes scanned
    resumes_scanned = db.query(func.count(Resume.resume_id)).filter(
        Resume.company_id == company_id
    ).scalar() or 0

    # Shortlisted candidates
    shortlisted = db.query(func.count(Shortlist.id)).filter(
        Shortlist.shortlisted == True,
        Shortlist.shortlisted_by == company_id
    ).scalar() or 0

    # Average match score
    avg_match_score = db.query(func.avg(CandidateMatch.final_score)).join(
        Candidate, Candidate.id == CandidateMatch.candidate_id
    ).filter(
        Candidate.company_id == company_id
    ).scalar() or 0
    avg_match_score = round(avg_match_score, 2)

    # Active JDs - count all JDs for this company, not just matched ones
    active_jds = db.query(func.count(JobDescription.id)).filter(
        JobDescription.company_id == company_id
    ).scalar() or 0

    # Trends
    today = datetime.utcnow()
    last_week = today - timedelta(days=7)
    prev_week = today - timedelta(days=14)

    last_week_count = db.query(func.count(Resume.resume_id)).filter(
        Resume.company_id == company_id,
        Resume.created_at >= last_week
    ).scalar() or 0

    prev_week_count = db.query(func.count(Resume.resume_id)).filter(
        Resume.company_id == company_id,
        Resume.created_at >= prev_week,
        Resume.created_at < last_week
    ).scalar() or 0

    weekly_growth = int(((last_week_count - prev_week_count) / (prev_week_count or 1)) * 100)
    conversion_rate = int((shortlisted / (resumes_scanned or 1)) * 100)

    # Top department
    top_department_row = db.query(
        Candidate.department, func.count(Candidate.id)
    ).filter(
        Candidate.company_id == company_id
    ).group_by(
        Candidate.department
    ).order_by(func.count(Candidate.id).desc()).first()
    top_department = top_department_row[0] if top_department_row else None

    # Top department score
    top_dept_score = 0.0
    if top_department:
        top_dept_score = db.query(func.avg(CandidateMatch.final_score)).join(
            Candidate, Candidate.id == CandidateMatch.candidate_id
        ).filter(
            Candidate.company_id == company_id,
            Candidate.department == top_department
        ).scalar() or 0.0
        top_dept_score = round(top_dept_score, 1)

    # Top skill (JSONB array)
    top_skill_row = db.query(
        func.jsonb_array_elements_text(Candidate.skills).label("skill"),
        func.count(Candidate.id)
    ).filter(
        Candidate.company_id == company_id
    ).group_by("skill").order_by(func.count(Candidate.id).desc()).first()
    top_skill = top_skill_row[0] if top_skill_row else None

    return {
        "resumes_scanned": resumes_scanned,
        "shortlisted": shortlisted,
        "avg_match_score": avg_match_score,
        "active_jds": active_jds,
        "trends": {
            "weekly_growth": weekly_growth,
            "conversion_rate": conversion_rate,
            "top_department": top_department,
            "top_dept_score": top_dept_score,
            "top_skill": top_skill
        }
    }


def get_skills_distribution(company_id: UUID, db: Session, days: int = 7):
    """
    Returns top skills distribution for a company in the last `days` days.
    """
    # Date filter
    since_date = datetime.now(timezone.utc) - timedelta(days=days)

    # Query: expand JSONB array to rows and count each skill
    skill_rows = db.query(
        func.jsonb_array_elements_text(Candidate.skills).label("skill"),
        func.count(Candidate.id).label("count")
    ).filter(
        Candidate.company_id == company_id,
        Candidate.uploaded_at >= since_date
    ).group_by("skill").order_by(func.count(Candidate.id).desc()).all()

    total_candidates = sum([row.count for row in skill_rows]) or 1  # avoid division by zero

    skills_list = [
        {
            "name": row.skill,
            "count": row.count,
            "percentage": round((row.count / total_candidates) * 100, 2)
        }
        for row in skill_rows
    ]

    return {"skills": skills_list}


def get_match_trends(company_id: str, db: Session, days: int = 7, jd_id: Optional[UUID] = None):
    """
    Returns match trends for a company in the last `days` days, optionally filtered by JD.
    """
    today = datetime.utcnow().date()
    start_date = today - timedelta(days=days-1)

    # 1️⃣ Aggregate daily trends across all candidates
    daily_trends_query = (
        db.query(
            cast(CandidateMatch.calculated_at, Date).label("day"),
            func.avg(CandidateMatch.final_score).label("avg_score"),
            func.count(CandidateMatch.id).label("total_candidates"),
            func.count(Shortlist.id).label("shortlisted_count")
        )
        .join(Candidate, Candidate.id == CandidateMatch.candidate_id)
        .outerjoin(
            Shortlist,
            and_(
                Shortlist.candidate_id == CandidateMatch.candidate_id,
                Shortlist.shortlisted == True,
                Shortlist.shortlisted_by == company_id
            )
        )
        .filter(
            Candidate.company_id == company_id,
            CandidateMatch.calculated_at >= start_date
        )
    )

    if jd_id:
        daily_trends_query = daily_trends_query.filter(CandidateMatch.jd_id == jd_id)

    daily_trends_rows = daily_trends_query.group_by("day").order_by("day").all()

    trends = [
        {
            "date": row.day.isoformat(),
            "avg_score": round(row.avg_score or 0, 2),
            "shortlisted_count": int(row.shortlisted_count or 0),
            "total_candidates": int(row.total_candidates or 0)
        }
        for row in daily_trends_rows
    ]

    # 2️⃣ JD breakdown
    jd_query = db.query(JobDescription).filter(JobDescription.company_id == company_id)
    if jd_id:
        jd_query = jd_query.filter(JobDescription.id == jd_id)
    jd_list = jd_query.all()

    jd_breakdown = []
    for jd in jd_list:
        daily_jd_query = (
            db.query(
                cast(CandidateMatch.calculated_at, Date).label("day"),
                func.avg(CandidateMatch.final_score).label("avg_score"),
                func.count(CandidateMatch.id).label("total_candidates"),
                func.count(Shortlist.id).label("shortlisted_count")
            )
            .join(Candidate, Candidate.id == CandidateMatch.candidate_id)
            .outerjoin(
                Shortlist,
                and_(
                    Shortlist.candidate_id == CandidateMatch.candidate_id,
                    Shortlist.shortlisted == True,
                    Shortlist.shortlisted_by == company_id
                )
            )
            .filter(
                Candidate.company_id == company_id,
                CandidateMatch.jd_id == jd.id,
                CandidateMatch.calculated_at >= start_date
            )
            .group_by("day")
            .order_by("day")
        )

        daily_rows = daily_jd_query.all()

        daily_scores = [
            {
                "date": row.day.isoformat(),
                "avg_score": round(row.avg_score or 0, 2),
                "shortlisted_count": int(row.shortlisted_count or 0),
                "total_candidates": int(row.total_candidates or 0)
            }
            for row in daily_rows
        ]

        jd_breakdown.append({
            "jd_id": jd.id,
            "jd_title": jd.title,
            "daily_scores": daily_scores
        })

    return {"trends": trends, "jd_breakdown": jd_breakdown}


def get_benchmarks(company_id: UUID, db: Session):
    """
    Calculate company benchmarks compared to industry averages.
    Industry averages are hardcoded based on market research.
    """
    # Industry averages (hardcoded benchmarks)
    INDUSTRY_AVG_MATCH_SCORE = 72.0
    INDUSTRY_AVG_TIME_TO_HIRE = 18.0  # days
    INDUSTRY_AVG_CONVERSION_RATE = 12.0  # percentage
    INDUSTRY_AVG_QUALITY_SCORE = 7.2  # out of 10

    # Get company stats
    stats = get_dashboard_stats(company_id, db)
    
    # Calculate company metrics
    company_match_score = stats['avg_match_score']
    company_conversion_rate = stats['trends']['conversion_rate']
    
    # Calculate time to hire (average days between resume upload and shortlist)
    time_to_hire_query = db.query(
        func.avg(
            func.extract('epoch', Shortlist.created_at - Resume.created_at) / 86400
        ).label('avg_days')
    ).join(
        Candidate, Candidate.id == Shortlist.candidate_id
    ).join(
        Resume, Resume.resume_id == Candidate.resume_id
    ).filter(
        Shortlist.shortlisted == True,
        Shortlist.shortlisted_by == company_id
    )
    
    time_to_hire_result = time_to_hire_query.scalar()
    company_time_to_hire = round(time_to_hire_result, 1) if time_to_hire_result else 0
    
    # Calculate quality score (based on average match score normalized to 10)
    company_quality_score = round((company_match_score / 100) * 10, 1)
    
    # Helper function to calculate benchmark metric
    def calc_metric(company_val, industry_val):
        diff = float(company_val) - float(industry_val)
        pct_diff = round((diff / industry_val) * 100, 1) if industry_val != 0 else 0
        return {
            "company_value": company_val,
            "industry_average": industry_val,
            "difference": round(diff, 2),
            "percentage_diff": pct_diff
        }
    
    return {
        "match_score": calc_metric(company_match_score, INDUSTRY_AVG_MATCH_SCORE),
        "time_to_hire": calc_metric(company_time_to_hire, INDUSTRY_AVG_TIME_TO_HIRE),
        "conversion_rate": calc_metric(company_conversion_rate, INDUSTRY_AVG_CONVERSION_RATE),
        "quality_score": calc_metric(company_quality_score, INDUSTRY_AVG_QUALITY_SCORE)
    }


def get_report_summary(company_id: UUID, db: Session, report_type: str, date_range: str):
    """
    Generate report summary based on type and date range.
    """
    # Calculate date filter
    if date_range == 'all':
        since_date = datetime(2000, 1, 1)
        date_range_str = "All time"
    else:
        since_date = datetime.now(timezone.utc) - timedelta(days=int(date_range))
        date_range_str = f"Last {date_range} days"
    
    # Total resumes in date range
    total_resumes = db.query(func.count(Resume.resume_id)).filter(
        Resume.company_id == company_id,
        Resume.created_at >= since_date
    ).scalar() or 0
    
    # Shortlisted candidates in date range
    shortlisted = db.query(func.count(Shortlist.id)).filter(
        Shortlist.shortlisted == True,
        Shortlist.shortlisted_by == company_id,
        Shortlist.created_at >= since_date
    ).scalar() or 0
    
    # Average match score in date range
    avg_score = db.query(func.avg(CandidateMatch.final_score)).join(
        Candidate, Candidate.id == CandidateMatch.candidate_id
    ).filter(
        Candidate.company_id == company_id,
        CandidateMatch.calculated_at >= since_date
    ).scalar() or 0
    avg_score = round(avg_score, 2)
    
    # Top department in date range
    top_dept_row = db.query(
        Candidate.department, func.count(Candidate.id)
    ).filter(
        Candidate.company_id == company_id,
        Candidate.uploaded_at >= since_date
    ).group_by(
        Candidate.department
    ).order_by(func.count(Candidate.id).desc()).first()
    top_department = top_dept_row[0] if top_dept_row else None
    
    # Top skill in date range
    top_skill_row = db.query(
        func.jsonb_array_elements_text(Candidate.skills).label("skill"),
        func.count(Candidate.id)
    ).filter(
        Candidate.company_id == company_id,
        Candidate.uploaded_at >= since_date
    ).group_by("skill").order_by(func.count(Candidate.id).desc()).first()
    top_skill = top_skill_row[0] if top_skill_row else None
    
    return {
        "total_resumes": total_resumes,
        "shortlisted": shortlisted,
        "avg_score": avg_score,
        "top_department": top_department,
        "top_skill": top_skill,
        "report_type": report_type,
        "date_range": date_range_str
    }


def generate_report_pdf(company_id: UUID, db: Session, report_type: str, date_range: str):
    """
    Generate a PDF report and return it as bytes.
    Uses reportlab to create a professional-looking PDF.
    """
    from io import BytesIO
    try:
        from reportlab.lib.pagesizes import letter, A4
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import inch
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
        from reportlab.lib import colors
        from reportlab.lib.enums import TA_CENTER, TA_LEFT
    except ImportError:
        raise ImportError("reportlab is required for PDF generation. Install it with: pip install reportlab")
    
    # Get report data
    report_data = get_report_summary(company_id, db, report_type, date_range)
    
    # Create PDF buffer
    buffer = BytesIO()
    
    # Create PDF document
    doc = SimpleDocTemplate(buffer, pagesize=letter, 
                           rightMargin=72, leftMargin=72,
                           topMargin=72, bottomMargin=18)
    
    # Container for the 'Flowable' objects
    elements = []
    
    # Define styles
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#1e40af'),
        spaceAfter=30,
        alignment=TA_CENTER
    )
    
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=16,
        textColor=colors.HexColor('#1e40af'),
        spaceAfter=12,
        spaceBefore=12
    )
    
    # Add title
    title = Paragraph(f"HR Analytics Report - {report_type.title()}", title_style)
    elements.append(title)
    elements.append(Spacer(1, 12))
    
    # Add report metadata
    metadata_data = [
        ['Report Type:', report_type.title()],
        ['Date Range:', report_data['date_range']],
        ['Generated:', datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')]
    ]
    
    metadata_table = Table(metadata_data, colWidths=[2*inch, 4*inch])
    metadata_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f3f4f6')),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e5e7eb'))
    ]))
    
    elements.append(metadata_table)
    elements.append(Spacer(1, 20))
    
    # Add summary section
    summary_heading = Paragraph("Report Summary", heading_style)
    elements.append(summary_heading)
    
    summary_data = [
        ['Metric', 'Value'],
        ['Total Resumes Processed', str(report_data['total_resumes'])],
        ['Shortlisted Candidates', str(report_data['shortlisted'])],
        ['Average Match Score', f"{report_data['avg_score']}%"],
        ['Top Department', report_data['top_department'] or 'N/A'],
        ['Top Skill', report_data['top_skill'] or 'N/A']
    ]
    
    summary_table = Table(summary_data, colWidths=[3*inch, 3*inch])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e40af')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 12),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('TOPPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ('FONTSIZE', (0, 1), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
        ('TOPPADDING', (0, 1), (-1, -1), 8),
    ]))
    
    elements.append(summary_table)
    elements.append(Spacer(1, 20))
    
    # Add insights section
    insights_heading = Paragraph("Key Insights", heading_style)
    elements.append(insights_heading)
    
    conversion_rate = (report_data['shortlisted'] / report_data['total_resumes'] * 100) if report_data['total_resumes'] > 0 else 0
    
    insights = [
        f"• Conversion rate from resume to shortlist: {conversion_rate:.1f}%",
        f"• Average candidate quality score: {report_data['avg_score']}%",
        f"• Most active department: {report_data['top_department'] or 'N/A'}",
        f"• Most in-demand skill: {report_data['top_skill'] or 'N/A'}"
    ]
    
    for insight in insights:
        elements.append(Paragraph(insight, styles['Normal']))
        elements.append(Spacer(1, 6))
    
    # Build PDF
    doc.build(elements)
    
    # Get PDF bytes
    pdf_bytes = buffer.getvalue()
    buffer.close()
    
    return pdf_bytes


def save_report_history(company_id: UUID, db: Session, report_name: str, report_type: str, date_range: str, report_data: dict = None):
    """
    Save a generated report to history.
    """
    from models import ReportHistory
    
    report_history = ReportHistory(
        company_id=company_id,
        report_name=report_name,
        report_type=report_type,
        date_range=date_range,
        report_data=report_data  # Already a JSON string from frontend, don't stringify again
    )
    
    db.add(report_history)
    db.commit()
    db.refresh(report_history)
    
    return report_history


def get_report_history(company_id: UUID, db: Session, limit: int = 10):
    """
    Get report history for a company, ordered by most recent first.
    """
    from models import ReportHistory
    
    reports = db.query(ReportHistory).filter(
        ReportHistory.company_id == company_id
    ).order_by(ReportHistory.generated_at.desc()).limit(limit).all()
    
    return reports
