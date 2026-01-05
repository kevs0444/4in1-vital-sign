
import subprocess
import json

def check_cameras():
    try:
        cmd = "Get-PnpDevice -Class Camera -Status OK | Select-Object -ExpandProperty FriendlyName"
        result = subprocess.run(["powershell", "-Command", cmd], capture_output=True, text=True)
        
        found_cameras = [line.strip() for line in result.stdout.split('\n') if line.strip()]
        
        output = {
            "cameras": [{"index": i, "name": name} for i, name in enumerate(found_cameras)]
        }
        
        with open("camera_debug_output.json", "w") as f:
            json.dump(output, f, indent=4)
            
        print(f"Found {len(found_cameras)} cameras.")
        print(output)
        
    except Exception as e:
        with open("camera_debug_output.json", "w") as f:
            f.write(str(e))
        print(f"Error: {e}")

if __name__ == "__main__":
    check_cameras()
