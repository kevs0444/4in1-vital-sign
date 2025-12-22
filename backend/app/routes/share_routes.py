from flask import Blueprint, request, jsonify
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
import datetime
from sqlalchemy import text
from app.utils.db import get_db

share_bp = Blueprint('share', __name__)

# Email Configuration (Should be loaded from environment variables)
SMTP_SERVER = os.getenv('SMTP_SERVER')
SMTP_PORT = int(os.getenv('SMTP_PORT', 587))
SENDER_EMAIL = os.getenv('SENDER_EMAIL')
SENDER_PASSWORD = os.getenv('SENDER_PASSWORD')

def send_email_func(to_email, subject, body):
    if not SMTP_SERVER or not SENDER_EMAIL or not SENDER_PASSWORD:
        print("❌ Email Config Missing! Please check .env for SMTP_SERVER, SENDER_EMAIL, and SENDER_PASSWORD.")
        return False

    try:
        msg = MIMEMultipart()
        msg['From'] = f"Vital Sign Kiosk <{SENDER_EMAIL}>"
        msg['To'] = to_email
        msg['Subject'] = subject

        msg.attach(MIMEText(body, 'html'))

        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.ehlo()
        server.starttls()
        server.ehlo()
        server.login(SENDER_EMAIL, SENDER_PASSWORD)
        text = msg.as_string()
        server.sendmail(SENDER_EMAIL, to_email, text)
        server.quit()
        return True
    except Exception as e:
        print(f"❌ Failed to send email: {e}")
        return False

def get_health_report_template(user_data):
    """
    Generates a red-themed HTML email template with dynamic health data.
    Only includes measurements that exist in user_data.
    """
    name = user_data.get('firstName', 'User')
    date_str = datetime.datetime.now().strftime("%B %d, %Y - %I:%M %p")
    
    # Build list of valid results dynamically
    results_html = ""
    
    # helper to check if value is valid (not None, not empty string, not "0")
    def is_valid(val):
        return val and str(val) != "0" and str(val) != ""

    # BMI
    # Check if BMI exists and is valid
    if is_valid(user_data.get('bmi')):
        results_html += f"""
        <div class="result-item">
            <div class="result-label">BMI</div>
            <div class="result-value">{user_data.get('bmi')}</div>
        </div>
        """
        
    # Blood Pressure (Systolic/Diastolic)
    if is_valid(user_data.get('systolic')) and is_valid(user_data.get('diastolic')):
        results_html += f"""
        <div class="result-item">
            <div class="result-label">Blood Pressure</div>
            <div class="result-value">{user_data.get('systolic')}/{user_data.get('diastolic')}</div>
        </div>
        """
        
    # Heart Rate (Pulse) - check 'heartRate' or 'pulse'
    hr = user_data.get('heartRate') or user_data.get('pulse')
    if is_valid(hr):
         results_html += f"""
        <div class="result-item">
            <div class="result-label">Heart Rate</div>
            <div class="result-value">{hr} bpm</div>
        </div>
        """
        
    # Temperature
    if is_valid(user_data.get('temperature')) or is_valid(user_data.get('temp')):
         val = user_data.get('temperature') or user_data.get('temp')
         results_html += f"""
        <div class="result-item">
            <div class="result-label">Body Temp</div>
            <div class="result-value">{val} °C</div>
        </div>
        """
        
    # Oxygen Saturation (SpO2)
    formatted_spo2 = user_data.get('oxygenSaturation') or user_data.get('spo2')
    if is_valid(formatted_spo2):
         results_html += f"""
        <div class="result-item">
            <div class="result-label">Oxygen Lvl</div>
            <div class="result-value">{formatted_spo2} %</div>
        </div>
        """

    # Weight (Optional - if just weight was measured)
    if is_valid(user_data.get('weight')) and not is_valid(user_data.get('bmi')):
         results_html += f"""
        <div class="result-item">
            <div class="result-label">Weight</div>
            <div class="result-value">{user_data.get('weight')} kg</div>
        </div>
        """

    # Fallback if empty
    if not results_html:
        results_html = """<div style="text-align:center; width:100%; color:#666; padding: 20px;">No specific measurements recorded in this session.</div>"""

    # --- AI RECOMMENDATIONS SECTION ---
    ai_section_html = ""
    
    # Helper to clean/format list or string
    def format_advice_list(items):
        if not items: return None
        if isinstance(items, list):
            # If it's a list with one long string (likely), just return it
            clean_items = [str(i).strip() for i in items if i]
            if not clean_items: return None
            return "<br>".join(clean_items)
        return str(items)

    medical_action = format_advice_list(user_data.get('suggestions')) # mapped to suggestions in frontend
    preventive = format_advice_list(user_data.get('preventions'))
    wellness = format_advice_list(user_data.get('wellnessTips'))
    guidance = format_advice_list(user_data.get('providerGuidance'))
    risk_level = user_data.get('riskLevel', '0')
    risk_cat = user_data.get('riskCategory', 'Low Risk')

    if medical_action or preventive or wellness or guidance:
        ai_section_html = f"""
        <div style="margin-top: 30px; border-top: 2px solid #fee2e2; padding-top: 20px;">
            <div style="background-color: #fef2f2; border-radius: 12px; padding: 20px; border: 1px solid #fecaca;">
                <div style="text-align: center; margin-bottom: 15px;">
                    <h2 style="color: #b91c1c; font-size: 18px; margin: 0; text-transform: uppercase; letter-spacing: 1px;">🤖 Juan AI Analysis</h2>
                    <div style="font-size: 24px; font-weight: bold; color: #dc2626; margin-top: 5px;">{risk_cat} ({risk_level}%)</div>
                </div>
                
                {f'''
                <div style="margin-bottom: 15px;">
                    <div style="font-weight: bold; color: #991b1b; font-size: 14px; margin-bottom: 5px;">🩺 Medical Action Recommendations</div>
                    <div style="background: white; padding: 10px; border-radius: 6px; border-left: 3px solid #dc2626; font-size: 14px; color: #374151;">
                        {medical_action}
                    </div>
                </div>
                ''' if medical_action else ''}

                {f'''
                <div style="margin-bottom: 15px;">
                    <div style="font-weight: bold; color: #166534; font-size: 14px; margin-bottom: 5px;">🛡️ Preventive Strategy</div>
                    <div style="background: white; padding: 10px; border-radius: 6px; border-left: 3px solid #166534; font-size: 14px; color: #374151;">
                        {preventive}
                    </div>
                </div>
                ''' if preventive else ''}

                {f'''
                <div style="margin-bottom: 15px;">
                    <div style="font-weight: bold; color: #ea580c; font-size: 14px; margin-bottom: 5px;">💪 Wellness Tips</div>
                    <div style="background: white; padding: 10px; border-radius: 6px; border-left: 3px solid #ea580c; font-size: 14px; color: #374151;">
                        {wellness}
                    </div>
                </div>
                ''' if wellness else ''}
                
                {f'''
                <div>
                    <div style="font-weight: bold; color: #1e40af; font-size: 14px; margin-bottom: 5px;">👨‍⚕️ Provider Guidance</div>
                    <div style="background: white; padding: 10px; border-radius: 6px; border-left: 3px solid #1e40af; font-size: 14px; color: #374151; font-style: italic;">
                        "{guidance}"
                    </div>
                </div>
                ''' if guidance else ''}
            </div>
        </div>
        """

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
                border-radius: 16px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.05);
                overflow: hidden;
                border: 1px solid #fee2e2;
            }}
            .header {{
                background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%);
                padding: 30px 20px;
                text-align: center;
            }}
            .header h1 {{
                color: white;
                margin: 0;
                font-size: 26px;
                font-weight: 700;
                letter-spacing: 0.5px;
            }}
            .header p {{
                color: rgba(255, 255, 255, 0.9);
                margin: 5px 0 0 0;
                font-size: 14px;
            }}
            .content {{
                padding: 40px 30px;
                color: #374151;
            }}
            .greeting {{
                font-size: 20px;
                font-weight: 700;
                color: #1f2937;
                margin-bottom: 20px;
            }}
            .results-grid {{
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 15px;
                margin-bottom: 30px;
            }}
            .result-item {{
                background-color: #fef2f2;
                border: 1px solid #fecaca;
                border-radius: 12px;
                padding: 15px;
                text-align: center;
            }}
            .result-label {{
                font-size: 12px;
                color: #ef4444;
                text-transform: uppercase;
                letter-spacing: 1px;
                font-weight: 600;
                margin-bottom: 5px;
            }}
            .result-value {{
                font-size: 18px;
                color: #1f2937;
                font-weight: 700;
            }}
            .footer {{
                background-color: #f9fafb;
                padding: 25px 30px;
                text-align: center;
                border-top: 1px solid #e5e7eb;
            }}
            .footer-text {{
                font-size: 12px;
                color: #6b7280;
                margin: 5px 0;
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
                <h1>Health Report</h1>
                <p>{date_str}</p>
            </div>
            <div class="content">
                <div class="greeting">Hi {name},</div>
                <p>Here are your results from today's session at the 4-in-1 Vital Sign Kiosk.</p>
                
                <div class="results-grid">
                    {results_html}
                </div>
                
                {ai_section_html}
                
                <p style="font-size: 14px; color: #6b7280; text-align: center;">
                    <em>Note: These measurements are for reference only and are not a substitute for professional medical advice.</em>
                </p>
            </div>
            <div class="footer">
                <p class="footer-text">Generated by <span class="brand">4-in-1 Vital Sign Kiosk</span></p>
                <p class="footer-text">Stay Healthy!</p>
            </div>
        </div>
    </body>
    </html>
    """

@share_bp.route('/email', methods=['POST'])
def send_results_email():
    print("=" * 60)
    print("📧 SEND RESULTS EMAIL REQUEST RECEIVED")
    print("=" * 60)
    
    data = request.get_json()
    identifier = data.get('email')  # Can be email OR school number
    user_data = data.get('userData', {})
    user_id = user_data.get('user_id') or user_data.get('userId') or user_data.get('id')
    
    print(f"📝 Identifier received: {identifier}")
    print(f"🆔 User ID from userData: {user_id}")
    
    # Validation: We need at least an identifier OR a valid user_id
    if not identifier and not user_id:
         return jsonify({'success': False, 'message': 'Email, School Number, or valid User ID is required'}), 400
        
    try:
        db = next(get_db())
        target_email = None
        user_found = False

        # 1. OPTION A: Look up by user_id if available (Most Reliable)
        if user_id:
            query = text("SELECT email, firstname FROM users WHERE user_id = :user_id")
            result = db.execute(query, {'user_id': user_id})
            user = result.fetchone()
            
            if user:
                db_email = user[0]
                db_firstname = user[1]
                if db_email:
                    target_email = db_email
                    user_found = True
                    # Update firstname if missing
                    if not user_data.get('firstName'):
                        user_data['firstName'] = db_firstname
                    print(f"✅ User resolved by User ID ({user_id}): {db_firstname} ({target_email})")
                else:
                    print(f"⚠️ User ID {user_id} found but has no email.")

        # 2. OPTION B: Look up by Identifier (Email or School Number)
        if not user_found and identifier:
            query = text("""
                SELECT email, firstname 
                FROM users 
                WHERE email = :identifier OR school_number = :identifier
            """)
            result = db.execute(query, {'identifier': identifier})
            user = result.fetchone()
            
            if user:
                db_email = user[0]
                db_firstname = user[1]
                if db_email:
                    target_email = db_email
                    user_found = True
                    if not user_data.get('firstName'):
                        user_data['firstName'] = db_firstname
                    print(f"✅ User resolved by Identifier ({identifier}): {db_firstname} ({target_email})")
            
            # If not found in DB, assume identifier IS the email (Guest Mode)
            if not user_found and '@' in identifier:
                target_email = identifier
                print(f"ℹ️ Treating identifier as direct email: {target_email}")

        # Final check
        if not target_email or '@' not in target_email:
             return jsonify({'success': False, 'message': 'Unable to resolve a valid email address'}), 400

        # 3. Generate and Send
        html_content = get_health_report_template(user_data)
        subject = f"Your Health Report - {datetime.datetime.now().strftime('%Y-%m-%d')}"
        
        if send_email_func(target_email, subject, html_content):
            print(f"✅ Email sent successfully to {target_email}")
            return jsonify({'success': True, 'message': f'Report sent to {target_email}'}), 200
        else:
            return jsonify({'success': False, 'message': 'Failed to send email'}), 500
            
    except Exception as e:
        print(f"❌ Error sending email: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500
