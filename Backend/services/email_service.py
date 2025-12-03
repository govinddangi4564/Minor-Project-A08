"""
Email service for sending interview invitations and notifications.
Supports both Gmail SMTP and other email providers.
"""
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from typing import List, Optional
import os
from dotenv import load_dotenv

load_dotenv()

# Email configuration from environment variables
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
FROM_EMAIL = os.getenv("FROM_EMAIL", SMTP_USER)
FROM_NAME = os.getenv("FROM_NAME", "HR Recruitment System")


def send_interview_invitation(
    candidate_name: str,
    candidate_email: str,
    interviewer_emails: List[str],
    interview_type: str,
    scheduled_date: str,
    scheduled_time: str,
    duration_minutes: int,
    notes: Optional[str] = None,
    company_name: str = "Our Company"
) -> bool:
    """
    Send interview invitation email to candidate and interviewers.
    
    Args:
        candidate_name: Name of the candidate
        candidate_email: Email of the candidate
        interviewer_emails: List of interviewer email addresses
        interview_type: Type of interview (e.g., "Technical Round")
        scheduled_date: Date in YYYY-MM-DD format
        scheduled_time: Time in HH:MM format
        duration_minutes: Duration of interview in minutes
        notes: Optional notes or special instructions
        company_name: Name of the company
    
    Returns:
        bool: True if email sent successfully, False otherwise
    """
    
    if not SMTP_USER or not SMTP_PASSWORD:
        print("⚠️ Email credentials not configured. Set SMTP_USER and SMTP_PASSWORD in .env file")
        return False
    
    try:
        # Create email content
        subject = f"Interview Scheduled: {interview_type} - {company_name}"
        
        # HTML email body
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                .content {{ background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }}
                .info-box {{ background: white; padding: 20px; margin: 20px 0; border-left: 4px solid #667eea; border-radius: 5px; }}
                .info-row {{ margin: 10px 0; }}
                .label {{ font-weight: bold; color: #667eea; }}
                .footer {{ text-align: center; margin-top: 30px; color: #666; font-size: 12px; }}
                .button {{ display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🎯 Interview Scheduled</h1>
                </div>
                <div class="content">
                    <p>Dear {candidate_name},</p>
                    
                    <p>We are pleased to inform you that an interview has been scheduled for the position you applied for.</p>
                    
                    <div class="info-box">
                        <h3 style="margin-top: 0; color: #667eea;">Interview Details</h3>
                        <div class="info-row">
                            <span class="label">📋 Interview Type:</span> {interview_type}
                        </div>
                        <div class="info-row">
                            <span class="label">📅 Date:</span> {scheduled_date}
                        </div>
                        <div class="info-row">
                            <span class="label">⏰ Time:</span> {scheduled_time}
                        </div>
                        <div class="info-row">
                            <span class="label">⏱️ Duration:</span> {duration_minutes} minutes
                        </div>
                        {f'<div class="info-row"><span class="label">📝 Notes:</span> {notes}</div>' if notes else ''}
                    </div>
                    
                    <p><strong>What to expect:</strong></p>
                    <ul>
                        <li>The interview will be conducted by our technical team</li>
                        <li>Please be prepared to discuss your experience and skills</li>
                        <li>Have your resume and any relevant work samples ready</li>
                    </ul>
                    
                    <p>If you need to reschedule or have any questions, please contact us as soon as possible.</p>
                    
                    <p>We look forward to speaking with you!</p>
                    
                    <p>Best regards,<br>
                    <strong>{company_name} Recruitment Team</strong></p>
                </div>
                <div class="footer">
                    <p>This is an automated message from {company_name} HR System</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        # Plain text version
        text_body = f"""
Interview Scheduled

Dear {candidate_name},

We are pleased to inform you that an interview has been scheduled for the position you applied for.

Interview Details:
- Interview Type: {interview_type}
- Date: {scheduled_date}
- Time: {scheduled_time}
- Duration: {duration_minutes} minutes
{f'- Notes: {notes}' if notes else ''}

What to expect:
- The interview will be conducted by our technical team
- Please be prepared to discuss your experience and skills
- Have your resume and any relevant work samples ready

If you need to reschedule or have any questions, please contact us as soon as possible.

We look forward to speaking with you!

Best regards,
{company_name} Recruitment Team

---
This is an automated message from {company_name} HR System
        """
        
        # Create message
        message = MIMEMultipart("alternative")
        message["Subject"] = subject
        message["From"] = f"{FROM_NAME} <{FROM_EMAIL}>"
        message["To"] = candidate_email
        
        # Add CC for interviewers
        if interviewer_emails:
            message["Cc"] = ", ".join(interviewer_emails)
        
        # Attach both plain text and HTML versions
        part1 = MIMEText(text_body, "plain")
        part2 = MIMEText(html_body, "html")
        message.attach(part1)
        message.attach(part2)
        
        # Send email
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            
            # Send to candidate and CC to interviewers
            recipients = [candidate_email] + (interviewer_emails or [])
            server.send_message(message, FROM_EMAIL, recipients)
        
        print(f"✅ Interview invitation sent to {candidate_email}")
        if interviewer_emails:
            print(f"   CC'd to: {', '.join(interviewer_emails)}")
        
        return True
        
    except Exception as e:
        print(f"❌ Failed to send email: {str(e)}")
        return False


def send_interview_cancellation(
    candidate_name: str,
    candidate_email: str,
    interview_type: str,
    scheduled_date: str,
    scheduled_time: str,
    company_name: str = "Our Company"
) -> bool:
    """
    Send interview cancellation email to candidate.
    """
    
    if not SMTP_USER or not SMTP_PASSWORD:
        print("⚠️ Email credentials not configured")
        return False
    
    try:
        subject = f"Interview Cancelled: {interview_type} - {company_name}"
        
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: #ef4444; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                .content {{ background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }}
                .info-box {{ background: white; padding: 20px; margin: 20px 0; border-left: 4px solid #ef4444; border-radius: 5px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>❌ Interview Cancelled</h1>
                </div>
                <div class="content">
                    <p>Dear {candidate_name},</p>
                    
                    <p>We regret to inform you that the following interview has been cancelled:</p>
                    
                    <div class="info-box">
                        <div><strong>Interview Type:</strong> {interview_type}</div>
                        <div><strong>Date:</strong> {scheduled_date}</div>
                        <div><strong>Time:</strong> {scheduled_time}</div>
                    </div>
                    
                    <p>We apologize for any inconvenience this may cause. We will contact you shortly to reschedule.</p>
                    
                    <p>Best regards,<br>
                    <strong>{company_name} Recruitment Team</strong></p>
                </div>
            </div>
        </body>
        </html>
        """
        
        message = MIMEMultipart("alternative")
        message["Subject"] = subject
        message["From"] = f"{FROM_NAME} <{FROM_EMAIL}>"
        message["To"] = candidate_email
        
        message.attach(MIMEText(html_body, "html"))
        
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.send_message(message, FROM_EMAIL, [candidate_email])
        
        print(f"✅ Cancellation email sent to {candidate_email}")
        return True
        
    except Exception as e:
        print(f"❌ Failed to send cancellation email: {str(e)}")
        return False
