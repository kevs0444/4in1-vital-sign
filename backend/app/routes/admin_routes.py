from flask import Blueprint, jsonify, request
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
                'email': user.email,
                'approval_status': user.approval_status,
                'created_at': user.created_at.strftime('%Y-%m-%d %H:%M:%S') if user.created_at else None,
                'last_checkup': user.measurements[-1].created_at.strftime('%Y-%m-%d %H:%M:%S') if user.measurements else None
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

@admin_bp.route('/users/<user_id>/status', methods=['PUT', 'OPTIONS'])
def update_user_status(user_id):
    # Handle CORS preflight request
    if request.method == 'OPTIONS':
        return jsonify({'success': True}), 200
    
    session = SessionLocal()
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'message': 'No JSON data provided'}), 400
            
        new_status = data.get('status')
        
        if not new_status:
            return jsonify({'success': False, 'message': 'Status is required'}), 400

        user = session.query(User).filter(User.user_id == user_id).first()
        if not user:
            return jsonify({'success': False, 'message': 'User not found'}), 404

        print(f"🔄 Updating status for user {user_id}: {user.approval_status} -> {new_status}")
        with open('backend_debug.log', 'a') as f:
            f.write(f"\n--- Update User Status: {user_id} ---\n")
            f.write(f"Status: {user.approval_status} -> {new_status}\n")
        
        user.approval_status = new_status
        
        print(f"💾 Attempting to commit status update for user {user_id}...")
        session.commit()
        print(f"✅ Status commit successful for user {user_id}")
        with open('backend_debug.log', 'a') as f:
            f.write(f"Commit successful for user {user_id}\n")

        # Broadcast the update via WebSocket
        try:
            from app.websocket_events import broadcast_user_status_update, broadcast_stats_update
            broadcast_user_status_update(user_id, new_status)
            broadcast_stats_update() # Trigger stats refetch for all admins
        except Exception as ws_err:
            print(f"⚠️ WebSocket broadcast failed: {ws_err}")

        return jsonify({
            'success': True,
            'message': f'User status updated to {new_status}'
        })
    except Exception as e:
        print(f"Error updating user status: {e}")
        session.rollback()
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500
    finally:
        session.close()

@admin_bp.route('/share-stats', methods=['GET'])
def get_share_stats():
    """
    Returns statistics for email and print sharing:
    - email_sent_count: Number of measurements with email_sent = 1 (filtered by created_at)
    - receipt_printed_count: Number of measurements with receipt_printed = 1 (filtered by created_at)
    - paper_remaining: 100 - TOTAL receipt_printed_count (for paper roll tracking)
    """
    session = SessionLocal()
    try:
        from app.models.measurement_model import Measurement
        
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        # Debug: Log the date filter parameters
        print("=" * 50)
        print("📧 SHARE STATS REQUEST")
        print(f"   Start Date: {start_date}")
        print(f"   End Date: {end_date}")
        
        # Email count - filtered by created_at date range
        email_query = session.query(func.count(Measurement.id)).filter(Measurement.email_sent == 1)
        if start_date:
            email_query = email_query.filter(Measurement.created_at >= start_date)
        if end_date:
            email_query = email_query.filter(Measurement.created_at <= end_date)
        email_count = email_query.scalar() or 0
        
        # Print count - ALSO filtered by created_at date range (for display)
        print_query = session.query(func.count(Measurement.id)).filter(Measurement.receipt_printed == 1)
        if start_date:
            print_query = print_query.filter(Measurement.created_at >= start_date)
        if end_date:
            print_query = print_query.filter(Measurement.created_at <= end_date)
        print_count = print_query.scalar() or 0
        
        # Paper remaining uses TOTAL print count (not filtered) for physical paper tracking
        total_print_count = session.query(func.count(Measurement.id)).filter(Measurement.receipt_printed == 1).scalar() or 0
        paper_remaining = max(0, 100 - total_print_count)
        
        # Debug: Log the results
        print(f"   📨 Emails Sent (filtered): {email_count}")
        print(f"   🖨️ Receipts Printed (filtered): {print_count}")
        print(f"   🧻 Total Printed (unfiltered): {total_print_count}")
        print(f"   📄 Paper Remaining: {paper_remaining}%")
        print("=" * 50)
        
        return jsonify({
            'success': True,
            'stats': {
                'email_sent_count': email_count,
                'receipt_printed_count': print_count,
                'paper_remaining': paper_remaining
            }
        })
    except Exception as e:
        print(f"Error fetching share stats: {e}")
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500
    finally:
        session.close()

@admin_bp.route('/reset-paper-roll', methods=['POST'])
def reset_paper_roll():
    """
    Resets all receipt_printed flags to 0.
    Called when a new thermal paper roll is inserted.
    """
    session = SessionLocal()
    try:
        from app.models.measurement_model import Measurement
        
        # Reset all receipt_printed to 0
        session.query(Measurement).filter(Measurement.receipt_printed == 1).update({Measurement.receipt_printed: 0})
        session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Paper roll reset successfully. All receipt counts cleared.'
        })
    except Exception as e:
        print(f"Error resetting paper roll: {e}")
        session.rollback()
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500
    finally:
        session.close()

