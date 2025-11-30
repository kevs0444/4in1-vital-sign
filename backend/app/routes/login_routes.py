# app/routes/login_routes.py - UPDATED TO ACCEPT RTU PREFIX
from flask import Blueprint, request, jsonify
from sqlalchemy import text
from app.utils.db import get_db
from werkzeug.security import check_password_hash

login_bp = Blueprint('login', __name__)

@login_bp.route('/login', methods=['POST'])
def login():
    """
    Handle user login via RFID or manual credentials
    Expected JSON payload:
    - For RFID: {"rfid_tag": "RFID_DATA"} - Accepts both with and without RTU prefix
    - For manual: {"school_number": "SCHOOL_NUMBER", "password": "PASSWORD"}
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'message': 'No data provided'
            }), 400

        print(f"🔍 Received login request: {data}")

        # RFID Login
        if 'rfid_tag' in data and data['rfid_tag']:
            return handle_rfid_login(data['rfid_tag'])
        
        # Manual Login - using school_number and password
        elif 'school_number' in data and 'password' in data:
            return handle_manual_login(data['school_number'], data['password'])
        
        else:
            return jsonify({
                'success': False,
                'message': 'Invalid login data. Provide RFID tag or school_number/password'
            }), 400

    except Exception as e:
        print(f"❌ Login error: {e}")
        return jsonify({
            'success': False,
            'message': 'Internal server error during login'
        }), 500

def handle_rfid_login(rfid_tag):
    """Handle RFID-based login - accepts both formats (with/without RTU prefix)"""
    try:
        db = next(get_db())
        
        print(f"🔍 Searching for RFID tag: {rfid_tag}")
        
        # Try exact match first
        query = text("""
            SELECT user_id, rfid_tag, firstname, lastname, role, school_number, 
                   email, mobile_number, age, sex, created_at
            FROM users 
            WHERE rfid_tag = :rfid_tag
        """)
        
        result = db.execute(query, {'rfid_tag': rfid_tag})
        user = result.fetchone()
        
        # If not found with exact match, try with RTU prefix added
        if not user and not rfid_tag.startswith('RTU'):
            rfid_with_rtu = f"RTU{rfid_tag}"
            print(f"🔍 Trying with RTU prefix: {rfid_with_rtu}")
            
            result = db.execute(query, {'rfid_tag': rfid_with_rtu})
            user = result.fetchone()
            
            if user:
                print(f"✅ Found user with RTU prefix: {rfid_with_rtu}")
        
        # If still not found, try without RTU prefix (if input had RTU)
        if not user and rfid_tag.startswith('RTU'):
            rfid_without_rtu = rfid_tag.replace('RTU', '')
            print(f"🔍 Trying without RTU prefix: {rfid_without_rtu}")
            
            result = db.execute(query, {'rfid_tag': rfid_without_rtu})
            user = result.fetchone()
            
            if user:
                print(f"✅ Found user without RTU prefix: {rfid_without_rtu}")
        
        if not user:
            print(f"❌ RFID tag not found in any format: {rfid_tag}")
            return jsonify({
                'success': False,
                'message': '❌ RFID card not registered. Please register first.'
            }), 404
        
        # Convert row to dictionary
        user_dict = {
            'user_id': user[0],
            'rfid_tag': user[1],
            'firstname': user[2],
            'lastname': user[3],
            'role': user[4],
            'school_number': user[5],
            'email': user[6],
            'mobile_number': user[7],
            'age': user[8],
            'sex': user[9],
            'created_at': user[10]
        }
        
        print(f"✅ RFID login successful for user: {user_dict['firstname']} {user_dict['lastname']}")
        print(f"📋 User details: {user_dict}")
        
        return jsonify({
            'success': True,
            'message': f"✅ Access Granted! Welcome {user_dict['firstname']} {user_dict['lastname']}",
            'user': user_dict
        }), 200
        
    except Exception as e:
        print(f"❌ RFID login error: {e}")
        return jsonify({
            'success': False,
            'message': '❌ RFID login failed. Please try again.'
        }), 500

def handle_manual_login(school_number, password):
    """Handle manual username/password login - using school_number field"""
    try:
        db = next(get_db())
        
        print(f"🔍 Searching for school_number: {school_number}")
        
        # Query user by school_number only, fetch password hash
        query = text("""
            SELECT user_id, rfid_tag, firstname, lastname, role, school_number, 
                   email, mobile_number, age, sex, created_at, password
            FROM users 
            WHERE school_number = :school_number
        """)
        
        result = db.execute(query, {
            'school_number': school_number
        })
        user = result.fetchone()
        
        if not user:
            print(f"❌ User not found for school_number: {school_number}")
            return jsonify({
                'success': False,
                'message': '❌ Invalid School Number or password'
            }), 401
            
        # Verify password
        stored_password = user[11] # Password is the 12th column (index 11)
        
        is_valid = False
        if stored_password:
            # Try verifying as hash
            try:
                if check_password_hash(stored_password, password):
                    is_valid = True
            except:
                pass
                
            # If hash verification failed, try plain text (for legacy users)
            if not is_valid and stored_password == password:
                is_valid = True
                print("⚠️ Authenticated with legacy plain text password")
        
        if not is_valid:
            print(f"❌ Invalid password for school_number: {school_number}")
            return jsonify({
                'success': False,
                'message': '❌ Invalid School Number or password'
            }), 401
        
        # Convert row to dictionary (excluding password)
        user_dict = {
            'user_id': user[0],
            'rfid_tag': user[1],
            'firstname': user[2],
            'lastname': user[3],
            'role': user[4],
            'school_number': user[5],
            'email': user[6],
            'mobile_number': user[7],
            'age': user[8],
            'sex': user[9],
            'created_at': user[10]
        }
        
        print(f"✅ Manual login successful for user: {user_dict['firstname']} {user_dict['lastname']}")
        print(f"📋 User details: {user_dict}")
        
        return jsonify({
            'success': True,
            'message': f"✅ Login successful! Welcome {user_dict['firstname']} {user_dict['lastname']}",
            'user': user_dict
        }), 200
        
    except Exception as e:
        print(f"❌ Manual login error: {e}")
        return jsonify({
            'success': False,
            'message': '❌ Login failed. Please check your credentials and try again.'
        }), 500

@login_bp.route('/check-user/<school_number>', methods=['GET'])
def check_user(school_number):
    """Check if a school number exists"""
    try:
        db = next(get_db())
        
        query = text("SELECT school_number FROM users WHERE school_number = :school_number")
        result = db.execute(query, {'school_number': school_number})
        user = result.fetchone()
        
        exists = user is not None
        print(f"🔍 Check user {school_number}: {'Exists' if exists else 'Not found'}")
        
        return jsonify({
            'exists': exists
        }), 200
        
    except Exception as e:
        print(f"❌ Check user error: {e}")
        return jsonify({
            'exists': False,
            'error': str(e)
        }), 500

@login_bp.route('/check-rfid/<rfid_tag>', methods=['GET'])
def check_rfid(rfid_tag):
    """Check if an RFID tag exists - accepts both formats"""
    try:
        db = next(get_db())
        
        # Try exact match first
        query = text("SELECT rfid_tag FROM users WHERE rfid_tag = :rfid_tag")
        result = db.execute(query, {'rfid_tag': rfid_tag})
        user = result.fetchone()
        
        # If not found with exact match, try with RTU prefix added
        if not user and not rfid_tag.startswith('RTU'):
            rfid_with_rtu = f"RTU{rfid_tag}"
            result = db.execute(query, {'rfid_tag': rfid_with_rtu})
            user = result.fetchone()
        
        # If still not found, try without RTU prefix (if input had RTU)
        if not user and rfid_tag.startswith('RTU'):
            rfid_without_rtu = rfid_tag.replace('RTU', '')
            result = db.execute(query, {'rfid_tag': rfid_without_rtu})
            user = result.fetchone()
        
        exists = user is not None
        print(f"🔍 Check RFID {rfid_tag}: {'Exists' if exists else 'Not found'}")
        
        return jsonify({
            'exists': exists
        }), 200
        
    except Exception as e:
        print(f"❌ Check RFID error: {e}")
        return jsonify({
            'exists': False,
            'error': str(e)
        }), 500

@login_bp.route('/test-login', methods=['GET'])
def test_login():
    """Test endpoint to verify login routes are working"""
    try:
        db = next(get_db())
        
        # Get count of users for testing
        count_query = text("SELECT COUNT(*) FROM users")
        result = db.execute(count_query)
        user_count = result.fetchone()[0]
        
        # Get sample RFID for testing
        sample_query = text("SELECT rfid_tag FROM users LIMIT 1")
        result = db.execute(sample_query)
        sample_rfid = result.fetchone()
        
        return jsonify({
            'success': True,
            'message': 'Login routes are working correctly',
            'user_count': user_count,
            'sample_rfid': sample_rfid[0] if sample_rfid else 'No users found',
            'endpoints': {
                'rfid_login': 'POST /api/login/login with {"rfid_tag": "RFID_DATA"} - accepts both formats',
                'manual_login': 'POST /api/login/login with {"school_number": "ID", "password": "PASSWORD"}',
                'check_user': 'GET /api/login/check-user/{school_number}',
                'check_rfid': 'GET /api/login/check-rfid/{rfid_tag} - accepts both formats'
            }
        }), 200
        
    except Exception as e:
        print(f"❌ Test login error: {e}")
        return jsonify({
            'success': False,
            'message': f'Login test failed: {str(e)}'
        }), 500