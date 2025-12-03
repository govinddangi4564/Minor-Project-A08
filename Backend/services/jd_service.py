from sqlalchemy.orm import Session
from uuid import UUID

from models.job_description_model import JobDescription
from schemas.jd_schema import JDBase, JDUpdate
from models.user_model import UserModel
from models.companies_model import Company

class JDUserService:

    @staticmethod
    def get_all(db: Session, user: UserModel):
        return db.query(JobDescription).filter(JobDescription.created_by == user.user_id).all()

    @staticmethod
    def get_by_id(db: Session, jd_id: UUID, user: UserModel):
        return db.query(JobDescription).filter(JobDescription.id == jd_id, JobDescription.created_by == user.user_id).first()

    @staticmethod
    def create(db: Session, data: JDBase, user: UserModel):
        jd = JobDescription(**data.model_dump())
        jd.created_by = user.user_id
        db.add(jd)
        db.commit()
        db.refresh(jd)
        return jd

    @staticmethod
    def update(db: Session, jd_id: UUID, data: JDUpdate, user: UserModel):
        jd = db.query(JobDescription).filter(JobDescription.id == jd_id, JobDescription.created_by == user.user_id).first()
        if not jd:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(jd, key, value)

        db.commit()
        db.refresh(jd)
        return jd

    @staticmethod
    def delete(db: Session, jd_id: UUID, user: UserModel):
        jd = db.query(JobDescription).filter(JobDescription.id == jd_id, JobDescription.created_by == user.user_id).first()
        if not jd:
            return False
        db.delete(jd)
        db.commit()
        return True



class JDCompanyService:

    @staticmethod
    def get_all(db: Session, company: Company):
        return db.query(JobDescription).filter(JobDescription.company_id == company.id).all()

    @staticmethod
    def get_by_id(db: Session, jd_id: UUID, company: Company):
        return db.query(JobDescription).filter(JobDescription.id == jd_id, JobDescription.company_id == company.id).first()

    @staticmethod
    def create(db: Session, data: JDBase, company: Company):
        jd = JobDescription(**data.model_dump())
        jd.company_id = company.id
        db.add(jd)
        db.commit()
        db.refresh(jd)
        db.refresh(jd)
        
        # Trigger matching for all candidates
        try:
            from models.candidate_model import Candidate
            from services.matching_service import calculate_match_score
            candidates = db.query(Candidate).filter(Candidate.company_id == company.id).all()
            for cand in candidates:
                calculate_match_score(cand.id, jd.id, db, jd)
        except Exception as e:
            print(f"Error triggering matching: {e}")
            
        return jd

    @staticmethod
    def update(db: Session, jd_id: UUID, data: JDUpdate, company: Company):
        jd = db.query(JobDescription).filter(JobDescription.id == jd_id, JobDescription.company_id == company.id).first()
        if not jd:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(jd, key, value)

        db.commit()
        db.refresh(jd)
        return jd

    @staticmethod
    def delete(db: Session, jd_id: UUID, company: Company):
        jd = db.query(JobDescription).filter(JobDescription.id == jd_id, JobDescription.company_id == company.id).first()
        if not jd:
            return False
        db.delete(jd)
        db.commit()
        return True
