from flask import Blueprint, jsonify
import os
import logging
from app.sensors.camera_manager import camera_manager

bp_ai_camera_bp = Blueprint('bp_ai_camera', __name__)

@bp_ai_camera_bp.route('/analyze-bp-camera', methods=['POST'])
def analyze_bp_camera():
    """
    Captures the current frame from the camera and uses a Hybrid YOLOv11 + EasyOCR Approach
    to read the Systolic and Diastolic values from a BP monitor screen.
    """
    # 1. Get image from camera manager
    frame_bytes = camera_manager.get_frame()
    if not frame_bytes:
        return jsonify({'success': False, 'message': 'Camera not active or no frame available'}), 400

    # 3. Hybrid YOLOv11 + EasyOCR Approach
    try:
        import easyocr
        import numpy as np
        import cv2
        from ultralytics import YOLO

        # 1. LOAD YOLO MODEL (Load once if possible, but here for safety)
        # We use the existing nano model
        yolo_path = os.path.join(os.path.dirname(__file__), '../../ai_camera/models/yolo11n.pt')
        yolo_model = YOLO(yolo_path)

        # 2. LOAD EASYOCR READER
        # Initialize reader (CPU mode)
        reader = easyocr.Reader(['en'], gpu=False, verbose=False) 

        # Decode image
        nparr = np.frombuffer(frame_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        # --- NEW STRATEGY: GRID-BASED EXTRACTION ---
        # We assume the user has aligned the screen to our SVG template.
        # We slice the image into 3 predefined regions.
        
        logging.info("📸 Processing image with GRID ALIGNMENT strategy")
        
        h, w = img.shape[:2]
        
        # 1. DEFINE REGIONS (Must match frontend SVG percentages roughly)
        # SYS (Top): y=20% to 40%, x=20% to 80%
        # DIA (Mid): y=45% to 65%, x=25% to 75%
        
        sys_crop = img[int(h*0.20):int(h*0.42), int(w*0.20):int(w*0.80)]
        dia_crop = img[int(h*0.45):int(h*0.65), int(w*0.25):int(w*0.75)]
        
        def read_digit_region(crop_img, region_name):
            # Preprocess specifically for 7-segment digits
            gray = cv2.cvtColor(crop_img, cv2.COLOR_BGR2GRAY)
            
            # Massive scale up
            gray = cv2.resize(gray, None, fx=3, fy=3, interpolation=cv2.INTER_CUBIC)
            
            # CLAHE for contrast
            clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8,8))
            gray = clahe.apply(gray)
            
            # Thresholding - Try Otsu
            _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
            
            # Use EasyOCR
            # We treat each line as a single number block
            results = reader.readtext(thresh, allowlist='0123456789', decoder='greedy')
            print(f"   🔎 {region_name} Raw: {results}")
            
            best_val = 0
            best_conf = 0
            
            for (bbox, text, prob) in results:
                digits = ''.join(filter(str.isdigit, text))
                if digits:
                    try:
                        val = int(digits)
                        # Basic sanity ranges
                        if region_name == "SYS" and (80 <= val <= 250):
                            if prob > best_conf: best_val = val; best_conf = prob
                        elif region_name == "DIA" and (40 <= val <= 140):
                            if prob > best_conf: best_val = val; best_conf = prob
                    except: pass
            
            return best_val
            
        systolic = read_digit_region(sys_crop, "SYS")
        diastolic = read_digit_region(dia_crop, "DIA")
        
        print(f"   ✅ Final Grid Result: Sys={systolic}, Dia={diastolic}")

        # --- FALLBACK: GEMINI 1.5 FLASH (Cloud AI) ---
        if systolic == 0 or diastolic == 0:
            logging.info("⚠️ Local OCR failed. Attempting Gemini 1.5 Flash fallback...")
            
            gemini_key = os.getenv('GEMINI_API_KEY')
            if gemini_key:
                try:
                    import google.generativeai as genai
                    from PIL import Image
                    import io
                    import json

                    genai.configure(api_key=gemini_key)
                    
                    # LOGIC: DYNAMICALLY FIND A WORKING VISION MODEL
                    target_model_name = 'models/gemini-1.5-flash' # Default preference
                    try:
                        available_models = list(genai.list_models())
                        vision_models = [m.name for m in available_models if 'generateContent' in m.supported_generation_methods and 'vision' in m.name.lower() or 'flash' in m.name.lower() or 'pro' in m.name.lower()]
                        logging.info(f"📋 Available Vision-capable Models: {vision_models}")
                        
                        # Prioritize flash, then pro, then anything else
                        flash_models = [m for m in vision_models if 'flash' in m]
                        pro_models = [m for m in vision_models if 'pro' in m]
                        
                        if flash_models:
                            target_model_name = flash_models[0]
                        elif pro_models:
                            target_model_name = pro_models[0]
                        elif vision_models:
                            target_model_name = vision_models[0]
                            
                        logging.info(f"🤖 Selected Gemini Model: {target_model_name}")
                        
                    except Exception as e:
                         logging.warning(f"⚠️ Could not list models: {e}. Defaulting to gemini-1.5-flash")

                    # Convert CV2 image to PIL
                    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
                    pil_img = Image.fromarray(img_rgb)
                    
                    model = genai.GenerativeModel(target_model_name)
                    
                    prompt = """
                    Read the digital blood pressure monitor screen in this image.
                    Return ONLY a JSON object with keys 'systolic' and 'diastolic' as integers.
                    Example: {"systolic": 120, "diastolic": 80}
                    Do not add markdown formatting.
                    """
                    
                    response = model.generate_content([prompt, pil_img])
                    
                    if response.text:
                        text = response.text.strip().replace('```json', '').replace('```', '')
                        data = json.loads(text)
                        
                        sys_g = data.get('systolic', 0)
                        dia_g = data.get('diastolic', 0)
                        
                        logging.info(f"⚡ Gemini 1.5 Flash Result: Sys={sys_g}, Dia={dia_g}")
                        
                        if sys_g > 0 and dia_g > 0:
                            return jsonify({
                                'success': True, 
                                'systolic': sys_g, 
                                'diastolic': dia_g,
                                'source': 'cloud_ai'
                            })
                except Exception as g_err:
                    logging.error(f"❌ Gemini Fallback Failed: {g_err}")

        # Final Check
        if systolic == 0 or diastolic == 0:
             return jsonify({
                 'success': False, 
                 'message': f'Could not read clearly. Please align widely. Sys:{systolic} Dia:{diastolic}'
             })
             
        return jsonify({
            'success': True, 
            'systolic': systolic, 
            'diastolic': diastolic
        })

    except ImportError:
        return jsonify({'success': False, 'message': 'Dependencies not installed'}), 500
    except Exception as e:
        print(f"❌ Hybrid Vision Error: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500
