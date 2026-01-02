from flask import Blueprint, request, jsonify
from app.utils.db import get_db
from app.models.measurement_model import Measurement
from sqlalchemy.orm import Session
import datetime

measurement_bp = Blueprint('measurement', __name__)

@measurement_bp.route('/save', methods=['POST'])
def save_measurement():
    """
    Saves a new measurement record.
    Expects JSON payload with optional keys:
    - user_id
    - temperature, systolic, diastolic, heart_rate, spo2, weight, height, bmi
    - risk_level, risk_category
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'message': 'No data provided'}), 400

        # Extract data with .get() to return None if missing (handling NULLs)
        # We explicitly cast simplistic types to avoid SQL errors if empty strings are sent
        
        def clean_float(value):
            if value is None or value == "":
                return None
            try:
                return float(value)
            except ValueError:
                return None

        def clean_int(value):
            if value is None or value == "":
                return None
            try:
                return int(float(value)) # int(float("36.5")) -> 36
            except ValueError:
                return None

        # Create new Measurement object
        new_measurement = Measurement(
            user_id=data.get('user_id'),
            temperature=clean_float(data.get('temperature')),
            systolic=clean_int(data.get('systolic')),
            diastolic=clean_int(data.get('diastolic')),
            heart_rate=clean_int(data.get('heart_rate')),
            spo2=clean_int(data.get('spo2')),
            respiratory_rate=clean_int(data.get('respiratory_rate')),
            weight=clean_float(data.get('weight')),
            height=clean_float(data.get('height')),
            bmi=clean_float(data.get('bmi')),
            risk_level=clean_float(data.get('risk_level')),
            risk_category=data.get('risk_category')
        )

        db: Session = next(get_db())
        db.add(new_measurement)
        db.flush() # Flush to get ID without committing transaction yet

        # Save Recommendations (Flattened Structure)
        from app.models.recommendation_model import Recommendation

        # Helper to join list into string if needed (since DB column is Text)
        def format_content(content):
            if not content: return None
            if isinstance(content, list):
                return "\n".join([str(c) for c in content if c])
            return str(content)

        # Check if we have any recommendations to save
        has_recs = any([
            data.get('suggestions'),
            data.get('preventions'),
            data.get('wellnessTips'),
            data.get('providerGuidance')
        ])

        if has_recs:
            rec = Recommendation(
                measurement_id=new_measurement.id,
                user_id=new_measurement.user_id, # Link to user as well
                medical_action=format_content(data.get('suggestions')),
                preventive_strategy=format_content(data.get('preventions')),
                wellness_tips=format_content(data.get('wellnessTips')),
                provider_guidance=format_content(data.get('providerGuidance'))
            )
            db.add(rec)

        db.commit()

        return jsonify({
            'success': True, 
            'message': 'Measurement saved successfully',
            'id': new_measurement.id
        }), 201

    except Exception as e:
        print(f"❌ Error saving measurement: {e}")
        db.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

@measurement_bp.route('/<string:measurement_id>/share-status', methods=['POST'])
def update_share_status(measurement_id):
    """
    Updates the sharing status (email sent / receipt printed) for a measurement.
    Expects JSON: { "type": "email" | "print", "status": true }
    """
    try:
        data = request.get_json()
        share_type = data.get('type')
        status = 1 if data.get('status') else 0

        db: Session = next(get_db())
        measurement = db.query(Measurement).filter(Measurement.id == measurement_id).first()

        if not measurement:
            return jsonify({'success': False, 'message': 'Measurement not found'}), 404

        if share_type == 'email':
            measurement.email_sent = status
        elif share_type == 'print':
            measurement.receipt_printed = status
        else:
            return jsonify({'success': False, 'message': 'Invalid share type'}), 400

        db.commit()
        return jsonify({'success': True, 'message': f'Updated {share_type} status'}), 200

    except Exception as e:
        print(f"❌ Error updating share status: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500

@measurement_bp.route('/history/<user_id>', methods=['GET'])
def get_user_history(user_id):
    """
    Retrieves measurement history for a specific user.
    """
    try:
        db: Session = next(get_db())
        # Sort by latest first
        measurements = db.query(Measurement).filter(Measurement.user_id == user_id).order_by(Measurement.created_at.desc()).all()
        
        history = []
        for m in measurements:
            rec_data = {}
            if m.recommendation:
                rec_data = {
                    'medical_action': m.recommendation.medical_action,
                    'preventive_strategy': m.recommendation.preventive_strategy,
                    'wellness_tips': m.recommendation.wellness_tips,
                    'provider_guidance': m.recommendation.provider_guidance
                }

            history.append({
                'id': m.id,
                'created_at': m.created_at.isoformat(),
                'temperature': m.temperature,
                'systolic': m.systolic,
                'diastolic': m.diastolic,
                'heart_rate': m.heart_rate,
                'spo2': m.spo2,
                'respiratory_rate': m.respiratory_rate,
                'weight': m.weight,
                'height': m.height,
                'bmi': m.bmi,
                'risk_category': m.risk_category,
                'risk_score': m.risk_level,
                'recommendation': rec_data
            })
            
        return jsonify({'success': True, 'history': history}), 200

    except Exception as e:
        print(f"❌ Error fetching history: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500

@measurement_bp.route('/analytics/population', methods=['GET'])
def get_population_analytics():
    """
    Returns aggregate analytics for all measurements.
    """
    try:
        db: Session = next(get_db())
        from sqlalchemy import func
        
        # 1. Overall Averages
        stats = db.query(
            func.avg(Measurement.heart_rate).label('avg_hr'),
            func.avg(Measurement.systolic).label('avg_sys'),
            func.avg(Measurement.diastolic).label('avg_dia'),
            func.avg(Measurement.spo2).label('avg_spo2'),
            func.avg(Measurement.temperature).label('avg_temp'),
            func.avg(Measurement.bmi).label('avg_bmi'),
            func.count(Measurement.id).label('total_measurements')
        ).first()

        # 2. Risk Distribution
        risk_dist = db.query(
            Measurement.risk_category, 
            func.count(Measurement.id)
        ).group_by(Measurement.risk_category).all()
        risk_data = {cat: count for cat, count in risk_dist if cat}

        # 3. Daily Trends (Last 7 days)
        seven_days_ago = datetime.datetime.utcnow() - datetime.timedelta(days=7)
        trends = db.query(
            func.date(Measurement.created_at).label('date'),
            func.avg(Measurement.heart_rate).label('avg_hr'),
            func.avg(Measurement.systolic).label('avg_sys'),
            func.avg(Measurement.diastolic).label('avg_dia')
        ).filter(Measurement.created_at >= seven_days_ago)\
         .group_by(func.date(Measurement.created_at))\
         .order_by(func.date(Measurement.created_at)).all()

        trend_data = []
        for t in trends:
            trend_data.append({
                'date': str(t.date),
                'avg_hr': round(float(t.avg_hr or 0), 1),
                'avg_sys': round(float(t.avg_sys or 0), 1),
                'avg_dia': round(float(t.avg_dia or 0), 1)
            })

        return jsonify({
            'success': True,
            'analytics': {
                'averages': {
                    'heart_rate': round(float(stats.avg_hr or 0), 1),
                    'systolic': round(float(stats.avg_sys or 0), 1),
                    'diastolic': round(float(stats.avg_dia or 0), 1),
                    'spo2': round(float(stats.avg_spo2 or 0), 1),
                    'temperature': round(float(stats.avg_temp or 0), 1),
                    'bmi': round(float(stats.avg_bmi or 0), 1),
                    'total': stats.total_measurements
                },
                'risk_distribution': risk_data,
                'trends': trend_data
            }
        }), 200

    except Exception as e:
        print(f"❌ Error fetching population analytics: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500
