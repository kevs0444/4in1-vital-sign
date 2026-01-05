import serial
import time
import threading
import logging
from serial.tools import list_ports

logger = logging.getLogger(__name__)

class SerialInterface:
    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super(SerialInterface, cls).__new__(cls)
                    cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
            
        self.serial_conn = None
        self.is_connected = False
        self.port = None
        self.baudrate = 115200 # Matched to Arduino
        
        self.listeners = [] # List of callback functions
        
        self._listener_thread = None
        self._stop_listener = False
        self._initialized = True

    def register_listener(self, callback):
        """Register a callback to receive parsed serial lines"""
        if callback not in self.listeners:
            self.listeners.append(callback)

    def connect(self):
        """Connect to Arduino"""
        if self.is_connected:
            return True, f"Already connected to {self.port}"

        try:
            arduino_port, desc_name = self._find_arduino_port()
            if not arduino_port:
                return False, "Arduino port not found"

            self.port = arduino_port
            self.serial_conn = serial.Serial(
                port=self.port,
                baudrate=self.baudrate,
                timeout=3,  # Increased from 1 to 3 seconds
                write_timeout=3  # Increased from 1 to 3 seconds for buffer-heavy operations
            )
            
            self.is_connected = True
            self._start_data_listener()
            
            logger.info(f"[SensorManager] Connected to Arduino ({desc_name}) on {self.port}")
            return True, f"Connected to {self.port}"

        except Exception as e:
            self.is_connected = False
            return False, f"Connection failed: {str(e)}"

    def disconnect(self):
        """Disconnect from Arduino"""
        try:
            self._stop_listener = True
            if self._listener_thread:
                self._listener_thread.join(timeout=1)
            
            if self.serial_conn and self.serial_conn.is_open:
                # self.send_command("SHUTDOWN_ALL") # Optional: clean shutdown
                time.sleep(0.5)
                self.serial_conn.close()
                
            self.is_connected = False
            self.port = None
            return True, "Disconnected successfully"
        except Exception as e:
            return False, f"Disconnect failed: {str(e)}"

    def send_command(self, command):
        """Send a command to the Arduino with buffer management"""
        if not self.is_connected or not self.serial_conn:
            return False
            
        try:
            # Clear input buffer before sending critical commands
            # This prevents old data from interfering
            if self.serial_conn.in_waiting > 100:
                logger.warning(f"Serial buffer has {self.serial_conn.in_waiting} bytes - clearing")
                self.serial_conn.reset_input_buffer()
            
            cmd_str = f"{command}\n"
            self.serial_conn.write(cmd_str.encode())
            self.serial_conn.flush()  # Ensure data is actually sent
            return True
        except Exception as e:
            logger.error(f"Failed to send command {command}: {e}")
            return False

    def _find_arduino_port(self):
        ports = list_ports.comports()
        
        # DEBUG: Print all available ports
        print("🔍 Scanning COM ports...")
        for port in ports:
            print(f"   📌 {port.device}: {port.description}")
        
        # 1. Look for explicit MEGA
        for port in ports:
            if "mega" in port.description.lower():
                print(f"✅ Found Arduino Mega on {port.device}")
                return port.device, "Mega"
        
        # 2. Look for Generic Arduino (excluding typical Nano signatures if possible)
        for port in ports:
            desc = port.description.lower()
            if "arduino" in desc and "nano" not in desc:
                print(f"✅ Found Arduino (non-Nano) on {port.device}: {port.description}")
                return port.device, "Main Board"

        # 3. Fallback to anything with CH340 (common for Mega clones)
        for port in ports:
            desc = port.description.lower()
            if 'ch340' in desc:
                print(f"⚠️ Fallback to CH340 device on {port.device}: {port.description}")
                return port.device, "CH340"
        
        # 4. Last resort - any USB serial
        for port in ports:
            desc = port.description.lower()
            if 'usb serial' in desc or 'arduino' in desc:
                print(f"⚠️ Last resort fallback on {port.device}: {port.description}")
                return port.device, "Generic"
        
        print("❌ No Arduino port found!")
        return None, None

    def _start_data_listener(self):
        self._stop_listener = False
        self._listener_thread = threading.Thread(target=self._listen_serial)
        self._listener_thread.daemon = True
        self._listener_thread.start()

    def _listen_serial(self):
        while not self._stop_listener and self.is_connected:
            try:
                if self.serial_conn and self.serial_conn.in_waiting:
                    line = self.serial_conn.readline().decode('utf-8', errors='ignore').strip()
                    if line:
                        self._notify_listeners(line)
                else:
                    time.sleep(0.01) 
            except Exception as e:
                logger.error(f"Serial listener error: {e}")
                time.sleep(0.1)

    def _notify_listeners(self, data):
        for callback in self.listeners:
            try:
                callback(data)
            except Exception as e:
                logger.error(f"Listener callback error: {e}")
