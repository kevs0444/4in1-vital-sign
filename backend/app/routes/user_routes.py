# backend/app/routes/user_routes.py - User Profile Management
from flask import Blueprint, jsonify, request
from werkzeug.security import generate_password_hash, check_password_hash
from app.utils.db import SessionLocal
from app.models.user_model import User

user_bp = Blueprint('user', __name__)

@user_bp.route('/<user_id>', methods=['GET', 'OPTIONS'])
def get_user_profile(user_id):
    """Get user profile by user_id"""
    # Handle CORS preflight request
    if request.method == 'OPTIONS':
        return jsonify({'success': True}), 200
    
    session = SessionLocal()
    try:
        user = session.query(User).filter(User.user_id == user_id).first()
        if not user:
            return jsonify({'success': False, 'message': 'User not found'}), 404

        return jsonify({
            'success': True,
            'user': {
                'user_id': user.user_id,
                'rfid_tag': user.rfid_tag,
                'firstname': user.firstname,
                'middlename': user.middlename,
                'lastname': user.lastname,
                'suffix': user.suffix,
                'role': user.role.value if hasattr(user.role, 'value') else str(user.role),
                'school_number': user.school_number,
                'birthday': user.birthday.isoformat() if user.birthday else None,
                'age': user.age,
                'sex': user.sex.value if hasattr(user.sex, 'value') else str(user.sex),
                'email': user.email,
                'approval_status': user.approval_status,
                'created_at': user.created_at.strftime('%Y-%m-%d %H:%M:%S') if user.created_at else None
            }
        })
    except Exception as e:
        print(f"Error fetching user profile: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        session.close()


@user_bp.route('/<user_id>', methods=['PUT', 'OPTIONS'])
def update_user_profile(user_id):
    """Update user profile information"""
    if request.method == 'OPTIONS':
        return jsonify({'success': True}), 200
    
    session = SessionLocal()
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'message': 'No JSON data provided'}), 400

        with open('backend_debug.log', 'a') as f:
            f.write(f"\n--- Update User Profile: {user_id} ---\n")
            f.write(f"Data: {data}\n")
        
        user = session.query(User).filter(User.user_id == user_id).first()
        if not user:
            with open('backend_debug.log', 'a') as f:
                f.write(f"User not found: {user_id}\n")
            return jsonify({'success': False, 'message': 'User not found'}), 404

        # Update allowed fields (including 'role' for admin updates)
        updatable_fields = ['firstname', 'middlename', 'lastname', 'suffix', 'email', 'school_number', 'age', 'role']
        
        for field in updatable_fields:
            if field in data and data[field] is not None:
                # Check for email uniqueness if updating email
                if field == 'email' and data[field] != user.email:
                    existing = session.query(User).filter(User.email == data[field], User.user_id != user_id).first()
                    if existing:
                        return jsonify({'success': False, 'message': 'Email already in use'}), 400
                
                # Check for school_number uniqueness if updating
                if field == 'school_number' and data[field] != user.school_number:
                    existing = session.query(User).filter(User.school_number == data[field], User.user_id != user_id).first()
                    if existing:
                        return jsonify({'success': False, 'message': 'School number already in use'}), 400
                
                print(f"🔄 Field update: {field} = {data[field]}")
                if field == 'role':
                    try:
                        from app.models.user_model import RoleEnum
                        # Support both the string value and the Enum name
                        if isinstance(data[field], str):
                            # Try it as a literal string value first
                            try:
                                setattr(user, field, RoleEnum(data[field]))
                            except ValueError:
                                # Fallback to looking up by name
                                setattr(user, field, RoleEnum[data[field]])
                        else:
                            setattr(user, field, data[field])
                    except Exception as enum_err:
                        print(f"⚠️ Enum conversion error for role: {enum_err}")
                        with open('backend_debug.log', 'a') as f:
                            f.write(f"Enum conversion error for role: {enum_err}\n")
                        setattr(user, field, data[field]) # Fallback to raw value
                else:
                    setattr(user, field, data[field])

        print(f"💾 Attempting to commit profile updates for user {user_id}...")
        session.commit()
        print(f"✅ Commit successful for user {user_id}")
        # Broadcast the update via WebSocket
        try:
            from app.websocket_events import broadcast_stats_update, broadcast_to_all
            # If role was changed, broadcast stats update to admins
            if 'role' in data:
                broadcast_stats_update()
            
            # Notify the specific user of profile update
            broadcast_to_all('profile_update', {'user_id': user_id, 'updated_fields': list(data.keys())})
        except Exception as ws_err:
            print(f"⚠️ WebSocket broadcast failed: {ws_err}")

        return jsonify({
            'success': True,
            'message': 'Profile updated successfully',
            'user': {
                'user_id': user.user_id,
                'firstname': user.firstname,
                'middlename': user.middlename,
                'lastname': user.lastname,
                'suffix': user.suffix,
                'email': user.email,
                'school_number': user.school_number,
                'age': user.age,
                'role': user.role.value if hasattr(user.role, 'value') else str(user.role)
            }
        })
    except Exception as e:
        print(f"❌ Error updating user profile: {e}")
        session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        session.close()


@user_bp.route('/<user_id>/password', methods=['PUT', 'OPTIONS'])
def change_password(user_id):
    """Change user password"""
    if request.method == 'OPTIONS':
        return jsonify({'success': True}), 200
    
    session = SessionLocal()
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'message': 'No JSON data provided'}), 400

        current_password = data.get('current_password')
        new_password = data.get('new_password')
        confirm_password = data.get('confirm_password')

        if not current_password or not new_password or not confirm_password:
            return jsonify({'success': False, 'message': 'All password fields are required'}), 400

        if new_password != confirm_password:
            return jsonify({'success': False, 'message': 'New passwords do not match'}), 400

        if len(new_password) < 6:
            return jsonify({'success': False, 'message': 'Password must be at least 6 characters long'}), 400

        user = session.query(User).filter(User.user_id == user_id).first()
        if not user:
            return jsonify({'success': False, 'message': 'User not found'}), 404

        # Verify current password
        if not check_password_hash(user.password, current_password):
            return jsonify({'success': False, 'message': 'Current password is incorrect'}), 400

        # Update password
        user.password = generate_password_hash(new_password)
        session.commit()

        return jsonify({
            'success': True,
            'message': 'Password changed successfully'
        })
    except Exception as e:
        print(f"Error changing password: {e}")
        session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        session.close()


@user_bp.route('/<user_id>/rfid', methods=['PUT', 'OPTIONS'])
def update_user_rfid(user_id):
    """Update user RFID tag"""
    if request.method == 'OPTIONS':
        return jsonify({'success': True}), 200
    
    session = SessionLocal()
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'message': 'No JSON data provided'}), 400

        rfid_tag = data.get('rfid_tag', '').strip()
        
        if not rfid_tag:
            return jsonify({'success': False, 'message': 'RFID tag is required'}), 400
        
        # Validate RFID format (basic validation - alphanumeric, min 4 chars)
        if len(rfid_tag) < 4:
            return jsonify({'success': False, 'message': 'RFID tag must be at least 4 characters'}), 400

        user = session.query(User).filter(User.user_id == user_id).first()
        if not user:
            return jsonify({'success': False, 'message': 'User not found'}), 404

        # Check if RFID tag is already in use by another user
        existing = session.query(User).filter(
            User.rfid_tag == rfid_tag, 
            User.user_id != user_id
        ).first()
        
        if existing:
            return jsonify({'success': False, 'message': 'This RFID tag is already linked to another account'}), 400

        # Update RFID tag
        user.rfid_tag = rfid_tag
        session.commit()

        print(f"✅ RFID updated for user {user_id}: {rfid_tag}")

        return jsonify({
            'success': True,
            'message': 'RFID tag linked successfully',
            'rfid_tag': rfid_tag
        })
    except Exception as e:
        print(f"Error updating RFID: {e}")
        session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500
    finally:
        session.close()

