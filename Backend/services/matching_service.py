from sqlalchemy.orm import Session
from uuid import UUID
from typing import List
from models import Candidate, JobDescription, CandidateMatch
from sentence_transformers import SentenceTransformer, util
import numpy as np
from datetime import datetime, timezone

# Load SBERT once
MODEL = SentenceTransformer("all-MiniLM-L6-v2")


def compute_skill_match(candidate_skills: List[str], jd_skills: List[str]):
    if not candidate_skills or not jd_skills:
        return 0.0, []

    candidate_set = set([s.lower().strip() for s in candidate_skills])
    jd_set = set([s.lower().strip() for s in jd_skills])

    matched = list(candidate_set.intersection(jd_set))

    score = (len(matched) / len(jd_set)) * 100 if jd_set else 0
    return score, matched


def compute_sbert_similarity(text1: str, text2: str) -> float:
    if not text1 or not text2:
        return 0.0

    emb1 = MODEL.encode(text1, convert_to_tensor=True)
    emb2 = MODEL.encode(text2, convert_to_tensor=True)
    similarity = float(util.cos_sim(emb1, emb2)[0][0])

    # convert (-1 to 1) to 0–100
    return round(((similarity + 1) / 2) * 100, 2)


def calculate_match_score(candidate_id: UUID, jd_id: UUID, db: Session, jd=None):
    """
    Computes matching between candidate & JD and saves into candidate_matches table.
    """

    # Fetch candidate + JD
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if jd is None:
        jd = db.query(JobDescription).filter(JobDescription.id == jd_id).first()

    if not candidate or not jd:
        raise ValueError("Invalid candidate_id or jd_id")

    # Extract required fields
    candidate_skills = candidate.skills or []
    jd_skills = jd.keywords or []

    candidate_text = (
        (candidate.summary or "") +
        " " + " ".join(candidate.skills or []) +
        " " + " ".join([exp for exp in (candidate.experience or [])])
    )

    jd_text = jd.description or ""

    # 1. Skill match score
    skill_percent, matched_skills = compute_skill_match(candidate_skills, jd_skills)

    # 2. SBERT score
    sbert_score = compute_sbert_similarity(candidate_text, jd_text)

    # 3. Final score (weighted)
    final_score = round((skill_percent * 0.6) + (sbert_score * 0.4), 2)

    # Check if match already exists for this candidate-JD combination
    existing_match = db.query(CandidateMatch).filter(
        CandidateMatch.candidate_id == candidate_id,
        CandidateMatch.jd_id == jd_id
    ).first()

    if existing_match:
        # Update existing match record
        existing_match.skill_match_percent = round(skill_percent, 2)
        existing_match.matched_skills = matched_skills
        existing_match.sbert_score = sbert_score
        existing_match.final_score = final_score
        existing_match.calculated_at = datetime.now(timezone.utc)
        match = existing_match
    else:
        # Create new match record
        match = CandidateMatch(
            candidate_id=candidate_id,
            jd_id=jd_id,
            skill_match_percent=round(skill_percent, 2),
            matched_skills=matched_skills,
            sbert_score=sbert_score,
            final_score=final_score,
            calculated_at=datetime.now(timezone.utc)
        )
        db.add(match)

    db.commit()
    db.refresh(match)

    return {
        "id": match.id,
        "candidate_id": candidate_id,
        "jd_id": jd_id,
        "skill_match_percent": round(skill_percent, 2),
        "sbert_score": sbert_score,
        "final_score": final_score,
        "matched_skills": matched_skills,
        "calculated_at": match.calculated_at
    }



def match_candidate(db: Session, candidate_id: UUID, company_id) -> List[CandidateMatch]:
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        return []
    matches = []
    job_descriptions = db.query(JobDescription).filter(JobDescription.company_id == company_id).all()

    for jd in job_descriptions:
        match = calculate_match_score(candidate_id, jd.id, db, jd)
        matches.append(match)
    return matches


def match_all_candidates(db: Session, company_id) -> List[CandidateMatch]:
    candidates = db.query(Candidate).filter(Candidate.company_id == company_id).all()
    all_matches = []
    for c in candidates:
        all_matches.extend(match_candidate(db, c.id, company_id))
    return all_matches
