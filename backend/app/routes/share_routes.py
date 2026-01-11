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
    Generates a polished, organized HTML email template with dynamic health data.
    Includes status indicators and color-coded borders compliant with medical ranges.
    Refactored to group Height/Weight with BMI and inline units.
    """
    name = user_data.get('firstName', 'User')
    date_str = datetime.datetime.now().strftime("%B %d, %Y • %I:%M %p")
    
    # --- Helper to validate values ---
    def is_valid(val):
        return val and str(val) != "0" and str(val) != "" and str(val).strip() != "--"

    # --- Status Logic Helpers (Exact Sync with Frontend Result.jsx) ---
    def get_bmi_status(bmi):
        try:
            val = float(bmi)
            if val < 18.5: return "Underweight", "info"      # Blue
            if val < 25: return "Normal", "good"             # Green
            if val < 30: return "Overweight", "warning"      # Orange
            return "Obese", "danger"                         # Red
        except: return "Unknown", "neutral"

    def get_bp_status(sys, dia):
        try:
            s, d = int(sys), int(dia)
            # Hypertensive Crisis
            if s > 180 or d > 120: return "Hypertensive Crisis", "danger"
            # Stage 2 Hypertension
            if s >= 140 or d >= 90: return "Stage 2 Hypertension", "danger"
            # Stage 1 Hypertension
            if s >= 130 or d >= 80: return "Stage 1 Hypertension", "warning"
            # Elevated
            if s >= 120 and d < 80: return "Elevated", "warning"
            # Hypotension
            if s < 90 or d < 60: return "Hypotension", "info"
            # Normal
            return "Normal", "good"
        except: return "Unknown", "neutral"

    def get_hr_status(hr):
        try:
            val = float(hr)
            if val < 60: return "Low", "info"
            if val <= 100: return "Normal", "good"
            if val <= 120: return "Elevated", "warning"
            return "Critical", "danger"
        except: return "Unknown", "neutral"

    def get_spo2_status(spo2):
        try:
            val = float(spo2)
            if val <= 89: return "Critical", "danger"
            if val <= 94: return "Low", "warning"
            return "Normal", "good"
        except: return "Unknown", "neutral"
        
    def get_rr_status(rr):
        try:
            val = float(rr)
            if val < 12: return "Low", "info"
            if val <= 20: return "Normal", "good"
            if val <= 24: return "Elevated", "warning"
            return "Critical", "danger"
        except: return "Unknown", "neutral"

    def get_temp_status(temp):
        try:
            val = float(temp)
            if val < 35.0: return "Hypothermia", "danger"
            if val <= 37.2: return "Normal", "good"
            if val <= 38.0: return "Slight Fever", "warning"
            return "Critical Fever", "danger"
        except: return "Unknown", "neutral"

    # --- Build Vitals List ---
    vitals_html = ""
    
    # 1. BMI Section (Combined with Weight & Height)
    if is_valid(user_data.get('bmi')):
        status, color = get_bmi_status(user_data.get('bmi'))
        
        # Sub-metrics HTML
        sub_metrics = []
        if is_valid(user_data.get('weight')):
            sub_metrics.append(f'<div class="sub-metric"><strong>Weight:</strong> {user_data.get("weight")} kg</div>')
        if is_valid(user_data.get('height')):
            sub_metrics.append(f'<div class="sub-metric"><strong>Height:</strong> {user_data.get("height")} cm</div>')
            
        sub_metrics_html = "".join(sub_metrics)
        
        vitals_html += f"""
        <div class="vital-card status-{color}">
            <div class="vital-header">
                <div class="vital-icon">⚖️</div>
                <div class="vital-status status-pill-{color}">{status}</div>
            </div>
            <div class="vital-content">
                <div class="vital-label">BMI</div>
                <div class="vital-row">
                    <span class="vital-value">{user_data.get('bmi')}</span>
                    <span class="vital-unit">kg/m²</span>
                </div>
                <div class="vital-sub-metrics">
                    {sub_metrics_html}
                </div>
            </div>
        </div>
        """
        
    # 2. Blood Pressure
    if is_valid(user_data.get('systolic')) and is_valid(user_data.get('diastolic')):
        status, color = get_bp_status(user_data.get('systolic'), user_data.get('diastolic'))
        vitals_html += f"""
        <div class="vital-card status-{color}">
            <div class="vital-header">
                <div class="vital-icon">❤️</div>
                <div class="vital-status status-pill-{color}">{status}</div>
            </div>
            <div class="vital-content">
                <div class="vital-label">Blood Pressure</div>
                <div class="vital-row">
                    <span class="vital-value">{user_data.get('systolic')}/{user_data.get('diastolic')}</span>
                    <span class="vital-unit">mmHg</span>
                </div>
            </div>
        </div>
        """
        
    # 3. Heart Rate
    hr = user_data.get('heartRate') or user_data.get('pulse')
    if is_valid(hr):
         status, color = get_hr_status(hr)
         vitals_html += f"""
        <div class="vital-card status-{color}">
            <div class="vital-header">
                <div class="vital-icon">💓</div>
                <div class="vital-status status-pill-{color}">{status}</div>
            </div>
            <div class="vital-content">
                <div class="vital-label">Heart Rate</div>
                <div class="vital-row">
                    <span class="vital-value">{hr}</span>
                    <span class="vital-unit">bpm</span>
                </div>
            </div>
        </div>
        """
    
    # 4. Respiratory Rate (Added)
    rr = user_data.get('respiratoryRate') or user_data.get('rr')
    if is_valid(rr):
         status, color = get_rr_status(rr)
         vitals_html += f"""
        <div class="vital-card status-{color}">
            <div class="vital-header">
                <div class="vital-icon">🫁</div>
                <div class="vital-status status-pill-{color}">{status}</div>
            </div>
            <div class="vital-content">
                <div class="vital-label">Respiratory Rate</div>
                <div class="vital-row">
                    <span class="vital-value">{rr}</span>
                    <span class="vital-unit">/min</span>
                </div>
            </div>
        </div>
        """

    # 5. SpO2
    spo2 = user_data.get('oxygenSaturation') or user_data.get('spo2')
    if is_valid(spo2):
         status, color = get_spo2_status(spo2)
         vitals_html += f"""
        <div class="vital-card status-{color}">
            <div class="vital-header">
                <div class="vital-icon">🌬️</div>
                <div class="vital-status status-pill-{color}">{status}</div>
            </div>
            <div class="vital-content">
                <div class="vital-label">Oxygen Saturation</div>
                <div class="vital-row">
                    <span class="vital-value">{spo2}</span>
                    <span class="vital-unit">%</span>
                </div>
            </div>
        </div>
        """
    
    # 6. Body Temp
    temp = user_data.get('temperature') or user_data.get('temp')
    if is_valid(temp):
         status, color = get_temp_status(temp)
         vitals_html += f"""
        <div class="vital-card status-{color}">
            <div class="vital-header">
                <div class="vital-icon">🌡️</div>
                <div class="vital-status status-pill-{color}">{status}</div>
            </div>
            <div class="vital-content">
                <div class="vital-label">Body Temp</div>
                <div class="vital-row">
                    <span class="vital-value">{temp}</span>
                    <span class="vital-unit">°C</span>
                </div>
            </div>
        </div>
        """

    # Fallback
    if not vitals_html:
        vitals_html = """<div class="empty-state">No specific measurements recorded in this session.</div>"""

    # --- AI Section & Risk Banner ---
    ai_cards_html = ""
    risk_banner_html = ""
    
    def format_list(items):
        if not items: return None
        if isinstance(items, list):
            clean = [str(i).strip() for i in items if i]
            return clean if clean else None
        return [str(items)]

    risk_cat = user_data.get('riskCategory', 'Normal')
    risk_level = user_data.get('riskLevel', '0')
    
    suggestions = format_list(user_data.get('suggestions'))
    preventions = format_list(user_data.get('preventions'))
    wellness = format_list(user_data.get('wellnessTips'))
    guidance = format_list(user_data.get('providerGuidance'))

    if suggestions or preventions or wellness or guidance:
        # Build cards for each type
        cards_html = ""
        
        if suggestions:
            items_str = "".join([f"<li>{item}</li>" for item in suggestions])
            cards_html += f"""
            <div class="ai-box warning">
                <div class="ai-title">🩺 Medical Recommendations</div>
                <ul>{items_str}</ul>
            </div>
            """
            
        if preventions:
            items_str = "".join([f"<li>{item}</li>" for item in preventions])
            cards_html += f"""
            <div class="ai-box success">
                <div class="ai-title">🛡️ Preventive Strategy</div>
                <ul>{items_str}</ul>
            </div>
            """
            
        if wellness:
            items_str = "".join([f"<li>{item}</li>" for item in wellness])
            cards_html += f"""
            <div class="ai-box info">
                <div class="ai-title">💪 Wellness Tips</div>
                <ul>{items_str}</ul>
            </div>
            """
            
        if guidance:
             items_str = "".join([f"<p>{item}</p>" for item in guidance])
             cards_html += f"""
            <div class="ai-box primary">
                <div class="ai-title">👨‍⚕️ Provider Guidance</div>
                <div class="guidance-text">{items_str}</div>
            </div>
            """
        
        ai_cards_html = f"""
        <div class="section-title">Detailed Analysis & Recommendations</div>
        <div class="ai-grid">
            {cards_html}
        </div>
        """
        
        # Risk Banner - Now positioned at the top
        risk_banner_html = f"""
        <div class="risk-banner">
            <span class="risk-label">Overall Stats:</span>
            <span class="risk-value">{risk_cat} ({risk_level}%)</span>
        </div>
        """

    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            /* Base Reset */
            body {{ margin: 0; padding: 0; background-color: #f3f4f6; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; -webkit-font-smoothing: antialiased; }}
            
            /* Main Container */
            .wrapper {{ width: 100%; table-layout: fixed; background-color: #f3f4f6; padding-bottom: 40px; }}
            .container {{ max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }}
            
            /* Header */
            .header {{ background: #dc2626; padding: 30px 20px; text-align: center; color: white; }}
            .header h1 {{ margin: 0; font-size: 24px; font-weight: 700; letter-spacing: 0.5px; }}
            .header p {{ margin: 5px 0 0 0; opacity: 0.9; font-size: 14px; }}
            
            /* Content */
            .content {{ padding: 30px 25px; }}
            .greeting {{ font-size: 18px; color: #111827; margin-bottom: 15px; }}
            
            /* Risk Banner */
            .risk-banner {{ background: #fee2e2; border: 1px solid #fecaca; padding: 15px 20px; border-radius: 8px; color: #991b1b; margin-bottom: 25px; font-weight: 500; display: flex; flex-direction: row; justify-content: flex-start; align-items: center; gap: 8px; }}
            .risk-label {{ color: #7f1d1d; }}
            .risk-value {{ font-weight: 800; color: #dc2626; text-transform: uppercase; }}
            
            /* Grid for Vitals */
            .vitals-grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 30px; }}
            
            .vital-card {{ 
                background: #ffffff; 
                border-radius: 12px; 
                padding: 15px; 
                display: flex; 
                flex-direction: column;
                gap: 5px;
                position: relative;
                border: 2px solid transparent;
                box-shadow: 0 2px 4px rgba(0,0,0,0.02);
            }}
            
            /* Status Coloring */
            .status-good {{ border-color: #22c55e; background: #f0fdf4; }}
            .status-warning {{ border-color: #f59e0b; background: #fffbeb; }}
            .status-danger {{ border-color: #ef4444; background: #fef2f2; }}
            .status-info {{ border-color: #3b82f6; background: #eff6ff; }} /* Blue for Low/Underweight */
            .status-neutral {{ border-color: #e5e7eb; background: #f9fafb; }}
            
            .vital-header {{ display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; }}
            
            .vital-status {{ font-size: 10px; font-weight: 700; text-transform: uppercase; padding: 4px 8px; border-radius: 6px; letter-spacing: 0.5px; }}
            .status-pill-good {{ background: #dcfce7; color: #15803d; }}
            .status-pill-warning {{ background: #fef3c7; color: #b45309; }}
            .status-pill-danger {{ background: #fee2e2; color: #b91c1c; }}
            .status-pill-info {{ background: #dbeafe; color: #1e40af; }}
            
            .vital-icon {{ font-size: 24px; }}
            
            .vital-content {{ text-align: left; }}
            .vital-label {{ font-size: 11px; text-transform: uppercase; color: #6b7280; font-weight: 600; letter-spacing: 0.5px; margin-bottom: 4px; }}
            
            .vital-row {{ display: flex; align-items: baseline; gap: 4px; }}
            .vital-value {{ font-size: 24px; font-weight: 700; color: #1f2937; line-height: 1; }}
            .vital-unit {{ font-size: 14px; color: #6b7280; font-weight: 500; }}
            
            .vital-sub-metrics {{ margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(0,0,0,0.05); font-size: 12px; color: #4b5563; display: flex; gap: 12px; }}
            .sub-metric {{ background: rgba(255,255,255,0.5); padding: 4px 8px; border-radius: 4px; }}
            
            /* AI Section */
            .section-title {{ font-size: 16px; font-weight: 700; color: #374151; margin: 35px 0 15px 0; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; }}
            
            .ai-box {{ border-radius: 8px; padding: 15px; margin-bottom: 15px; border-left: 4px solid #ccc; background: #fff; border: 1px solid #e5e7eb; border-left-width: 4px; }}
            .ai-title {{ font-weight: 700; font-size: 14px; margin-bottom: 8px; display: flex; align-items: center; gap: 8px; }}
            .ai-box ul {{ margin: 0; padding-left: 20px; color: #4b5563; font-size: 14px; line-height: 1.5; }}
            .ai-box li {{ margin-bottom: 4px; }}
            
            .ai-box.warning {{ border-left-color: #dc2626; background: #fef2f2; }}
            .ai-box.warning .ai-title {{ color: #991b1b; }}
            
            .ai-box.success {{ border-left-color: #059669; background: #ecfdf5; }}
            .ai-box.success .ai-title {{ color: #065f46; }}
            
            .ai-box.info {{ border-left-color: #3b82f6; background: #eff6ff; }}
            .ai-box.info .ai-title {{ color: #1e40af; }}
            
            .ai-box.primary {{ border-left-color: #7c3aed; background: #f5f3ff; }}
            .ai-box.primary .ai-title {{ color: #5b21b6; }}
            .guidance-text p {{ margin:0; font-style: italic; color: #4b5563; font-size: 14px; }}
            
            /* Footer */
            .footer {{ background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; }}
            .footer p {{ margin: 5px 0; }}
            .brand-name {{ color: #dc2626; font-weight: 600; }}
            
            /* Mobile Responsive */
            @media only screen and (max-width: 480px) {{
                .vitals-grid {{ grid-template-columns: 1fr; }}
            }}
        </style>
    </head>
    <body>
        <div class="wrapper">
            <!-- Spacer for layout -->
            <div style="height: 20px;"></div>
            
            <div class="container">
                <div class="header">
                    <h1>Health Report</h1>
                    <p>{date_str}</p>
                </div>
                
                <div class="content">
                    <div class="greeting">Hello, {name}</div>
                    <p style="color: #4b5563; line-height: 1.6; margin-bottom: 25px;">
                        Here are your results from your recent session at the <strong>Vital Sign Kiosk</strong>. 
                        Keep this record for your personal health tracking.
                    </p>
                    
                    <!-- Risk Banner (Moved to Top) -->
                    {risk_banner_html}
                    
                    <!-- Vitals Grid -->
                    <div class="vitals-grid">
                        {vitals_html}
                    </div>
                    
                    <!-- AI Cards -->
                    {ai_cards_html}
                    
                    <!-- Disclaimer -->
                    <div style="margin-top: 40px; padding: 12px; background: #f3f4f6; border-radius: 6px; font-size: 12px; color: #6b7280; font-style: italic; border: 1px solid #e5e7eb;">
                        <strong>Disclaimer:</strong> This automated report is for informational purposes only. It is not an official medical diagnosis. Please consult a qualified healthcare provider for professional medical advice.
                    </div>
                </div>
                
                <div class="footer">
                    <p>Generated by <span class="brand-name">4-in-1 Vital Sign Kiosk</span></p>
                    <p>&copy; {datetime.datetime.now().year} All rights reserved.</p>
                </div>
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
