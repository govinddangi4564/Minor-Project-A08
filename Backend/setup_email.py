"""
Quick setup script to configure email settings for the HR system.
Run this script to easily set up your .env file.
"""

import os
from pathlib import Path

def setup_email_config():
    print("=" * 60)
    print("📧 HR SYSTEM - EMAIL CONFIGURATION SETUP")
    print("=" * 60)
    print()
    
    # Get Backend directory
    backend_dir = Path(__file__).parent
    env_file = backend_dir / ".env"
    
    print("This script will help you configure email settings.")
    print()
    
    # Check if .env already exists
    if env_file.exists():
        print("⚠️  .env file already exists!")
        overwrite = input("Do you want to overwrite it? (yes/no): ").lower()
        if overwrite != 'yes':
            print("❌ Setup cancelled.")
            return
    
    print()
    print("Choose your email provider:")
    print("1. Gmail (Recommended for testing)")
    print("2. Outlook/Office 365")
    print("3. Custom SMTP Server")
    print()
    
    choice = input("Enter your choice (1-3): ").strip()
    
    if choice == "1":
        smtp_host = "smtp.gmail.com"
        smtp_port = "587"
        print()
        print("📌 Gmail Setup Instructions:")
        print("1. Enable 2-Factor Authentication on your Google Account")
        print("2. Generate App Password at: https://myaccount.google.com/apppasswords")
        print("3. Use the 16-character app password below (not your regular password)")
        print()
    elif choice == "2":
        smtp_host = "smtp.office365.com"
        smtp_port = "587"
        print()
        print("📌 Outlook Setup:")
        print("Use your regular Outlook email and password")
        print()
    elif choice == "3":
        smtp_host = input("Enter SMTP host (e.g., smtp.yourserver.com): ").strip()
        smtp_port = input("Enter SMTP port (usually 587 or 465): ").strip()
    else:
        print("❌ Invalid choice. Setup cancelled.")
        return
    
    # Get email credentials
    smtp_user = input("Enter your email address: ").strip()
    smtp_password = input("Enter your password/app password: ").strip()
    from_name = input("Enter sender name (e.g., 'HR Recruitment System'): ").strip() or "HR Recruitment System"
    
    # Create .env content
    env_content = f"""# Email Configuration
SMTP_HOST={smtp_host}
SMTP_PORT={smtp_port}
SMTP_USER={smtp_user}
SMTP_PASSWORD={smtp_password}
FROM_EMAIL={smtp_user}
FROM_NAME={from_name}

# Database Configuration (update if needed)
DATABASE_URL=postgresql://postgres:password@localhost:5432/hr_system

# JWT Settings (update if needed)
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
"""
    
    # Write to .env file
    with open(env_file, 'w') as f:
        f.write(env_content)
    
    print()
    print("=" * 60)
    print("✅ Email configuration saved to .env file!")
    print("=" * 60)
    print()
    print("📝 Next steps:")
    print("1. Start your backend server: uvicorn main:app --reload")
    print("2. Schedule an interview via the frontend")
    print("3. Check your email inbox for the invitation")
    print()
    print("💡 Tip: Check the console for email sending status")
    print()
    
    # Test email configuration
    test = input("Do you want to test the email configuration now? (yes/no): ").lower()
    if test == 'yes':
        test_email_config(smtp_host, smtp_port, smtp_user, smtp_password)

def test_email_config(smtp_host, smtp_port, smtp_user, smtp_password):
    """Test email configuration by sending a test email."""
    print()
    print("🧪 Testing email configuration...")
    
    try:
        import smtplib
        from email.mime.text import MIMEText
        
        # Create test message
        msg = MIMEText("This is a test email from your HR System. Email configuration is working correctly!")
        msg['Subject'] = "HR System - Email Test"
        msg['From'] = smtp_user
        msg['To'] = smtp_user  # Send to yourself
        
        # Send email
        with smtplib.SMTP(smtp_host, int(smtp_port)) as server:
            server.starttls()
            server.login(smtp_user, smtp_password)
            server.send_message(msg)
        
        print("✅ Test email sent successfully!")
        print(f"📧 Check your inbox at: {smtp_user}")
        
    except Exception as e:
        print(f"❌ Email test failed: {str(e)}")
        print()
        print("Common issues:")
        print("- Gmail: Make sure you're using an App Password, not your regular password")
        print("- Check that 2-Factor Authentication is enabled (for Gmail)")
        print("- Verify SMTP host and port are correct")
        print("- Check your firewall settings")

if __name__ == "__main__":
    try:
        setup_email_config()
    except KeyboardInterrupt:
        print("\n\n❌ Setup cancelled by user.")
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
