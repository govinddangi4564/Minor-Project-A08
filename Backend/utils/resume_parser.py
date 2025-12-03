import fitz  # PyMuPDF
import re
from utils.log_config import logger

def extract_text_from_pdf(file_path):
    """
    Extracts text from a PDF file using PyMuPDF (fitz).
    """
    try:
        doc = fitz.open(file_path)
        text = ""
        for page in doc:
            text += page.get_text()
        return text
    except Exception as e:
        logger.error(f"Error extracting text from PDF: {e}")
        return ""

def clean_text(text):
    """
    Cleans and normalizes text.
    """
    if not text:
        return ""
    # Replace unicode characters
    text = text.replace('\u2022', '-').replace('\u2023', '-').replace('\u25CF', '-').replace('\uf0b7', '-')
    # Remove multiple spaces
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def normalize_spaced_headers(text):
    """
    Normalizes headers that have spaces between letters.
    For example: 'E X P E R I E N C E' -> 'EXPERIENCE'
    """
    # Pattern to match spaced-out words (single letter followed by space, repeated)
    # This will match patterns like "E X P E R I E N C E" or "P R O J E C T S"
    pattern = r'\b([A-Z](\s+[A-Z])+)\b'
    
    def remove_spaces(match):
        return match.group(0).replace(' ', '')
    
    return re.sub(pattern, remove_spaces, text)

def is_valid_header(text, match_start, match_end, header):
    """
    Validates if a matched text is likely a real header.
    Criteria:
    1. Line containing the match should be relatively short (< 80 chars).
    2. The header should be at the beginning of the line (ignoring bullets/spaces).
    3. After the header, there should be minimal text (colon, or just a few words/symbols).
    """
    # Find start and end of the line containing the match
    line_start = text.rfind('\n', 0, match_start) + 1
    line_end = text.find('\n', match_end)
    if line_end == -1:
        line_end = len(text)
        
    line = text[line_start:line_end].strip()
    
    # Check line length
    if len(line) > 80:
        return False
        
    # Clean bullets from line start
    line_clean = re.sub(r'^[\-\u2022\u2023\u25CF\uf0b7\*\s]+', '', line).lower()
    
    # Check if line starts with header
    if not line_clean.startswith(header.lower()):
        return False
    
    # Additional check: What comes after the header?
    # A real header should have:
    # - Just the header word + colon (e.g., "Projects:")
    # - Or the header word + some punctuation/spaces only (e.g., "Projects  ")
    # - Or the header with a qualifier (e.g., "Educational Qualifications :")
    # NOT: "Education hub (An institutional website project)" <- this is content, not a header
    
    after_header = line_clean[len(header.lower()):].strip()
    
    # If there's substantial text after the header (more than just punctuation), it's likely not a header
    # Allow: empty, colon, spaces, or a few words like "qualifications" (multi-word headers)
    if after_header:
        # Remove common punctuation
        after_header_no_punct = after_header.replace(':', '').replace('-', '').replace(' ', '').strip()
        
        # If there's more than ~20 characters of actual content after,  it's likely not a header
        if len(after_header_no_punct) > 20:
            return False
        
        # Check if it contains parentheses or other content indicators
        if '(' in after_header or ')' in after_header:
            return False
        
    return True

def extract_section(text, section_headers):
    """
    Extracts text belonging to a specific section based on headers.
    """
    text_lower = text.lower()
    section_start = -1
    best_header_len = 0
    
    # Find the start of the section
    # We want the EARLIEST valid header match.
    # If multiple headers match at the same position (e.g. "Education" and "Educational Qualifications"),
    # we prefer the longer one to be safe, but position is king.
    
    candidates = []
    
    for header in section_headers:
        pattern = r'\b' + re.escape(header.lower()) + r'\b'
        for match in re.finditer(pattern, text_lower):
            if is_valid_header(text, match.start(), match.end(), header):
                candidates.append((match.start(), match.end(), header))
    
    if not candidates:
        return ""
        
    # Sort by start position
    candidates.sort(key=lambda x: x[0])
    
    # Pick the first one
    section_start = candidates[0][0]
    # section_end_of_header = candidates[0][1]

    # Find the start of the next section
    all_headers = [
        "experience", "work history", "employment", "professional experience", "work experience",
        "practicum experience", "teaching experience", "internship", "internships", "career history",
        "employment history", "professional background",
        "education", "academic", "qualifications", "educational qualifications", "academic background",
        "education & qualifications", "scholastic achievements", "relevant coursework",
        "projects", "key projects", "academic projects", "personal projects", "project experience",
        "software engineering projects", "technical projects",
        "skills", "technical skills", "technologies", "core competencies", "technical proficiency",
        "summary", "profile", "professional summary", "objective", "career objective", "about me",
        "certifications", "achievements", "awards", "languages", "interests", "hobbies",
        "strength", "strengths", "personal details", "declaration", "personal profile"
    ]
    
    # Exclude current section headers from the next section search
    section_headers_lower = [h.lower() for h in section_headers]
    all_headers = [h for h in all_headers if h not in section_headers_lower]
    
    next_section_start = len(text)
    
    for header in all_headers:
        pattern = r'\b' + re.escape(header) + r'\b'
        for match in re.finditer(pattern, text_lower):
            if match.start() > section_start + 10: # +10 to avoid matching the same header
                if match.start() < next_section_start:
                    if is_valid_header(text, match.start(), match.end(), header):
                        next_section_start = match.start()
    
    # Extract the content
    content = text[section_start:next_section_start]
    
    # Remove the header itself from the content
    lines = content.split('\n')
    if lines:
        # Check if first line contains the header
        # We know it does because we found it there, but let's be safe and remove the first line
        # if it looks like just a header.
        if len(lines[0].strip()) < 80:
             lines = lines[1:]
                
    return "\n".join(lines).strip()
    
def extract_skills_from_text(text):
    """
    Extracts skills from text using a predefined list of common skills.
    """
    common_skills = [
        "Python", "Java", "C++", "C#", "JavaScript", "TypeScript", "React", "Angular", "Vue.js", 
        "Node.js", "Express", "Django", "Flask", "FastAPI", "Spring Boot", "ASP.NET",
        "SQL", "MySQL", "PostgreSQL", "MongoDB", "Redis", "Oracle", "Cassandra",
        "AWS", "Azure", "GCP", "Docker", "Kubernetes", "Jenkins", "Terraform", "Ansible",
        "Git", "GitHub", "GitLab", "CI/CD", "Linux", "Unix", "Bash", "Shell Scripting",
        "Machine Learning", "Deep Learning", "Data Science", "NLP", "Computer Vision",
        "TensorFlow", "PyTorch", "Scikit-learn", "Pandas", "NumPy", "Matplotlib",
        "HTML", "CSS", "SASS", "LESS", "Bootstrap", "Tailwind CSS",
        "Agile", "Scrum", "Kanban", "Jira", "Confluence",
        "Communication", "Leadership", "Teamwork", "Problem Solving", "Critical Thinking"
    ]
    
    # Try to find a specific skills section first
    skills_text = extract_section(text, ["Skills", "Technical Skills", "Technologies", "Core Competencies", "Technical Proficiency"])
    search_text = skills_text if skills_text else text
    
    found_skills = set()
    for skill in common_skills:
        if re.search(r'\b' + re.escape(skill) + r'\b', search_text, re.IGNORECASE):
            found_skills.add(skill)
            
    return list(found_skills)

def parse_resume(text, department=None):
    """
    Parses resume text to extract structured data using section-based extraction.
    """
    # Normalize spaced-out headers first (e.g., "E X P E R I E N C E" -> "EXPERIENCE")
    text = normalize_spaced_headers(text)
    
    data = {
        "name": "Unknown",
        "email": "",
        "phone": "",
        "skills": [],
        "experience_years": 0,
        "experience": [],
        "education": [],
        "summary": "",
        "projects": [],
        "department": department or "General",
        "role": "Candidate"
    }
    
    try:
        # --- 1. Contact Info ---
        # Email
        email_match = re.search(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', text)
        if email_match:
            data["email"] = email_match.group(0)
            
        # Phone
        phone_match = re.search(r'(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}', text)
        if phone_match:
            data["phone"] = phone_match.group(0).strip()

        # --- 2. Name ---
        lines = [line.strip() for line in text.split('\n') if line.strip()]
        common_headers_lower = ["resume", "curriculum vitae", "cv", "bio", "profile", "summary"]
        
        for line in lines[:10]: # Check first 10 lines
            line_lower = line.lower()
            if line_lower not in common_headers_lower and len(line.split()) < 6:
                # Check if it looks like a name
                if not re.search(r'\d', line) and "@" not in line:
                    # Remove "Name:" prefix if present
                    clean_name = re.sub(r'^name\s*[:\-]\s*', '', line, flags=re.IGNORECASE).strip()
                    if clean_name:
                        data["name"] = clean_name
                        break

        # --- 3. Skills ---
        common_skills = [
            "Python", "Java", "C++", "C#", "JavaScript", "TypeScript", "React", "Angular", "Vue.js", 
            "Node.js", "Express", "Django", "Flask", "FastAPI", "Spring Boot", "ASP.NET",
            "SQL", "MySQL", "PostgreSQL", "MongoDB", "Redis", "Oracle", "Cassandra",
            "AWS", "Azure", "GCP", "Docker", "Kubernetes", "Jenkins", "Terraform", "Ansible",
            "Git", "GitHub", "GitLab", "CI/CD", "Linux", "Unix", "Bash", "Shell Scripting",
            "Machine Learning", "Deep Learning", "Data Science", "NLP", "Computer Vision",
            "TensorFlow", "PyTorch", "Scikit-learn", "Pandas", "NumPy", "Matplotlib",
            "HTML", "CSS", "SASS", "LESS", "Bootstrap", "Tailwind CSS",
            "Agile", "Scrum", "Kanban", "Jira", "Confluence",
            "Communication", "Leadership", "Teamwork", "Problem Solving", "Critical Thinking"
        ]
        
        skills_text = extract_section(text, ["Skills", "Technical Skills", "Technologies", "Core Competencies", "Technical Proficiency"])
        search_text = skills_text if skills_text else text
        
        found_skills = set()
        for skill in common_skills:
            if re.search(r'\b' + re.escape(skill) + r'\b', search_text, re.IGNORECASE):
                found_skills.add(skill)
        data["skills"] = list(found_skills)

        # --- 4. Experience ---
        exp_headers = [
            "Experience", "Work History", "Employment", "Professional Experience", "Work Experience",
            "Practicum Experience", "Teaching Experience", "Internship", "Internships", "Career History",
            "Employment History", "Professional Background"
        ]
        exp_text = extract_section(text, exp_headers)
        
        if exp_text:
            exp_lines = []
            for line in exp_text.split('\n'):
                line = line.strip()
                if line:
                    # Clean bullet points and special characters
                    line = re.sub(r'^[\-\u2022\u2023\u25CF\uf0b7\*\s]+', '', line).strip()
                    # Only add if there's meaningful content left
                    if line and len(line) > 2:
                        exp_lines.append(line)
            data["experience"] = exp_lines
            
            years = re.findall(r'\b(19|20)\d{2}\b', exp_text)
            if years:
                years = [int(y) for y in years]
                if len(years) >= 2:
                    data["experience_years"] = max(years) - min(years)
        
        if data["experience_years"] == 0:
             exp_match = re.search(r'(\d+)\+?\s*years?', text, re.IGNORECASE)
             if exp_match:
                try:
                    data["experience_years"] = int(exp_match.group(1))
                except ValueError:
                    pass

        # --- 5. Education ---
        edu_headers = [
            "Education", "Academic", "Qualifications", "Educational Qualifications", "Academic Background",
            "Education & Qualifications", "Scholastic Achievements"
        ]
        edu_text = extract_section(text, edu_headers)
        
        if edu_text:
            edu_lines = []
            for line in edu_text.split('\n'):
                line = line.strip()
                if line:
                    # Clean bullet points and special characters
                    line = re.sub(r'^[\-\u2022\u2023\u25CF\uf0b7\*\s]+', '', line).strip()
                    # Only add if there's meaningful content left
                    if line and len(line) > 2:
                        edu_lines.append(line)
            data["education"] = edu_lines
        else:
            education_keywords = ["Bachelor", "Master", "PhD", "B.Sc", "M.Sc", "B.Tech", "M.Tech", "University", "College", "Degree"]
            found_education = []
            for line in lines:
                if any(keyword in line for keyword in education_keywords):
                    found_education.append(line)
            data["education"] = found_education

        # --- 6. Projects ---
        proj_headers = [
            "Projects", "Key Projects", "Academic Projects", "Personal Projects", "Project Experience",
            "Software Engineering Projects", "Technical Projects"
        ]
        proj_text = extract_section(text, proj_headers)
        
        if proj_text:
            proj_lines = []
            for line in proj_text.split('\n'):
                line = line.strip()
                if line:
                    # Clean bullet points and special characters
                    line = re.sub(r'^[\-\u2022\u2023\u25CF\uf0b7\*\s]+', '', line).strip()
                    # Only add if there's meaningful content left
                    if line and len(line) > 2:
                        proj_lines.append(line)
            data["projects"] = proj_lines

        # --- 7. Summary ---
        summary_headers = ["Summary", "Profile", "Professional Summary", "Objective", "Career Objective", "About Me"]
        summary_text = extract_section(text, summary_headers)
        
        if summary_text:
            summary_lines = [line.strip() for line in summary_text.split('\n') if line.strip()]
            data["summary"] = " ".join(summary_lines[:5])
        else:
            start_index = 0
            if data["name"]: start_index += 1
            if data["email"]: start_index += 1
            if data["phone"]: start_index += 1
            if len(lines) > start_index:
                data["summary"] = " ".join(lines[start_index:start_index+4])

        # --- 8. Role ---
        if data["experience"]:
            first_exp_line = data["experience"][0]
            if len(first_exp_line.split()) < 6:
                data["role"] = first_exp_line
        
        if data["role"] == "Candidate":
             if department:
                 data["role"] = f"{department} Professional"

    except Exception as e:
        logger.error(f"Error parsing resume: {e}")
        
    return data
