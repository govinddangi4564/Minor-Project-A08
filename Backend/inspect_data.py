from models.base import session
from models.candidate_model import Candidate
from models.resume_model import Resume
import json

def inspect_practicum_candidate():
    with open("candidate_dump.txt", "w", encoding="utf-8") as f:
        # Find resume with "Practicum"
        resumes = session.query(Resume).filter(Resume.parsed_text.ilike("%Practicum%")).all()
        
        if not resumes:
            f.write("No resumes found with 'Practicum'.")
            return
            
        f.write(f"Found {len(resumes)} resumes with 'Practicum'.\n\n")

        for resume in resumes:
            candidate = session.query(Candidate).filter(Candidate.resume_id == resume.resume_id).first()
            if not candidate:
                continue
                
            f.write(f"--- Candidate: {candidate.name} ({candidate.id}) ---\n")
            f.write(f"Role: {candidate.role}\n")
            f.write(f"Experience Years: {candidate.experience_years}\n")
            f.write(f"Summary: {candidate.summary}\n")
            f.write(f"Experience: {json.dumps(candidate.experience, indent=2)}\n")
            f.write(f"Education: {json.dumps(candidate.education, indent=2)}\n")
            f.write(f"Projects: {json.dumps(candidate.projects, indent=2)}\n")
            
            f.write("\n--- Raw Parsed Text (snippet) ---\n")
            # Find snippet around "Practicum"
            idx = resume.parsed_text.lower().find("practicum")
            start = max(0, idx - 100)
            end = min(len(resume.parsed_text), idx + 500)
            f.write(resume.parsed_text[start:end])
            f.write("\n------------------------------------------\n\n")

if __name__ == "__main__":
    inspect_practicum_candidate()
