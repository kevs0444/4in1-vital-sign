
import json
import os
import logging
import subprocess

logger = logging.getLogger(__name__)

CONFIG_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'camera_config.json')

# Camera indices UPDATED based on user visual testing:
# Index 0 = Weight Compliance Camera (Feet/Platform) ✅ VERIFIED
# Index 1 = Blood Pressure Camera (BP Monitor)
# Index 2 = Wearables Compliance Camera (Body)
DEFAULT_CONFIG = {
    "weight_index": 0,      # VERIFIED: Shows feet/platform
    "wearables_index": 2,   # Wearables camera (body)
    "bp_index": 1           # BP Monitor camera
}

# The names explicitly set by the user in Windows Registry (Device Manager)
# These MUST match the EXACT FriendlyName set in registry (including prefixes)
TARGET_MAPPING = {
    # Primary matches (with prefix as shown in registry)
    "0 - Weight Compliance Camera": "weight",
    "1 - Wearables Compliance Camera": "wearables",
    "2 - Blood Pressure Camera": "bp",
    # Fallbacks in case of partial matches (without prefix)
    "Weight Compliance Camera": "weight",
    "Wearables Compliance Camera": "wearables",
    "Blood Pressure Camera": "bp",
    # Short name fallbacks
    "Weight Compliance": "weight",
    "Wearables Compliance": "wearables",
    "Blood Pressure": "bp",
    "Weight": "weight",
    "Wearables": "wearables"
}

class CameraConfig:
    @staticmethod
    def load():
        # 1. Try to load from file
        config = DEFAULT_CONFIG.copy()
        if os.path.exists(CONFIG_FILE):
            try:
                with open(CONFIG_FILE, 'r') as f:
                    file_config = json.load(f)
                    config.update(file_config)
                    logger.info("Configuration loaded from file.")
            except Exception as e:
                logger.error(f"Failed to load config file: {e}")
        else:
             logger.info("Config file not found, using defaults.")
             # Auto-detect on first load if missing
             CameraConfig.autodetect_indices()
             # Reload after autodetection
             if os.path.exists(CONFIG_FILE):
                try:
                    with open(CONFIG_FILE, 'r') as f:
                        config.update(json.load(f))
                except:
                    pass

        return config

    @staticmethod
    def save(config):
        try:
            with open(CONFIG_FILE, 'w') as f:
                json.dump(config, f, indent=4)
            logger.info(f"Configuration saved to {CONFIG_FILE}")
            return True
        except Exception as e:
            logger.error(f"Failed to save config: {e}")
            return False

    @staticmethod
    def get_index(role):
        """
        Get the camera index for a given role (weight, wearables, bp).
        IMPORTANT: This now simply returns the value from config file.
        The config file values were VERIFIED via visual testing and should be trusted.
        """
        config = CameraConfig.load()
        idx = config.get(f"{role}_index")
        
        # Simply return the config value - it's been verified!
        if idx is not None:
            return idx
        
        # Fallback to DEFAULT_CONFIG only if not in config file
        return DEFAULT_CONFIG.get(f"{role}_index")

    @staticmethod
    def autodetect_indices():
        """
        Uses PowerShell to list cameras by FriendlyName and map them to indices.
        Assumes OpenCV DSHOW enumeration order matches PNP enumeration order.
        """
        try:
            # PowerShell command to list camera FriendlyNames in order
            cmd = "Get-PnpDevice -Class Camera -Status OK | Select-Object -ExpandProperty FriendlyName"
            result = subprocess.run(["powershell", "-Command", cmd], capture_output=True, text=True)
            
            if result.returncode != 0:
                logger.error("PowerShell failed to list cameras")
                return

            # Clean output: split by lines, strip whitespace, remove empty
            found_cameras = [line.strip() for line in result.stdout.split('\n') if line.strip()]
            
            if not found_cameras:
                return

            detection_map = {}
            logger.info("----------- CAMERA DISCOVERY -----------")
            for idx, name in enumerate(found_cameras):
                logger.info(f"Index {idx}: {name}")
                
                # Check against targets
                for target_name, role in TARGET_MAPPING.items():
                    if target_name.lower() in name.lower():
                        detection_map[f"{role}_index"] = idx
                        # Keep checking other targets? No, specific overrides generic
                        break
            
            if detection_map:
                # Load existing to preserve other keys if any
                current_config = {}
                if os.path.exists(CONFIG_FILE):
                    try:
                        with open(CONFIG_FILE, 'r') as f:
                            current_config = json.load(f)
                    except:
                        pass
                
                # Update only what we found
                updated = False
                for key, val in detection_map.items():
                    if current_config.get(key) != val:
                        current_config[key] = val
                        updated = True
                        logger.info(f"📍 Mapped '{key}' to Index {val}")
                
                if updated:
                    CameraConfig.save(current_config)
            
            logger.info("----------------------------------------")

        except Exception as e:
            logger.error(f"Autodetection error: {e}")

    @staticmethod
    def get_index_by_name(target_name):
        """
        Resolves the OpenCV/device index for a given FriendlyName (e.g., 'Weight Compliance Camera').
        Returns index (int) or None if not found.
        """
        try:
            # List cameras in order (PowerShell)
            # This order matches the order OpenCV sees (Index 0, 1, 2...)
            cmd = "Get-PnpDevice -Class Camera -Status OK | Select-Object -ExpandProperty FriendlyName"
            result = subprocess.run(["powershell", "-Command", cmd], capture_output=True, text=True)
            
            if result.returncode != 0:
                logger.error("PowerShell failed to list cameras")
                return None

            found_cameras = [line.strip() for line in result.stdout.split('\n') if line.strip()]
            
            # Use Raw Order from PowerShell (PnP enumeration order usually matches DSHOW on this machine)
            # Do NOT sort alphabetically.
            # found_cameras.sort() 
            
            logger.info(f"Looking for camera '{target_name}' in Raw List: {found_cameras}")
            
            for idx, name in enumerate(found_cameras):
                # Loose matching to handle "Compliance" vs "Compliance Camera" etc.
                if target_name.lower() in name.lower():
                    logger.info(f"✅ Found '{target_name}' at Index {idx} (Raw Name: {name})")
                    return idx
            
            logger.warning(f"❌ Camera '{target_name}' not found in device list.")
            return None

        except Exception as e:
            logger.error(f"Error resolving camera index by name: {e}")
            return None

    @staticmethod
    def get_available_cameras():
        """
        Returns a list of detected cameras with their names and indices using PowerShell.
        Format: [{'index': 0, 'name': 'Camera Name'}, ...]
        """
        try:
            cmd = "Get-PnpDevice -Class Camera -Status OK | Select-Object -ExpandProperty FriendlyName"
            result = subprocess.run(["powershell", "-Command", cmd], capture_output=True, text=True)
            
            if result.returncode != 0:
                logger.error("PowerShell failed to list cameras")
                return []

            found_cameras = [line.strip() for line in result.stdout.split('\n') if line.strip()]
            
            camera_list = []
            for idx, name in enumerate(found_cameras):
                camera_list.append({"index": idx, "name": name})
                
            return camera_list

        except Exception as e:
            logger.error(f"Error getting available cameras: {e}")
            return []
