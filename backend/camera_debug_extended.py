
import subprocess
import json

def check_cameras_extended():
    try:
        # Check both Camera and Image classes
        cmd = "Get-PnpDevice -Status OK | Where-Object { $_.Class -eq 'Camera' -or $_.Class -eq 'Image' } | Select-Object -ExpandProperty FriendlyName"
        result = subprocess.run(["powershell", "-Command", cmd], capture_output=True, text=True)
        
        found_cameras = [line.strip() for line in result.stdout.split('\n') if line.strip()]
        
        # Sort them alphabetically as OpenCV often does
        sorted_cameras = sorted(found_cameras)
        
        output = {
            "raw_count": len(found_cameras),
            "raw_list": found_cameras,
            "sorted_list": sorted_cameras,
            "indices_if_sorted": {name: i for i, name in enumerate(sorted_cameras)}
        }
        
        with open("camera_debug_extended.json", "w") as f:
            json.dump(output, f, indent=4)
            
        print(f"Found {len(found_cameras)} devices.")
        print(output)
        
    except Exception as e:
        with open("camera_debug_extended.json", "w") as f:
            f.write(str(e))
        print(f"Error: {e}")

if __name__ == "__main__":
    check_cameras_extended()
