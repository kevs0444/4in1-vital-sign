from flask import Blueprint, jsonify
from sqlalchemy import func, desc
from app.utils.db import SessionLocal
from app.models.user_model import User, RoleEnum
import datetime

admin_bp = Blueprint('admin', __name__)

@admin_bp.route('/stats', methods=['GET'])
def get_admin_stats():
    session = SessionLocal()
    try:
        # 1. Total Users
        total_users = session.query(User).count()

        # 2. Users by Role
        roles_data = {role.value: 0 for role in RoleEnum}
        
        role_counts = session.query(User.role, func.count(User.role)).group_by(User.role).all()
        
        for role, count in role_counts:
            if hasattr(role, 'value'):
                 roles_data[role.value] = count
            else:
                 roles_data[str(role)] = count

        return jsonify({
            'success': True,
            'stats': {
                'total_users': total_users,
                'roles_distribution': roles_data,
                'system_health': '98%' 
            }
        })
    except Exception as e:
        print(f"Error fetching admin stats: {e}")
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500
    finally:
        session.close()

@admin_bp.route('/users', methods=['GET'])
def get_all_users():
    session = SessionLocal()
    try:
        # Fetch all users, ordered by created_at desc
        users = session.query(User).order_by(desc(User.created_at)).all()
        
        users_list = []
        for user in users:
            users_list.append({
                'user_id': user.user_id,
                'rfid_tag': user.rfid_tag,
                'firstname': user.firstname,
                'lastname': user.lastname,
                'role': user.role.value if hasattr(user.role, 'value') else str(user.role),
                'school_number': user.school_number,
                'birthday': user.birthday.isoformat() if user.birthday else None,
                'age': user.age,
                'sex': user.sex.value if hasattr(user.sex, 'value') else str(user.sex),
                'mobile_number': user.mobile_number,
                'email': user.email,
                'created_at': user.created_at.strftime('%Y-%m-%d %H:%M:%S') if user.created_at else None
            })

        return jsonify({
            'success': True,
            'users': users_list
        })
    except Exception as e:
        print(f"Error fetching users: {e}")
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500
    finally:
        session.close()
