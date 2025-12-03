from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID


class CompanyDashboardTrends(BaseModel):
    weekly_growth: int
    conversion_rate: int
    top_department: Optional[str]
    top_dept_score: float = 0.0
    top_skill: Optional[str]


class CompanyDashboardStatsResponse(BaseModel):
    resumes_scanned: int
    shortlisted: int
    avg_match_score: float
    active_jds: int
    trends: CompanyDashboardTrends


class SkillStat(BaseModel):
    name: str
    count: int
    percentage: float


class SkillsDistributionResponse(BaseModel):
    skills: List[SkillStat]


class DailyTrend(BaseModel):
    date: str
    avg_score: float
    shortlisted_count: int
    total_candidates: int

class JDTrend(BaseModel):
    jd_id: UUID
    jd_title: str
    daily_scores: List[DailyTrend]

class MatchTrendsResponse(BaseModel):
    trends: List[DailyTrend]
    jd_breakdown: List[JDTrend]


class BenchmarkMetric(BaseModel):
    company_value: float
    industry_average: float
    difference: float
    percentage_diff: float


class BenchmarksResponse(BaseModel):
    match_score: BenchmarkMetric
    time_to_hire: BenchmarkMetric
    conversion_rate: BenchmarkMetric
    quality_score: BenchmarkMetric


class ReportGenerateRequest(BaseModel):
    report_type: str  # summary, detailed, weekly, monthly
    date_range: int  # days or 'all'


class ReportSummaryResponse(BaseModel):
    total_resumes: int
    shortlisted: int
    avg_score: float
    top_department: Optional[str]
    top_skill: Optional[str]
    report_type: str
    date_range: str
