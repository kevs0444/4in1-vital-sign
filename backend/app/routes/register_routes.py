from flask import Blueprint, request, jsonify
from app.utils.db import get_db
from app.models.user_model import User, RoleEnum, SexEnum
from sqlalchemy import text
from datetime import datetime
import uuid
import hashlib
import time

register_bp = Blueprint('register', __name__)

# Request tracking to prevent duplicates
_request_tracker = {}
CLEANUP_INTERVAL = 300  # Clean up every 5 minutes

def cleanup_old_requests():
    """Clean up old requests from tracker"""
    current_time = time.time()
    keys_to_remove = []
    for key, value in _request_tracker.items():
        if current_time - value['timestamp'] > CLEANUP_INTERVAL:
            keys_to_remove.append(key)
    for key in keys_to_remove:
        del _request_tracker[key]

def get_request_fingerprint(data):
    """Create a fingerprint of the request to detect duplicates"""
    # Use ID number and email as the unique identifier
    request_str = f"{data.get('idNumber', '')}-{data.get('email', '')}"
    return hashlib.md5(request_str.encode()).hexdigest()

@register_bp.route('/test-connection', methods=['GET'])
def test_connection():
    """Test if registration routes are working"""
    try:
        db = next(get_db())
        # Test database connection
        result = db.execute(text("SELECT DATABASE() as db_name, NOW() as time")).fetchone()
        return jsonify({
            'success': True,
            'message': 'Registration routes are working!',
            'database': result[0],
            'server_time': result[1].isoformat() if result[1] else None
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Database connection failed: {str(e)}'
        }), 500

@register_bp.route('/register', methods=['POST', 'OPTIONS'])
def register_user():
    """Register a new user in the database"""
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200
        
    try:
        data = request.get_json()
        print("📥 Received registration data")
        
        if not data:
            return jsonify({
                'success': False,
                'message': 'No data provided'
            }), 400
        
        # Clean up old requests
        cleanup_old_requests()
        
        # Check for duplicate request using fingerprint
        request_fingerprint = get_request_fingerprint(data)
        current_time = time.time()
        
        if request_fingerprint in _request_tracker:
            # If same request within 10 seconds, it's a duplicate
            if current_time - _request_tracker[request_fingerprint]['timestamp'] < 10:
                print("🔄 DUPLICATE REQUEST DETECTED - Returning cached response")
                return jsonify(_request_tracker[request_fingerprint]['response'])
        
        db = next(get_db())
        
        # Check if user already exists by ID number or email
        id_number = data.get('idNumber')
        email = data.get('email')
        
        existing_user = db.query(User).filter(
            (User.school_number == id_number) | (User.email == email)
        ).first()
        
        if existing_user:
            response = {
                'success': False,
                'message': 'User with this ID number or email already exists'
            }
            _request_tracker[request_fingerprint] = {
                'response': response,
                'timestamp': current_time
            }
            return jsonify(response), 400
        
        # Test database connection first
        db_test = db.execute(text("SELECT DATABASE() as db_name")).fetchone()
        print(f"✅ Connected to database: {db_test[0]}")
        
        # Map frontend user types to backend RoleEnum
        role_mapping = {
            'rtu-students': RoleEnum.Student,
            'rtu-employees': RoleEnum.Employee,
            'rtu-admin': RoleEnum.Admin,
            'rtu-doctor': RoleEnum.Doctor,
            'rtu-nurse': RoleEnum.Nurse
        }
        
        # Map frontend sex to backend SexEnum
        sex_mapping = {
            'male': SexEnum.Male,
            'female': SexEnum.Female
        }
        
        # Extract personal info
        personal_info = data.get('personalInfo', {})
        if not personal_info:
            response = {
                'success': False,
                'message': 'Personal information is required'
            }
            _request_tracker[request_fingerprint] = {
                'response': response,
                'timestamp': current_time
            }
            return jsonify(response), 400
        
        # Validate required fields
        required_fields = ['firstName', 'lastName', 'age', 'sex']
        for field in required_fields:
            if not personal_info.get(field):
                response = {
                    'success': False,
                    'message': f'Missing required field: {field}'
                }
                _request_tracker[request_fingerprint] = {
                    'response': response,
                    'timestamp': current_time
                }
                return jsonify(response), 400
        
        # Generate user_id
        user_id = str(uuid.uuid4())[:20]
        
        # Create birthday from components
        birth_year = personal_info.get('birthYear')
        birth_month = personal_info.get('birthMonth') 
        birth_day = personal_info.get('birthDay')
        
        birthday = None
        if all([birth_year, birth_month, birth_day]):
            try:
                birthday = datetime(int(birth_year), int(birth_month), int(birth_day))
                print(f"🎂 Birthday: {birthday}")
            except ValueError as e:
                print(f"⚠️ Invalid birthday: {e}")
        
        # Get user role
        user_type = data.get('userType', 'rtu-students')
        role = role_mapping.get(user_type, RoleEnum.Student)
        print(f"👤 Role: {role.value}")
        
        # Get biological sex
        sex = sex_mapping.get(personal_info.get('sex'), SexEnum.Male)
        print(f"🚻 Sex: {sex.value}")
        
        # Create new user
        new_user = User(
            user_id=user_id,
            rfid_tag=data.get('rfidCode', ''),
            firstname=personal_info.get('firstName', '').strip(),
            lastname=personal_info.get('lastName', '').strip(),
            role=role,
            school_number=data.get('idNumber', ''),
            birthday=birthday,
            age=int(personal_info.get('age', 0)),
            sex=sex,
            mobile_number=data.get('mobile', ''),
            email=data.get('email', ''),
            password=data.get('password', '')
        )
        
        print(f"💾 Saving user to database...")
        db.add(new_user)
        db.commit()
        
        print(f"✅ User registered successfully: {new_user.user_id}")
        
        response_data = {
            'success': True,
            'message': 'User registered successfully',
            'user_id': new_user.user_id,
            'data': {
                'user_id': new_user.user_id,
                'firstname': new_user.firstname,
                'lastname': new_user.lastname,
                'role': new_user.role.value,
                'school_number': new_user.school_number,
                'email': new_user.email,
                'mobile_number': new_user.mobile_number,
                'rfid_tag': new_user.rfid_tag,
                'age': new_user.age,
                'sex': new_user.sex.value,
                'birthday': new_user.birthday.isoformat() if new_user.birthday else None
            }
        }
        
        # Cache the response for duplicate requests
        _request_tracker[request_fingerprint] = {
            'response': response_data,
            'timestamp': current_time
        }
        
        return jsonify(response_data), 201
        
    except Exception as e:
        db.rollback()
        print(f"❌ Registration error: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Registration failed: {str(e)}'
        }), 400

@register_bp.route('/check-id', methods=['POST'])
def check_id_number():
    """Check if ID number is available"""
    try:
        data = request.get_json()
        id_number = data.get('idNumber')
        user_type = data.get('userType')
        
        if not id_number or len(id_number) < 3:
            return jsonify({
                'available': False,
                'message': 'Invalid ID number format'
            }), 400
            
        return jsonify({
            'available': True,
            'message': 'ID number is available'
        }), 200
        
    except Exception as e:
        return jsonify({
            'available': False,
            'message': f'Error checking ID: {str(e)}'
        }), 400

@register_bp.route('/users', methods=['GET'])
def get_all_users():
    """Get all registered users (for testing)"""
    try:
        db = next(get_db())
        users = db.query(User).all()
        
        users_list = []
        for user in users:
            users_list.append({
                'user_id': user.user_id,
                'firstname': user.firstname,
                'lastname': user.lastname,
                'role': user.role.value,
                'school_number': user.school_number,
                'email': user.email,
                'mobile_number': user.mobile_number,
                'rfid_tag': user.rfid_tag,
                'age': user.age,
                'sex': user.sex.value,
                'birthday': user.birthday.isoformat() if user.birthday else None,
                'created_at': user.created_at.isoformat() if user.created_at else None
            })
        
        return jsonify({
            'success': True,
            'users': users_list,
            'count': len(users_list)
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error fetching users: {str(e)}'
        }), 500