"""
Email Configuration Verification Script
This script checks if your email settings are correct and can send emails.
"""

import os
from dotenv import load_dotenv
import smtplib
from email.mime.text import MIMEText

# Load environment variables
load_dotenv()

def check_email_config():
    print("=" * 60)
    print("📧 EMAIL CONFIGURATION VERIFICATION")
    print("=" * 60)
    print()
    
    # Check if all required variables are set
    required_vars = {
        'SMTP_HOST': os.getenv('SMTP_HOST'),
        'SMTP_PORT': os.getenv('SMTP_PORT'),
        'SMTP_USER': os.getenv('SMTP_USER'),
        'SMTP_PASSWORD': os.getenv('SMTP_PASSWORD'),
        'FROM_EMAIL': os.getenv('FROM_EMAIL'),
        'FROM_NAME': os.getenv('FROM_NAME')
    }
    
    print("1️⃣ Checking Environment Variables:")
    print("-" * 60)
    
    all_set = True
    for var_name, var_value in required_vars.items():
        if var_value:
            # Mask password for security
            if 'PASSWORD' in var_name:
                display_value = '*' * len(var_value) if len(var_value) > 0 else 'NOT SET'
            else:
                display_value = var_value
            print(f"✅ {var_name:20} = {display_value}")
        else:
            print(f"❌ {var_name:20} = NOT SET")
            all_set = False
    
    print()
    
    if not all_set:
        print("❌ ERROR: Some required variables are not set!")
        print()
        print("Please make sure your .env file contains:")
        print("""
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
FROM_EMAIL=your-email@gmail.com
FROM_NAME=HR Recruitment System
        """)
        return False
    
    print("✅ All environment variables are set!")
    print()
    
    # Test SMTP connection
    print("2️⃣ Testing SMTP Connection:")
    print("-" * 60)
    
    try:
        smtp_host = required_vars['SMTP_HOST']
        smtp_port = int(required_vars['SMTP_PORT'])
        smtp_user = required_vars['SMTP_USER']
        smtp_password = required_vars['SMTP_PASSWORD']
        
        print(f"Connecting to {smtp_host}:{smtp_port}...")
        
        with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as server:
            print("✅ Connected to SMTP server")
            
            print("Starting TLS encryption...")
            server.starttls()
            print("✅ TLS encryption enabled")
            
            print("Authenticating...")
            server.login(smtp_user, smtp_password)
            print("✅ Authentication successful!")
        
        print()
        print("=" * 60)
        print("🎉 EMAIL CONFIGURATION IS CORRECT!")
        print("=" * 60)
        print()
        
        # Offer to send test email
        send_test = input("Would you like to send a test email to yourself? (yes/no): ").lower()
        
        if send_test == 'yes':
            send_test_email(smtp_host, smtp_port, smtp_user, smtp_password, required_vars['FROM_EMAIL'], required_vars['FROM_NAME'])
        
        return True
        
    except smtplib.SMTPAuthenticationError:
        print()
        print("❌ AUTHENTICATION FAILED!")
        print()
        print("Common issues:")
        print("1. For Gmail: Make sure you're using an App Password, not your regular password")
        print("   Generate at: https://myaccount.google.com/apppasswords")
        print("2. Check that your email and password are correct")
        print("3. For Gmail: Enable 2-Factor Authentication first")
        print()
        return False
        
    except smtplib.SMTPConnectError:
        print()
        print("❌ CONNECTION FAILED!")
        print()
        print("Common issues:")
        print("1. Check SMTP_HOST is correct (e.g., smtp.gmail.com)")
        print("2. Check SMTP_PORT is correct (usually 587)")
        print("3. Check your internet connection")
        print("4. Check firewall settings")
        print()
        return False
        
    except Exception as e:
        print()
        print(f"❌ ERROR: {str(e)}")
        print()
        return False


def send_test_email(smtp_host, smtp_port, smtp_user, smtp_password, from_email, from_name):
    """Send a test email to verify everything works."""
    print()
    print("📧 Sending test email...")
    print("-" * 60)
    
    try:
        # Create test message
        msg = MIMEText("""
This is a test email from your HR Recruitment System.

If you're receiving this email, your email configuration is working correctly! 🎉

You can now:
✅ Schedule interviews
✅ Send automatic invitations to candidates
✅ CC interviewers on interview emails
✅ Send cancellation notifications

Your system is ready to use!

Best regards,
HR System
        """)
        
        msg['Subject'] = "✅ HR System - Email Configuration Test"
        msg['From'] = f"{from_name} <{from_email}>"
        msg['To'] = smtp_user  # Send to yourself
        
        # Send email
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_password)
            server.send_message(msg)
        
        print()
        print("=" * 60)
        print("✅ TEST EMAIL SENT SUCCESSFULLY!")
        print("=" * 60)
        print()
        print(f"📬 Check your inbox at: {smtp_user}")
        print()
        print("If you received the email, your configuration is perfect!")
        print("You can now schedule interviews and send invitations! 🚀")
        print()
        
    except Exception as e:
        print()
        print(f"❌ Failed to send test email: {str(e)}")
        print()


if __name__ == "__main__":
    try:
        check_email_config()
    except KeyboardInterrupt:
        print("\n\n❌ Verification cancelled by user.")
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
