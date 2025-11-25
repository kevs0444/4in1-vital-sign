import cv2
import os
import time

def capture_images(class_name="socks"):
    # Create a folder to save images
    save_dir = os.path.join("raw_data", class_name)
    if not os.path.exists(save_dir):
        os.makedirs(save_dir)
        print(f"Created folder: {save_dir}")

    # Open Webcam (0 is usually the default, change to 1 if needed)
    cap = cv2.VideoCapture(0)
    
    if not cap.isOpened():
        print("Error: Could not open webcam.")
        return

    print(f"--- Capture Tool for '{class_name}' ---")
    print("Press 'SPACE' to save an image.")
    print("Press 'q' to quit.")
    
    count = 0
    
    while True:
        ret, frame = cap.read()
        if not ret:
            print("Error: Failed to capture frame.")
            break

        # Display the frame
        cv2.imshow(f"Capturing {class_name} (Press SPACE)", frame)

        key = cv2.waitKey(1) & 0xFF

        # Press SPACE to save
        if key == 32: # ASCII for Space
            timestamp = int(time.time() * 1000)
            filename = f"{class_name}_{timestamp}.jpg"
            filepath = os.path.join(save_dir, filename)
            cv2.imwrite(filepath, frame)
            count += 1
            print(f"Saved image #{count}: {filepath}")
            
            # Flash effect
            cv2.imshow(f"Capturing {class_name} (Press SPACE)", cv2.bitwise_not(frame))
            cv2.waitKey(50)

        # Press 'q' to quit
        elif key == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()
    print(f"Finished! Saved {count} images to {save_dir}")

if __name__ == "__main__":
    # You can change "socks" to "shoes" or anything else later
    capture_images("socks")
