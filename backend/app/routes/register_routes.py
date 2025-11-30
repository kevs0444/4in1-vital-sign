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