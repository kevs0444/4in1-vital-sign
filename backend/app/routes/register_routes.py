# app/routes/register_routes.py - FIXED DUPLICATE CHECK
from flask import Blueprint, request, jsonify
from sqlalchemy import text
from app.utils.db import get_db
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
        required_fields = ['userId', 'rfidTag', 'firstname', 'lastname', 'role', 'age', 'sex', 'mobileNumber', 'email', 'password']
        
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
        
        # Check if user ID already exists - FIXED QUERY
        check_user_query = text("SELECT user_id FROM users WHERE user_id = :user_id")
        existing_user = db.execute(check_user_query, {'user_id': data['userId']}).fetchone()
        
        if existing_user:
            return jsonify({
                'success': False,
                'message': 'User ID already exists'
            }), 400

        # Check if RFID tag already exists
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

        # Insert new user
        insert_query = text("""
            INSERT INTO users (
                user_id, rfid_tag, firstname, lastname, role, school_number, 
                birthday, age, sex, mobile_number, email, password, created_at
            ) VALUES (
                :user_id, :rfid_tag, :firstname, :lastname, :role, :school_number,
                :birthday, :age, :sex, :mobile_number, :email, :password, :created_at
            )
        """)
        
        db.execute(insert_query, {
            'user_id': data['userId'],
            'rfid_tag': data['rfidTag'],
            'firstname': data['firstname'],
            'lastname': data['lastname'],
            'role': data['role'],
            'school_number': data.get('school_number', data['userId']),  # Use userId as school_number if not provided
            'birthday': data.get('birthday', None),
            'age': data['age'],
            'sex': data['sex'],
            'mobile_number': data['mobileNumber'],
            'email': data['email'],
            'password': data['password'],
            'created_at': data.get('created_at', None)
        })
        
        db.commit()

        print(f"✅ User registered successfully: {data['userId']}")

        return jsonify({
            'success': True,
            'message': 'User registered successfully',
            'data': {
                'user_id': data['userId'],
                'rfid_tag': data['rfidTag'],
                'firstname': data['firstname'],
                'lastname': data['lastname'],
                'role': data['role'],
                'school_number': data.get('school_number', data['userId']),
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