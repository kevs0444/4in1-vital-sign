import serial
import time
import threading
import sys
from serial.tools import list_ports

def find_arduino():
    print("🔍 Scanning COM ports...")
    ports = list_ports.comports()
    for port in ports:
        print(f"   📌 {port.device}: {port.description}")
        if "mega" in port.description.lower() or "arduino" in port.description.lower() or "ch340" in port.description.lower():
            print(f"✅ Found candidate on {port.device}")
            return port.device
    return None

def read_thread(ser):
    print("🎧 Listening to Serial...")
    while ser.is_open:
        try:
            if ser.in_waiting:
                line = ser.readline().decode('utf-8', errors='ignore').strip()
                if line:
                    print(f"📥 RX: {line}")
        except Exception as e:
            print(f"❌ Serial Read Error: {e}")
            break

def main():
    port = find_arduino()
    if not port:
        print("❌ No Arduino Found!")
        sys.exit(1)

    try:
        ser = serial.Serial(port, 115200, timeout=1)
        print(f"✅ Connected to {port}")
    except Exception as e:
        print(f"❌ Failed to connect: {e}")
        sys.exit(1)

    # Start reader
    t = threading.Thread(target=read_thread, args=(ser,), daemon=True)
    t.start()
    
    time.sleep(2) # Wait for DTR reset
    
    print("\n⚡ POWER UP TEMPERATURE SENSOR")
    ser.write(b"POWER_UP_TEMPERATURE\n")
    time.sleep(1)

    print("\n🚀 START TEMPERATURE MEASUREMENT")
    ser.write(b"START_TEMPERATURE\n")
    
    print("\n🕒 Monitoring for 10 seconds...")
    time.sleep(10)
    
    print("\n🛑 STOPPING...")
    ser.write(b"POWER_DOWN_TEMPERATURE\n")
    time.sleep(1)
    
    ser.close()
    print("✅ Done.")

if __name__ == "__main__":
    main()
