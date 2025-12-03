"""
SendGrid email service for high deliverability
"""
import os
from dotenv import load_dotenv
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, Email, To, Content
from typing import List

# Load environment variables
load_dotenv()


def send_resume_analysis_sendgrid(
    email_to: str,
    user_name: str,
    match_score: float,
    sbert_score: float,
    skill_match_score: float,
    resume_skills: List[str],
    matched_skills: List[str],
    missing_skills: List[str],
    improvements: List[str]
) -> bool:
    """
    Send resume analysis report via SendGrid
    
    Returns:
        bool: True if sent successfully, False otherwise
    """
    
    # Get SendGrid configuration
    SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY")
    FROM_EMAIL = os.getenv("FROM_EMAIL", "prestige77810@gmail.com")
    FROM_NAME = os.getenv("FROM_NAME", "AI Resume Screening")
    
    if not SENDGRID_API_KEY:
        raise Exception("SENDGRID_API_KEY not configured in .env file")
    
    # Determine score color
    if match_score >= 70:
        score_color = '#22c55e'
        score_status = "Excellent Match!"
    elif match_score >= 50:
        score_color = '#ff9800'
        score_status = "Good Match"
    else:
        score_color = '#f44336'
        score_status = "Needs Improvement"
    
    # Generate HTML email body
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{
                font-family: 'Segoe UI', Arial, sans-serif;
                background-color: #f4f4f4;
                margin: 0;
                padding: 0;
            }}
            .container {{
                max-width: 600px;
                margin: 40px auto;
                background-color: #ffffff;
                border-radius: 12px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                overflow: hidden;
            }}
            .header {{
                background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
                color: white;
                padding: 30px;
                text-align: center;
            }}
            .header h1 {{
                margin: 0;
                font-size: 24px;
            }}
            .content {{
                padding: 30px;
            }}
            .score-section {{
                background-color: #f8f9fa;
                border-radius: 8px;
                padding: 20px;
                margin: 20px 0;
            }}
            .score-main {{
                text-align: center;
                font-size: 48px;
                font-weight: bold;
                color: {score_color};
                margin: 10px 0;
            }}
            .score-label {{
                text-align: center;
                color: #666;
                font-size: 14px;
                text-transform: uppercase;
                letter-spacing: 1px;
            }}
            .sub-scores {{
                display: flex;
                justify-content: space-around;
                margin-top: 20px;
            }}
            .sub-score {{
                text-align: center;
            }}
            .sub-score-value {{
                font-size: 24px;
                font-weight: bold;
                color: #007bff;
            }}
            .sub-score-label {{
                font-size: 12px;
                color: #666;
                margin-top: 5px;
            }}
            .section {{
                margin: 25px 0;
            }}
            .section-title {{
                color: #007bff;
                font-size: 18px;
                font-weight: 600;
                margin-bottom: 12px;
                border-bottom: 2px solid #007bff;
                padding-bottom: 5px;
            }}
            .skill-tag {{
                display: inline-block;
                background-color: #e3f2fd;
                color: #1976d2;
                padding: 6px 12px;
                border-radius: 20px;
                margin: 4px;
                font-size: 13px;
            }}
            .missing-skill {{
                background-color: #ffebee;
                color: #c62828;
            }}
            .improvement-item {{
                background-color: #fff3e0;
                border-left: 4px solid #ff9800;
                padding: 12px;
                margin: 8px 0;
                border-radius: 4px;
            }}
            .footer {{
                background-color: #f8f9fa;
                padding: 20px;
                text-align: center;
                color: #666;
                font-size: 12px;
            }}
            .greeting {{
                color: #333;
                font-size: 16px;
                margin-bottom: 20px;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>📊 Resume Analysis Report</h1>
            </div>
            
            <div class="content">
                <p class="greeting">Hi {user_name},</p>
                <p>Thank you for using our AI Resume Screening platform! Here's your detailed analysis report:</p>
                
                <div class="score-section">
                    <div class="score-label">Final Match Score</div>
                    <div class="score-main">{match_score}%</div>
                    <div style="text-align: center; color: {score_color}; font-weight: 600; margin-top: 10px;">{score_status}</div>
                    
                    <div class="sub-scores">
                        <div class="sub-score">
                            <div class="sub-score-value">{skill_match_score}%</div>
                            <div class="sub-score-label">Skill Match</div>
                        </div>
                        <div class="sub-score">
                            <div class="sub-score-value">{sbert_score}%</div>
                            <div class="sub-score-label">Semantic (SBERT)</div>
                        </div>
                    </div>
                </div>
                
                <div class="section">
                    <div class="section-title">✅ Skills Found in Your Resume ({len(resume_skills)})</div>
                    <div>
                        {''.join([f'<span class="skill-tag">{skill}</span>' for skill in resume_skills]) if resume_skills else '<p>No skills detected</p>'}
                    </div>
                </div>
                
                <div class="section">
                    <div class="section-title">🎯 Matched Skills ({len(matched_skills)})</div>
                    <div>
                        {''.join([f'<span class="skill-tag">{skill}</span>' for skill in matched_skills]) if matched_skills else '<p>None</p>'}
                    </div>
                </div>
                
                <div class="section">
                    <div class="section-title">⚠️ Missing Skills from Job Description ({len(missing_skills)})</div>
                    <div>
                        {''.join([f'<span class="skill-tag missing-skill">{skill}</span>' for skill in missing_skills]) if missing_skills else '<p style="color: #22c55e;">Great! You have all required skills.</p>'}
                    </div>
                </div>
                
                <div class="section">
                    <div class="section-title">💡 Suggested Improvements</div>
                    {''.join([f'<div class="improvement-item">{imp}</div>' for imp in improvements])}
                </div>
                
                <p style="margin-top: 30px; padding: 15px; background-color: #e3f2fd; border-radius: 8px; text-align: center;">
                    <strong>Need help improving your resume?</strong><br>
                    Visit our platform for more resources and tips!
                </p>
            </div>
            
            <div class="footer">
                <p>This is an automated email from AI Resume Screening Platform</p>
                <p>© 2025 Intelligent Resume Screening | Guided by Prof. Atul Barve</p>
                <p style="font-size: 11px; margin-top: 15px;">
                    You received this email because you requested a resume analysis report.<br>
                    If you have any questions, reply to this email.
                </p>
            </div>
        </div>
    </body>
    </html>
    """
    
    # Plain text version
    text_content = f"""
Resume Analysis Report

Hi {user_name},

Thank you for using our AI Resume Screening platform! Here's your detailed analysis report:

SCORES:
- Final Match Score: {match_score}% ({score_status})
- Skill Match: {skill_match_score}%
- Semantic Match (SBERT): {sbert_score}%

SKILLS FOUND IN YOUR RESUME ({len(resume_skills)}):
{', '.join(resume_skills) if resume_skills else 'None detected'}

MATCHED SKILLS ({len(matched_skills)}):
{', '.join(matched_skills) if matched_skills else 'None'}

MISSING SKILLS FROM JD ({len(missing_skills)}):
{', '.join(missing_skills) if missing_skills else 'Great! You have all required skills.'}

SUGGESTED IMPROVEMENTS:
{chr(10).join([f'- {imp}' for imp in improvements])}

---
Need help improving your resume? Visit our platform for more resources and tips!

This is an automated email from AI Resume Screening Platform
© 2025 Intelligent Resume Screening | Guided by Prof. Atul Barve

You received this email because you requested a resume analysis report.
If you have any questions, reply to this email.
    """
    
    try:
        # Create SendGrid message
        message = Mail(
            from_email=Email(FROM_EMAIL, FROM_NAME),
            to_emails=To(email_to),
            subject=f"Your Resume Analysis Report - {match_score}% Match",
            plain_text_content=Content("text/plain", text_content),
            html_content=Content("text/html", html_content)
        )
        
        # Send email via SendGrid
        sg = SendGridAPIClient(SENDGRID_API_KEY)
        response = sg.send(message)
        
        print(f"✅ Resume analysis report sent to {email_to} via SendGrid")
        print(f"   Status Code: {response.status_code}")
        return True
        
    except Exception as e:
        print(f"❌ Failed to send email via SendGrid: {str(e)}")
        raise Exception(f"Failed to send email: {str(e)}")
