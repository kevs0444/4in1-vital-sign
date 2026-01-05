"""
Camera Identification Script
Opens each camera index one by one so user can identify which physical camera it is.
"""
import cv2
import time

def test_cameras():
    print("\n" + "="*60)
    print("CAMERA IDENTIFICATION TEST")
    print("="*60)
    print("This script will open each camera index one by one.")
    print("Look at the physical camera and note which one lights up.")
    print("Press any key to move to the next camera.")
    print("="*60 + "\n")
    
    # Test indices 0, 1, 2
    results = {}
    
    for idx in range(3):
        print(f"\n>>> Opening Camera Index {idx}...")
        cap = cv2.VideoCapture(idx, cv2.CAP_DSHOW)
        
        if not cap.isOpened():
            print(f"   ❌ Camera {idx} could not be opened.")
            results[idx] = "FAILED TO OPEN"
            continue
        
        # Give it a moment
        time.sleep(0.5)
        
        # Try to read a frame
        ret, frame = cap.read()
        if not ret:
            print(f"   ⚠️ Camera {idx} opened but no frame received.")
            results[idx] = "NO FRAME"
            cap.release()
            continue
        
        print(f"   ✅ Camera {idx} is ACTIVE. Look at which physical camera has the LED on!")
        print(f"   [Press any key in the window to continue...]")
        
        # Display the frame
        window_name = f"Camera Index {idx} - IDENTIFY THIS CAMERA"
        cv2.imshow(window_name, frame)
        cv2.waitKey(0)  # Wait for any key press
        cv2.destroyWindow(window_name)
        
        cap.release()
        
        # Ask user to identify (in console)
        print(f"   What camera was this? (Type: weight, wearables, or bp)")
        user_input = input(f"   Camera {idx} is: ").strip().lower()
        results[idx] = user_input
        
        time.sleep(0.3)  # Brief pause between cameras
    
    print("\n" + "="*60)
    print("RESULTS:")
    print("="*60)
    for idx, name in results.items():
        print(f"   Index {idx}: {name}")
    
    # Generate config
    config = {}
    for idx, name in results.items():
        if name == "weight":
            config["weight_index"] = idx
        elif name == "wearables":
            config["wearables_index"] = idx
        elif name == "bp":
            config["bp_index"] = idx
    
    print("\n" + "="*60)
    print("SUGGESTED camera_config.json:")
    print("="*60)
    import json
    print(json.dumps(config, indent=4))
    
    # Save to file
    with open("camera_config.json", "w") as f:
        json.dump(config, f, indent=4)
    print("\n✅ Configuration saved to camera_config.json!")
    print("="*60)

if __name__ == "__main__":
    test_cameras()
