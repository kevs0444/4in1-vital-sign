import serial
import time
import threading
from typing import Dict, Any

class SensorManager:
    def __init__(self):
        self.ser = None
        self.connected = False
        self.current_measurement = None
        self.measurement_data = {}
        self.last_update = 0
        self.read_thread = None
        self.running = False
        self.buffer = ""
        
    def connect(self, port='COM3', baudrate=9600, timeout=1):
        """Connect to Arduino"""
        try:
            self.ser = serial.Serial(port, baudrate, timeout=timeout)
            time.sleep(2)  # Wait for Arduino to reset
            self.connected = True
            self.running = True
            # Start reading thread
            self.read_thread = threading.Thread(target=self._read_serial)
            self.read_thread.daemon = True
            self.read_thread.start()
            return True
        except Exception as e:
            print(f"Connection error: {e}")
            self.connected = False
            return False
            
    def disconnect(self):
        """Disconnect from Arduino"""
        self.running = False
        if self.ser and self.ser.is_open:
            self.ser.close()
        self.connected = False
        
    def _read_serial(self):
        """Read data from serial port in background thread"""
        while self.running and self.connected:
            try:
                if self.ser and self.ser.in_waiting:
                    line = self.ser.readline().decode('utf-8', errors='ignore').strip()
                    if line:
                        print(f"Arduino: {line}")
                        self._process_message(line)
                time.sleep(0.1)
            except Exception as e:
                print(f"Serial read error: {e}")
                time.sleep(1)
                
    def _process_message(self, message: str):
        """Process incoming messages from Arduino"""
        self.last_update = time.time()
        
        # Store raw message
        self.measurement_data['last_message'] = message
        self.measurement_data['last_update'] = self.last_update
        
        # Process different message types
        if "TEMP_FINAL" in message:
            try:
                temp_str = message.split(":")[1]
                temperature = float(temp_str)
                self.measurement_data['temperature'] = temperature
                self.measurement_data['status'] = 'completed'
                self.measurement_data['message'] = 'Measurement complete'
            except (IndexError, ValueError):
                pass
                
        elif "TEMP_DATA" in message:
            try:
                temp_str = message.split(":")[1]
                temperature = float(temp_str)
                self.measurement_data['temperature'] = temperature
                self.measurement_data['status'] = 'measuring'
                self.measurement_data['message'] = 'Measuring temperature...'
            except (IndexError, ValueError):
                pass
                
        elif "NO_USER_DETECTED" in message:
            self.measurement_data['status'] = 'no_user'
            self.measurement_data['message'] = 'No user detected. Please ensure sensor is on forehead.'
            self.measurement_data['temperature'] = None
            
        elif "TEMP_NO_CONTACT" in message:
            self.measurement_data['status'] = 'no_contact'
            self.measurement_data['message'] = 'Poor sensor contact. Please press sensor firmly on forehead.'
            self.measurement_data['temperature'] = None
            
        elif "HUMAN_DETECTED" in message:
            self.measurement_data['status'] = 'measuring'
            self.measurement_data['message'] = 'Human detected - measuring temperature...'
            
        elif "TEMP_MEASUREMENT_STARTED" in message:
            self.measurement_data['status'] = 'started'
            self.measurement_data['message'] = 'Temperature measurement started'
            self.measurement_data['temperature'] = None
            
        elif "MEASUREMENT_STOPPED" in message:
            if self.measurement_data.get('status') != 'completed':
                self.measurement_data['status'] = 'stopped'
                self.measurement_data['message'] = 'Measurement stopped'
                
    def start_measurement(self, sensor_type: str):
        """Start a measurement"""
        if not self.connected:
            return {'error': 'Not connected to Arduino'}
            
        try:
            if sensor_type == 'temp':
                self.ser.write(b"START_TEMP\n")
                # Reset measurement data
                self.measurement_data = {
                    'status': 'starting',
                    'message': 'Starting temperature measurement...',
                    'temperature': None,
                    'last_update': time.time()
                }
                return {'status': 'started', 'message': 'Temperature measurement started'}
            else:
                return {'error': f'Unknown sensor type: {sensor_type}'}
                
        except Exception as e:
            return {'error': f'Failed to start measurement: {str(e)}'}
            
    def get_measurement(self, sensor_type: str):
        """Get measurement data"""
        if sensor_type == 'temp':
            return self.measurement_data
        else:
            return {'error': f'Unknown sensor type: {sensor_type}'}
            
    def get_temperature_status(self):
        """Get detailed temperature status with detection info"""
        if not self.connected:
            return {'status': 'disconnected', 'message': 'Not connected to Arduino'}
            
        # Check if we have recent data
        if time.time() - self.last_update > 10:
            return {'status': 'timeout', 'message': 'No recent data from sensor'}
            
        return self.measurement_data
        
    def stop_measurement(self):
        """Stop current measurement"""
        if self.connected:
            try:
                self.ser.write(b"STOP_MEASUREMENT\n")
                self.measurement_data['status'] = 'stopped'
                self.measurement_data['message'] = 'Measurement stopped by user'
                return {'status': 'stopped'}
            except Exception as e:
                return {'error': f'Failed to stop measurement: {str(e)}'}
        return {'status': 'stopped'}
        
    def get_status(self):
        """Get overall sensor manager status"""
        return {
            'connected': self.connected,
            'current_measurement': self.current_measurement,
            'last_update': self.last_update,
            'measurement_data': self.measurement_data
        }

# Global sensor manager instance
sensor_manager = SensorManager()