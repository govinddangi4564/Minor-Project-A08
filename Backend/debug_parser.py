import re

# Raw text from the candidate dump
raw_text = """                                           Resume 
Name: Ashish Singh 
DOB: 11/05/2005 
Add. - 293, prem Vila, scheme no.78, Vijay Nagar, Indore. 
Dist.- Indore  
Pin code: 452010 
Mobile no. 9399649234 
Email id: a6272936@gmail.com 
 
Career objective: 
                                   As a Computer Science Engineering 
student, I aim to begin my career in a dynamic and growth-
oriented organization where I can apply my technical 
knowledge, problem-solving skills, and passion for software 
development to contribute to innovative projects. 
Skills: 
  Language: C, C++,Java, HTML, CSS. 
  Database: MySQL. 
  Tools: VS Code, Sublime Text,ApacheNetbeans IDE. 
  Operating system: Mac. 
Educational Qualifications : 
 B.Tech in CS Branch pursuing from PIEMR Indore. 
 12th passed from M.P. Board with 83%. 
 10th Passed from M.P. Board with 84%. 
Projects:  
 Education hub (An institutional  website project) 
 Blood donation (A Blood bank website project) 
Certifications:  
 C++oops 30 days Training program at Universal 
informatics. 
  Java 90 days Training program at universal informatics. 
 Programming using java certificate by infosys springboard. 
 Database management system certificate by infosys 
springboard. 
Strength: 
 Smart worker 
 Self-learner 
 Adaptability 
Personal details: 
 Father’s name – Mr. Ajay Singh {Farmer} 
 Mother's name – Mrs. Arti Singh {Home maker} 
 Younger Brother – Adarsh Singh {School going student} 
Declaration: 
              I hereby declare that all the information is given above 
is true to the best of my knowledge and belief. 
Place: Indore (M.P.)                                      Ashish singh 
"""

def clean_text(text):
    if not text:
        return ""
    # Replace unicode characters
    text = text.replace('\u2022', '-').replace('\u2023', '-').replace('\u25CF', '-').replace('\uf0b7', '-')
    # Remove multiple spaces
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def extract_section(text, section_headers, log_file):
    text_lower = text.lower()
    section_start = -1
    
    log_file.write(f"Scanning for headers: {section_headers}\n")
    
    # Find the start of the section
    for header in section_headers:
        pattern = r'\b' + re.escape(header.lower()) + r'\b'
        match = re.search(pattern, text_lower)
        if match:
            log_file.write(f"Found header '{header}' at index {match.start()}\n")
            section_start = match.start()
            break
            
    if section_start == -1:
        log_file.write("Header not found.\n")
        return ""

    # Find the start of the next section
    all_headers = [
        "experience", "work history", "employment", "professional experience",
        "education", "academic", "qualifications", "educational qualifications",
        "projects", "key projects", "academic projects",
        "skills", "technical skills", "technologies", "core competencies",
        "summary", "profile", "professional summary", "objective", "career objective",
        "certifications", "achievements", "awards", "languages", "interests",
        "strength", "personal details", "declaration"
    ]
    
    next_section_start = len(text)
    
    for header in all_headers:
        pattern = r'\b' + re.escape(header) + r'\b'
        matches = list(re.finditer(pattern, text_lower))
        for match in matches:
            if match.start() > section_start + 10: 
                if match.start() < next_section_start:
                    log_file.write(f"Found next section header '{header}' at {match.start()}\n")
                    next_section_start = match.start()
    
    content = text[section_start:next_section_start]
    log_file.write(f"Raw content extracted ({len(content)} chars):\n{content!r}\n")
    
    lines = content.split('\n')
    if lines:
        first_line_clean = clean_text(lines[0]).lower()
        for header in section_headers:
            if header.lower() in first_line_clean:
                lines = lines[1:]
                break
                
    return "\n".join(lines).strip()

def test_parsing():
    with open("debug_output.txt", "w", encoding="utf-8") as f:
        f.write("--- Testing Education Extraction ---\n")
        edu_headers = ["Education", "Academic", "Qualifications", "Academic Background", "Educational Qualifications"]
        edu_text = extract_section(raw_text, edu_headers, f)
        f.write("\nFinal Education Text:\n")
        f.write(edu_text)
        
        f.write("\n\n--- Testing Projects Extraction ---\n")
        proj_headers = ["Projects", "Key Projects"]
        proj_text = extract_section(raw_text, proj_headers, f)
        f.write("\nFinal Projects Text:\n")
        f.write(proj_text)

if __name__ == "__main__":
    test_parsing()
