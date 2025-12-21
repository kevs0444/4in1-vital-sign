from flask import Blueprint, request, jsonify
from sqlalchemy import text
from app.utils.db import get_db
from app.models.verification_code_model import VerificationCode, VerificationTypeEnum
from app.models.user_model import User
from werkzeug.security import generate_password_hash
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import random
import string
import datetime

forgot_password_bp = Blueprint('forgot_password', __name__)

import os

# Email Configuration
SMTP_SERVER = os.getenv('SMTP_SERVER', "smtp.gmail.com")
SMTP_PORT = int(os.getenv('SMTP_PORT', 587))
SENDER_EMAIL = os.getenv('SENDER_EMAIL', "fin.vitalsigns@gmail.com")
SENDER_PASSWORD = os.getenv('SENDER_PASSWORD', "ryvf avyg sxib vbzs")

def send_email(to_email, subject, body):
    try:
        msg = MIMEMultipart()
        msg['From'] = f"Vital Sign System <{SENDER_EMAIL}>"
        msg['To'] = to_email
        msg['Subject'] = subject

        msg.attach(MIMEText(body, 'html'))

        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SENDER_EMAIL, SENDER_PASSWORD)
        text = msg.as_string()
        server.sendmail(SENDER_EMAIL, to_email, text)
        server.quit()
        return True
    except Exception as e:
        print(f"❌ Failed to send email: {e}")
        return False

def generate_otp(length=6):
    return ''.join(random.choices(string.digits, k=length))

def get_modern_email_template(name, otp):
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            .email-container {{
                font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
                max-width: 600px;
                margin: 0 auto;
                background-color: #ffffff;
                border-radius: 12px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.05);
                overflow: hidden;
                border: 1px solid #e5e7eb;
            }}
            .header {{
                background: linear-gradient(135deg, #b91c1c 0%, #dc2626 100%);
                padding: 30px 20px;
                text-align: center;
            }}
            .header h1 {{
                color: white;
                margin: 0;
                font-size: 24px;
                font-weight: 700;
                letter-spacing: 0.5px;
            }}
            .content {{
                padding: 40px 30px;
                color: #374151;
            }}
            .greeting {{
                font-size: 18px;
                font-weight: 600;
                color: #111827;
                margin-bottom: 20px;
            }}
            .message {{
                font-size: 16px;
                line-height: 1.6;
                margin-bottom: 30px;
                color: #4b5563;
            }}
            .otp-box {{
                background-color: #f3f4f6;
                border-left: 4px solid #dc2626;
                padding: 20px;
                text-align: center;
                margin: 30px 0;
                border-radius: 4px;
            }}
            .otp-code {{
                font-family: 'Courier New', Courier, monospace;
                font-size: 32px;
                font-weight: 700;
                color: #dc2626;
                letter-spacing: 8px;
                margin: 10px 0;
                padding: 15px;
                background-color: white;
                border-radius: 8px;
                display: inline-block;
            }}
            .otp-label {{
                font-size: 12px;
                color: #6b7280;
                text-transform: uppercase;
                letter-spacing: 1px;
                margin-bottom: 10px;
            }}
            .expiry {{
                font-size: 14px;
                color: #9ca3af;
                margin-top: 10px;
            }}
            .warning {{
                background-color: #fef2f2;
                border-left: 4px solid #ef4444;
                padding: 15px;
                margin: 20px 0;
                border-radius: 4px;
            }}
            .warning-text {{
                font-size: 14px;
                color: #991b1b;
                margin: 0;
            }}
            .footer {{
                background-color: #f9fafb;
                padding: 25px 30px;
                text-align: center;
                border-top: 1px solid #e5e7eb;
            }}
            .footer-text {{
                font-size: 13px;
                color: #6b7280;
                margin: 8px 0;
            }}
            .brand {{
                color: #dc2626;
                font-weight: 600;
            }}
        </style>
    </head>
    <body>
        <div class="email-container">
            <div class="header">
                <h1>🔐 Account Recovery</h1>
            </div>
            <div class="content">
                <div class="greeting">Hello, {name}!</div>
                <div class="message">
                    We received a request to reset your password. Use the verification code below to complete your password reset securely.
                </div>
                <div class="otp-box">
                    <div class="otp-label">Your Verification Code</div>
                    <div class="otp-code">{otp}</div>
                    <div class="expiry">⏱️ Expires in 10 minutes</div>
                </div>
                <div class="warning">
                    <p class="warning-text">
                        <strong>⚠️ Security Notice:</strong> If you did not request this password reset, please ignore this email and ensure your account is secure.
                    </p>
                </div>
            </div>
            <div class="footer">
                <p class="footer-text">This is an automated message from <span class="brand">Vital Sign System</span></p>
                <p class="footer-text">Please do not reply to this email.</p>
            </div>
        </div>
    </body>
    </html>
    """

@forgot_password_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    print("=" * 60)
    print("🔐 FORGOT PASSWORD REQUEST RECEIVED")
    print("=" * 60)
    
    data = request.get_json()
    identifier = data.get('identifier') # Accepts email OR school_number

    print(f"📝 Identifier received: {identifier}")

    if not identifier:
        print("❌ No identifier provided")
        return jsonify({'success': False, 'message': 'School Number or Email is required'}), 400

    try:
        db = next(get_db())
        
        # Check by Email OR School Number
        query = text("""
            SELECT user_id, firstname, email, school_number 
            FROM users 
            WHERE email = :identifier OR school_number = :identifier
        """)
        result = db.execute(query, {'identifier': identifier})
        user = result.fetchone()

        if not user:
            print(f"❌ User not found for identifier: {identifier}")
            return jsonify({'success': False, 'message': 'Account not found. Please check your School Number or Email.'}), 404

        user_id = user[0]
        first_name = user[1]
        user_email = user[2] # Use the resolved email address
        
        print(f"✅ User found - ID: {user_id}, Name: {first_name}, Email: {user_email}")

        if not user_email:
            print(f"❌ No email address for user_id: {user_id}")
            return jsonify({'success': False, 'message': 'No email address linked to this account.'}), 400

        # 🔥 IMPORTANT: Delete ALL old OTPs for this user before creating new one
        print(f"🧹 Cleaning up old OTPs for user_id: {user_id}")
        deleted_count = db.query(VerificationCode).filter(
            VerificationCode.user_id == user_id
        ).delete()
        print(f"🗑️ Deleted {deleted_count} old OTP(s)")
        db.commit()  # Commit the deletion
        
        # Generate new OTP
        otp = generate_otp()
        expiry = datetime.datetime.now() + datetime.timedelta(minutes=10)
        
        print(f"🔑 Generated new OTP: {otp}")
        print(f"⏰ OTP expires at: {expiry}")
        
        # Save OTP (Using user_email as identifier in verification table)
        new_verification = VerificationCode(
            user_id=user_id,
            otp_code=otp,
            verification_type=VerificationTypeEnum.email,
            identifier=user_email, # Store the actual email sent to
            expires_at=expiry,
            is_used=False
        )
        
        db.add(new_verification)
        db.commit()
        print(f"💾 OTP saved to database with code_id: {new_verification.code_id}")

        # Send Email
        html_content = get_modern_email_template(first_name, otp)

        print(f"📧 Attempting to send email to: {user_email}")
        if send_email(user_email, "Secure Verification Code - Vital Sign System", html_content):
            print(f"✅ Email sent successfully to {user_email}")
            print(f"📝 OTP Code ID: {new_verification.code_id}")
            # Partially mask email for privacy in response
            masked_email = user_email[0:2] + "****" + user_email[user_email.find('@'):]
            print("=" * 60)
            return jsonify({
                'success': True, 
                'message': f'Verification code sent to {masked_email}',
                'email': user_email # Returning this so frontend can use it if needed (be careful with privacy)
            }), 200
        else:
            print(f"⚠️ Email send failed. OTP for {user_email} is: {otp}")
            print("=" * 60)
            return jsonify({'success': True, 'message': 'OTP generated (Check server logs)'}), 200

    except Exception as e:
        print(f"❌ Error in forgot_password: {e}")
        import traceback
        traceback.print_exc()
        print("=" * 60)
        db.rollback()
        return jsonify({'success': False, 'message': f'Internal server error: {str(e)}'}), 500

@forgot_password_bp.route('/verify-otp', methods=['POST'])
def verify_otp():
    print("=" * 60)
    print("🔍 OTP VERIFICATION REQUEST RECEIVED")
    print("=" * 60)
    
    data = request.get_json()
    identifier = data.get('identifier') # Can be School Number or Email
    otp = data.get('otp')

    print(f"📝 Identifier: {identifier}")
    print(f"🔑 OTP to verify: {otp}")

    if not identifier or not otp:
        print("❌ Missing identifier or OTP")
        return jsonify({'success': False, 'message': 'Identifier and OTP are required'}), 400

    try:
        db = next(get_db())
        
        # Resolve User ID from Identifier first
        query = text("""
            SELECT user_id FROM users 
            WHERE email = :identifier OR school_number = :identifier
        """)
        result = db.execute(query, {'identifier': identifier})
        user = result.fetchone()

        if not user:
            print(f"❌ User not found for identifier: {identifier}")
            return jsonify({'success': False, 'message': 'User not found'}), 404
            
        user_id = user[0]
        print(f"✅ User ID resolved: {user_id}")
        
        # Verify OTP using User ID
        print(f"🔍 Searching for valid OTP...")
        verification = db.query(VerificationCode).filter(
            VerificationCode.user_id == user_id,
            VerificationCode.otp_code == otp,
            VerificationCode.is_used == False,
            VerificationCode.expires_at > datetime.datetime.now()
        ).order_by(VerificationCode.created_at.desc()).first()
        
        if verification:
            print(f"✅ Valid OTP found - Code ID: {verification.code_id}")
            print(f"📅 Created: {verification.created_at}, Expires: {verification.expires_at}")
            print("=" * 60)
            return jsonify({'success': True, 'message': 'OTP verified'}), 200
        else:
            # Check if OTP exists but is expired or used
            all_otps = db.query(VerificationCode).filter(
                VerificationCode.user_id == user_id,
                VerificationCode.otp_code == otp
            ).all()
            
            if all_otps:
                print(f"⚠️ OTP found but invalid:")
                for v in all_otps:
                    print(f"   - Code ID: {v.code_id}, Used: {v.is_used}, Expired: {v.expires_at < datetime.datetime.now()}")
            else:
                print(f"❌ No matching OTP found for user_id: {user_id}")
            
            print("=" * 60)
            return jsonify({'success': False, 'message': 'Invalid or expired OTP'}), 400

    except Exception as e:
        print(f"❌ Error in verify_otp: {e}")
        import traceback
        traceback.print_exc()
        print("=" * 60)
        return jsonify({'success': False, 'message': 'Internal server error'}), 500

@forgot_password_bp.route('/reset-password', methods=['POST'])
def reset_password():
    print("🔄 Password Reset Request Received")
    data = request.get_json()
    identifier = data.get('identifier')
    otp = data.get('otp')
    new_password = data.get('newPassword')

    print(f"📝 Identifier: {identifier}")
    print(f"🔑 OTP: {otp}")
    print(f"🔒 New Password Length: {len(new_password) if new_password else 0}")

    if not identifier or not otp or not new_password:
        print("❌ Missing required fields")
        return jsonify({'success': False, 'message': 'All fields are required'}), 400

    try:
        db = next(get_db())
        
        # Resolve User ID
        query = text("""
            SELECT user_id FROM users 
            WHERE email = :identifier OR school_number = :identifier
        """)
        result = db.execute(query, {'identifier': identifier})
        user = result.fetchone()

        if not user:
            print(f"❌ User not found for identifier: {identifier}")
            return jsonify({'success': False, 'message': 'User not found'}), 404
            
        user_id = user[0]
        print(f"✅ Found user_id: {user_id}")
        
        # Verify and Consume OTP
        verification = db.query(VerificationCode).filter(
            VerificationCode.user_id == user_id,
            VerificationCode.otp_code == otp,
            VerificationCode.is_used == False,
            VerificationCode.expires_at > datetime.datetime.now()
        ).order_by(VerificationCode.created_at.desc()).first()

        if not verification:
            print(f"❌ Invalid or expired OTP for user_id: {user_id}")
            return jsonify({'success': False, 'message': 'Invalid or expired session. Please try again.'}), 400
        
        print(f"✅ OTP verified for user_id: {user_id}")
        
        # Mark OTP as used
        verification.is_used = True
        
        # Hash new password
        hashed_password = generate_password_hash(new_password)
        print(f"🔐 Password hashed successfully")
        
        # Update Password
        update_query = text("UPDATE users SET password = :password WHERE user_id = :user_id")
        db.execute(update_query, {'password': hashed_password, 'user_id': user_id})
        print(f"💾 Password updated in database")
        
        # ✅ CLEANUP: Delete all OTPs for this user after successful password reset
        cleanup_user_otps(db, user_id)
        
        db.commit()
        
        print(f"✅ Password reset successful for user_id: {user_id}")
        print(f"🧹 Cleaned up OTPs for user_id: {user_id}")
        return jsonify({'success': True, 'message': 'Password has been reset successfully'}), 200

    except Exception as e:
        print(f"❌ Reset password error: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
        return jsonify({'success': False, 'message': 'Failed to reset password in database'}), 500


def cleanup_user_otps(db, user_id):
    """Delete all OTP records for a specific user"""
    try:
        deleted_count = db.query(VerificationCode).filter(
            VerificationCode.user_id == user_id
        ).delete()
        print(f"🧹 Deleted {deleted_count} OTP record(s) for user {user_id}")
    except Exception as e:
        print(f"⚠️ Error cleaning up OTPs for user {user_id}: {e}")


def cleanup_expired_otps(db):
    """Delete all expired OTP records (can be called periodically)"""
    try:
        deleted_count = db.query(VerificationCode).filter(
            VerificationCode.expires_at < datetime.datetime.now()
        ).delete()
        print(f"🧹 Deleted {deleted_count} expired OTP record(s)")
        db.commit()
        return deleted_count
    except Exception as e:
        print(f"⚠️ Error cleaning up expired OTPs: {e}")
        db.rollback()
        return 0


@forgot_password_bp.route('/cleanup-expired-otps', methods=['POST'])
def cleanup_expired_otps_endpoint():
    """Admin endpoint to manually trigger cleanup of expired OTPs"""
    try:
        db = next(get_db())
        deleted_count = cleanup_expired_otps(db)
        return jsonify({
            'success': True, 
            'message': f'Cleaned up {deleted_count} expired OTP(s)'
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@forgot_password_bp.route('/cancel-reset', methods=['POST'])
def cancel_reset():
    """Delete OTP records when user cancels the password reset flow"""
    print("=" * 60)
    print("🚫 CANCEL PASSWORD RESET REQUEST RECEIVED")
    print("=" * 60)
    
    data = request.get_json()
    identifier = data.get('identifier')
    
    print(f"📝 Identifier: {identifier}")
    
    if not identifier:
        print("❌ No identifier provided")
        return jsonify({'success': False, 'message': 'Identifier is required'}), 400
    
    try:
        db = next(get_db())
        
        # Resolve User ID from Identifier
        query = text("""
            SELECT user_id FROM users 
            WHERE email = :identifier OR school_number = :identifier
        """)
        result = db.execute(query, {'identifier': identifier})
        user = result.fetchone()
        
        if not user:
            print(f"⚠️ User not found for identifier: {identifier}")
            # Still return success to avoid revealing user existence
            return jsonify({'success': True, 'message': 'Reset cancelled'}), 200
        
        user_id = user[0]
        print(f"✅ User ID resolved: {user_id}")
        
        # Delete all OTPs for this user
        cleanup_user_otps(db, user_id)
        db.commit()
        
        print(f"✅ OTPs cleared for user_id: {user_id}")
        print("=" * 60)
        return jsonify({'success': True, 'message': 'Reset cancelled and OTPs cleared'}), 200
        
    except Exception as e:
        print(f"❌ Error in cancel_reset: {e}")
        import traceback
        traceback.print_exc()
        print("=" * 60)
        db.rollback()
        return jsonify({'success': False, 'message': 'Internal server error'}), 500
