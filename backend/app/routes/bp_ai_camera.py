from flask import Blueprint, jsonify
import os
import logging

# LEGACY: Disabled - Module deleted as part of Unified Clearance refactor
# from app.sensors.weight_compliance_camera import weight_compliance_camera as camera_manager

# Stub to prevent crashes - this feature requires a dedicated BP camera manager
class StubCameraManager:
    def get_frame(self):
        return None
camera_manager = StubCameraManager()

bp_ai_camera_bp = Blueprint('bp_ai_camera', __name__)

@bp_ai_camera_bp.route('/analyze-bp-camera', methods=['POST'])
def analyze_bp_camera():
    """
    Captures the current frame from the camera and uses Gemini Cloud AI
    to read the Systolic and Diastolic values from a BP monitor screen.
    """
    import numpy as np
    import cv2
    
    # 1. Get image from camera manager
    frame_bytes = camera_manager.get_frame()
    if not frame_bytes:
        return jsonify({'success': False, 'message': 'Camera not active or no frame available'}), 400

    # Decode image
    nparr = np.frombuffer(frame_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    logging.info("🧠 Analyzing BP Image with Gemini Cloud AI...")
    
    gemini_key = os.getenv('GEMINI_API_KEY')
    if not gemini_key:
        return jsonify({'success': False, 'message': 'Gemini API Key missing'}), 500

    try:
        import google.generativeai as genai
        from PIL import Image
        import json

        genai.configure(api_key=gemini_key)
        
        # Find available model
        target_model = 'models/gemini-1.5-flash'
        try:
            models = list(genai.list_models())
            supported = [m for m in models if 'generateContent' in m.supported_generation_methods]
            for pref in ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash']:
                matches = [m.name for m in supported if pref in m.name]
                if matches:
                    target_model = matches[0]
                    break
        except:
            pass
        
        logging.info(f"🤖 Using Gemini model: {target_model}")
        
        # Prepare image
        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        pil_img = Image.fromarray(img_rgb)
        
        model = genai.GenerativeModel(target_model)
        prompt = """
        Read the digital blood pressure monitor in this image.
        Return ONLY a JSON object: {"systolic": 120, "diastolic": 80}
        """
        
        response = model.generate_content([prompt, pil_img])
        
        if response.text:
            clean = response.text.strip().replace('```json', '').replace('```', '')
            data = json.loads(clean)
            systolic = data.get('systolic', 0)
            diastolic = data.get('diastolic', 0)
            logging.info(f"✅ Gemini Result: Sys={systolic}, Dia={diastolic}")
            
            if systolic > 0 and diastolic > 0:
                return jsonify({
                    'success': True,
                    'systolic': systolic,
                    'diastolic': diastolic
                })
            else:
                return jsonify({
                    'success': False,
                    'message': 'AI could not read the numbers clearly.'
                })
        else:
            return jsonify({'success': False, 'message': 'AI returned empty response'})
                
    except Exception as e:
        logging.error(f"❌ Gemini failed: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500
