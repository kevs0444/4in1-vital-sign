# app/routes/register_routes.py - FIXED DUPLICATE CHECK & PASSWORD HASHING
from flask import Blueprint, request, jsonify
from sqlalchemy import text
from app.utils.db import get_db
from werkzeug.security import generate_password_hash
import re

register_bp = Blueprint('register', __name__)

@register_bp.route('/register', methods=['POST'])
def register_user():
    """Register a new user with all personal information"""
    try:
        data = request.get_json()
        print("📥 Received registration data:", data)

        if not data:
            return jsonify({
                'success': False,
                'message': 'No data provided'
            }), 400

        # Extract and validate required fields
        # Extract and validate required fields
        # Note: rfidTag is OPTIONAL, so it is NOT in this list
        # mobileNumber removed as per request
        required_fields = ['userId', 'firstname', 'lastname', 'role', 'age', 'sex', 'email', 'password']
        
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({
                    'success': False,
                    'message': f'Missing required field: {field}'
                }), 400

        # Validate email format
        if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', data['email']):
            return jsonify({
                'success': False,
                'message': 'Invalid email format'
            }), 400

        db = next(get_db())
        
        # Check if user ID already exists
        check_user_query = text("SELECT user_id FROM users WHERE user_id = :user_id")
        existing_user = db.execute(check_user_query, {'user_id': data['userId']}).fetchone()
        
        if existing_user:
            return jsonify({
                'success': False,
                'message': 'User ID already exists'
            }), 400

        # Check if RFID tag already exists (only if provided)
        if data.get('rfidTag'):
            check_rfid_query = text("SELECT rfid_tag FROM users WHERE rfid_tag = :rfid_tag")
            existing_rfid = db.execute(check_rfid_query, {'rfid_tag': data['rfidTag']}).fetchone()
            
            if existing_rfid:
                return jsonify({
                    'success': False,
                    'message': 'RFID tag already registered'
                }), 400

        # Check if email already exists
        check_email_query = text("SELECT email FROM users WHERE email = :email")
        existing_email = db.execute(check_email_query, {'email': data['email']}).fetchone()
        
        if existing_email:
            return jsonify({
                'success': False,
                'message': 'Email already registered'
            }), 400

        # Check if school number already exists
        check_school_query = text("SELECT school_number FROM users WHERE school_number = :school_number")
        existing_school = db.execute(check_school_query, {'school_number': data.get('school_number', '')}).fetchone()
        
        if existing_school:
            return jsonify({
                'success': False,
                'message': 'School number already registered'
            }), 400

        # Check if user with same personal details exists (Name + Birthday)
        check_personal_query = text("""
            SELECT user_id FROM users 
            WHERE firstname = :firstname 
            AND lastname = :lastname 
            AND birthday = :birthday
        """)
        existing_personal = db.execute(check_personal_query, {
            'firstname': data['firstname'],
            'lastname': data['lastname'],
            'birthday': data.get('birthday')
        }).fetchone()
        
        if existing_personal:
            return jsonify({
                'success': False,
                'message': 'User with same name and birthday already registered'
            }), 400

        # Hash the password
        hashed_password = generate_password_hash(data['password'])

        # Determine Approval Status
        role_lower = data['role'].lower()
        approval_status = 'pending' if role_lower in ['nurse', 'doctor'] else 'approved'

        # Insert new user
        insert_query = text("""
            INSERT INTO users (
                user_id, rfid_tag, firstname, lastname, role, school_number, 
                birthday, age, sex, email, password, approval_status, created_at
            ) VALUES (
                :user_id, :rfid_tag, :firstname, :lastname, :role, :school_number,
                :birthday, :age, :sex, :email, :password, :approval_status, :created_at
            )
        """)
        
        db.execute(insert_query, {
            'user_id': data['userId'],
            'rfid_tag': data.get('rfidTag') if data.get('rfidTag') else None,
            'firstname': data['firstname'],
            'lastname': data['lastname'],
            'role': data['role'],
            'school_number': data.get('school_number', data['userId']),
            'birthday': data.get('birthday', None),
            'age': data['age'],
            'sex': data['sex'],
            'email': data['email'],
            'password': hashed_password, # Use hashed password
            'approval_status': approval_status,
            'created_at': data.get('created_at', None)
        })
        
        db.commit()

        print(f"✅ User registered successfully: {data['userId']}")

        return jsonify({
            'success': True,
            'message': 'User registered successfully',
            'data': {
                'user_id': data['userId'],
                'rfid_tag': data.get('rfidTag'),
                'firstname': data['firstname'],
                'lastname': data['lastname'],
                'role': data['role'],
                'school_number': data.get('school_number', data['userId']),
                'approval_status': approval_status,
                'created_at': data.get('created_at', None)
            }
        }), 201

    except Exception as e:
        print(f"❌ Registration error: {e}")
        return jsonify({
            'success': False,
            'message': f'Registration failed: {str(e)}'
        }), 500

@register_bp.route('/check-id', methods=['POST'])
def check_id():
    """Check if ID number already exists"""
    try:
        data = request.get_json()
        id_number = data.get('idNumber')
        user_type = data.get('userType')

        if not id_number:
            return jsonify({
                'exists': False,
                'message': 'No ID number provided'
            }), 400

        db = next(get_db())
        
        query = text("SELECT user_id FROM users WHERE user_id = :user_id")
        result = db.execute(query, {'user_id': id_number})
        user = result.fetchone()

        return jsonify({
            'exists': user is not None,
            'message': 'ID number already exists' if user else 'ID number available'
        }), 200

    except Exception as e:
        print(f"Check ID error: {e}")
        return jsonify({
            'exists': False,
            'message': f'Error checking ID: {str(e)}'
        }), 500

@register_bp.route('/check-email/<email>', methods=['GET'])
def check_email(email):
    """Check if email address already exists"""
    try:
        db = next(get_db())
        
        query = text("SELECT email FROM users WHERE email = :email")
        result = db.execute(query, {'email': email})
        user = result.fetchone()
        
        exists = user is not None
        print(f"🔍 Check email {email}: {'Exists' if exists else 'Available'}")

        return jsonify({
            'exists': exists,
            'message': 'Email already registered' if exists else 'Email available'
        }), 200

    except Exception as e:
        print(f"Check email error: {e}")
        return jsonify({
            'exists': False,
            'message': f'Error checking email: {str(e)}'
        }), 500



@register_bp.route('/check-school-number/<school_number>', methods=['GET'])
def check_school_number(school_number):
    """Check if school/employee number already exists"""
    try:
        db = next(get_db())
        
        query = text("SELECT school_number FROM users WHERE school_number = :school_number")
        result = db.execute(query, {'school_number': school_number})
        user = result.fetchone()
        
        exists = user is not None
        print(f"🔍 Check school number {school_number}: {'Exists' if exists else 'Available'}")

        return jsonify({
            'exists': exists,
            'message': 'School number already registered' if exists else 'School number available'
        }), 200

    except Exception as e:
        print(f"Check school number error: {e}")
        return jsonify({
            'exists': False,
            'message': f'Error checking school number: {str(e)}'
        }), 500

@register_bp.route('/check-personal-info', methods=['POST'])
def check_personal_info():
    """Check if user with same personal info exists (firstname, lastname, birthday/age, sex)"""
    try:
        data = request.get_json()
        
        firstname = data.get('firstname', '').strip()
        lastname = data.get('lastname', '').strip()
        age = data.get('age')
        sex = data.get('sex', '').lower()
        birth_month = data.get('birthMonth')
        birth_day = data.get('birthDay')
        birth_year = data.get('birthYear')
        
        if not firstname or not lastname:
            return jsonify({
                'exists': False,
                'message': 'Missing required fields'
            }), 400
        
        db = next(get_db())
        
        # Build birthday string if available
        birthday = None
        if birth_year and birth_month and birth_day:
            birthday = f"{birth_year}-{str(birth_month).zfill(2)}-{str(birth_day).zfill(2)}"
        
        # Check for duplicate using multiple criteria
        # Primary check: firstname, lastname, and birthday (most accurate)
        if birthday:
            query = text("""
                SELECT user_id, firstname, lastname FROM users 
                WHERE LOWER(firstname) = LOWER(:firstname) 
                AND LOWER(lastname) = LOWER(:lastname) 
                AND birthday = :birthday
            """)
            result = db.execute(query, {
                'firstname': firstname,
                'lastname': lastname,
                'birthday': birthday
            })
            user = result.fetchone()
            
            if user:
                print(f"🔍 Duplicate found: {firstname} {lastname} with birthday {birthday}")
                return jsonify({
                    'exists': True,
                    'message': f'A user named {firstname} {lastname} with this birthday is already registered.'
                }), 200
        
        # Secondary check: firstname, lastname, age, and sex (fallback)
        if age and sex:
            query = text("""
                SELECT user_id, firstname, lastname FROM users 
                WHERE LOWER(firstname) = LOWER(:firstname) 
                AND LOWER(lastname) = LOWER(:lastname) 
                AND age = :age
                AND LOWER(sex) = LOWER(:sex)
            """)
            result = db.execute(query, {
                'firstname': firstname,
                'lastname': lastname,
                'age': age,
                'sex': sex
            })
            user = result.fetchone()
            
            if user:
                print(f"🔍 Duplicate found: {firstname} {lastname}, Age {age}, Sex {sex}")
                return jsonify({
                    'exists': True,
                    'message': f'A user named {firstname} {lastname} with the same age and sex is already registered.'
                }), 200
        
        print(f"✅ No duplicate found for: {firstname} {lastname}")
        return jsonify({
            'exists': False,
            'message': 'Personal info available'
        }), 200

    except Exception as e:
        print(f"Check personal info error: {e}")
        return jsonify({
            'exists': False,
            'message': f'Error checking personal info: {str(e)}'
        }), 500

@register_bp.route('/test-connection', methods=['GET'])
def test_connection():
    """Test database connection for registration"""
    try:
        db = next(get_db())
        result = db.execute(text("SELECT NOW() as current_time"))
        current_time = result.fetchone()[0]
        
        return jsonify({
            'success': True,
            'message': 'Database connection successful',
            'current_time': str(current_time)
        }), 200

    except Exception as e:
        print(f"Connection test error: {e}")
        return jsonify({
            'success': False,
            'message': f'Database connection failed: {str(e)}'
        }), 500

@register_bp.route('/users', methods=['GET'])
def get_all_users():
    """Get all registered users (for testing)"""
    try:
        db = next(get_db())
        
        query = text("""
            SELECT user_id, firstname, lastname, role, rfid_tag, email, school_number, created_at 
            FROM users 
            ORDER BY created_at DESC
        """)
        
        result = db.execute(query)
        users = result.fetchall()
        
        user_list = []
        for user in users:
            user_list.append({
                'user_id': user[0],
                'firstname': user[1],
                'lastname': user[2],
                'role': user[3],
                'rfid_tag': user[4],
                'email': user[5],
                'school_number': user[6],
                'created_at': user[7]
            })

        return jsonify({
            'success': True,
            'users': user_list,
            'count': len(user_list)
        }), 200

    except Exception as e:
        print(f"Get users error: {e}")
        return jsonify({
            'success': False,
            'message': f'Failed to get users: {str(e)}'
        }), 500