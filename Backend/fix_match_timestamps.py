"""
One-time script to update calculated_at timestamps for existing matches.
This makes them visible in the dashboard charts which filter by date.
"""
from models.base import get_db
from models.candidate_match_model import CandidateMatch
from datetime import datetime, timezone

def update_match_timestamps():
    db = next(get_db())
    
    try:
        # Update all matches that have NULL or very old calculated_at
        matches = db.query(CandidateMatch).filter(
            CandidateMatch.calculated_at == None
        ).all()
        
        print(f"Found {len(matches)} matches with NULL calculated_at")
        
        for match in matches:
            match.calculated_at = datetime.now(timezone.utc)
        
        db.commit()
        print(f"✅ Updated {len(matches)} match timestamps")
        
        # Also update very old matches (older than 30 days)
        from datetime import timedelta
        old_date = datetime.now(timezone.utc) - timedelta(days=30)
        
        old_matches = db.query(CandidateMatch).filter(
            CandidateMatch.calculated_at < old_date
        ).all()
        
        print(f"Found {len(old_matches)} matches older than 30 days")
        
        for match in old_matches:
            match.calculated_at = datetime.now(timezone.utc)
        
        db.commit()
        print(f"✅ Updated {len(old_matches)} old match timestamps")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    update_match_timestamps()
