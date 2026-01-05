# ✅ MAINTENANCE PAGE - ALL SENSORS LIVE MONITORING

## 🎯 Summary
The Maintenance page now has a **"ALL SENSORS LIVE"** tab that shows all 4 Mega sensors streaming data simultaneously at 100ms intervals. The **frontend is the master**, commanding the backend to power sensors on/off like a slave.

---

## ✅ Master-Slave Architecture

### Frontend = MASTER (Commands)
- Decides which sensors to power on
- Controls polling intervals
- Starts/stops data collection
- Displays live data

### Backend = SLAVE (Responds)
- Responds to power commands instantly
- Streams data when commanded
- Provides status when polled
- No autonomous decisions

---

## 🔴 ALL SENSORS TAB Features

### Auto-Activation
When you click **"🔴 ALL SENSORS LIVE"**:
1. Frontend sends `POWER_UP_WEIGHT` → Backend responds
2. Frontend sends `POWER_UP_HEIGHT` → Backend responds
3. Frontend sends `POWER_UP_TEMPERATURE` → Backend responds
4. Frontend sends `POWER_UP_MAX30102` → Backend responds

### Continuous Polling
- **All 4 sensors polled simultaneously** every 100ms
- **Parallel requests** using `Promise.all()`
- **Real-time updates** for all sensor cards

### Sensors Displayed
1. **Weight** (kg) - Live reading from load cell
2. **Height** (cm) - Live reading from TF-Luna LiDAR
3. **Body Temp** (°C) - Live reading from MLX90614
4. **Heart Rate** (BPM) - Live when finger detected
5. **SpO2** (%) - Live when finger detected
6. **Computed BMI** (kg/m²) - Auto-calculated from weight/height

---

## 📊 Architecture Flow

```
FRONTEND (Master):
  ↓ Opens "All Sensors" tab
  ↓ Sends POWER_UP commands
  ↓ Starts 100ms polling
  
BACKEND (Slave):
  ↓ Receives commands
  ↓ Sets sensor flags = true
  ↓ Arduino starts streaming
  
ARDUINO:
  ↓ Reads sensors every 100ms
  ↓ Sends "DEBUG:Weight reading: XX"
  ↓ Sends "DEBUG:Height reading: XX"
  
BACKEND (Slave):
  ↓ Parses serial data
  ↓ Updates internal state
  
FRONTEND (Master):
  ↓ Polls /sensor/weight/status
  ↓ Polls /sensor/height/status  
  ↓ Polls /sensor/temperature/status
  ↓ Polls /sensor/max30102/status
  ↓ Updates UI cards
```

---

## 🎛️ Tab Behavior

| Tab | Sensors Powered | Polling | Display |
|-----|----------------|---------|---------|
| **🔴 ALL SENSORS LIVE** | All 4 | 100ms parallel | 6 cards (all vitals) |
| BMI Hardware | Weight + Height | 100ms | 3 cards (W/H/BMI) |
| IR Temperature | Temperature | 100ms | 1 card |
| Pulse Oximeter | MAX30102 | 100ms | 3 cards (HR/SpO2/RR) |

---

## 🔧 Implementation Details

### Frontend Code (Maintenance.jsx)

#### Default Tab:
```javascript
const [activeSensorTab, setActiveSensorTab] = useState('all'); 
// Opens with ALL sensors streaming immediately!
```

#### Power-Up Logic:
```javascript
if (activeSensorTab === 'all') {
    // Frontend commands backend like a master
    prepareBMISensors();        // → POWER_UP_WEIGHT & HEIGHT
    prepareTemperatureSensor(); // → POWER_UP_TEMPERATURE
    prepareMax30102Sensor();    // → POWER_UP_MAX30102
    
    // Poll ALL simultaneously
    pollIntervalRef.current = setInterval(async () => {
        await Promise.all([
            pollBMISensors(),
            pollTemperatureSensor(),
            pollMax30102Sensor()
        ]);
    }, 100); // UNIFORM 100ms
}
```

#### Display (6 Sensor Cards):
```javascript
<div className="sensor-cards-grid">
    {/* Weight */}
    {/* Height */}
    {/* Temperature */}
    {/* Heart Rate */}
    {/* SpO2 */}
    {/* Computed BMI */}
</div>
```

---

## ✅ Backend Response Pattern

### Command Flow:
```
Frontend → POST /sensor/weight/prepare
Backend → POWER_UP_WEIGHT → Arduino
Arduino → STATUS:WEIGHT_SENSOR_POWERED_UP
Backend → Returns {"status": "ready"}
```

### Data Flow:
```
Arduino → DEBUG:Weight reading: 65.3
Backend → Parses and stores live_data.current = 65.3

Frontend → GET /sensor/weight/status
Backend → Returns {"live_data": {"current": 65.3}}
Frontend → Updates UI card
```

---

## 📈 Performance

### Before:
- One sensor at a time
- Manual tab switching
- Slower debugging

### After:
- **All 4 sensors simultaneously**
- **Instant full system view**
- **10 updates per second** (100ms intervals)
- **Easy sensor verification** at a glance

---

## 🎯 Use Cases

### 1. System Health Check
Open Maintenance → See all sensors instantly → Verify all working

### 2. Calibration Testing
- See weight readings in real-time while calibrating
- See height readings while adjusting sensor position
- See temperature while testing sensor accuracy
- See MAX30102 while testing finger detection

### 3. Debugging
- Watch all sensors simultaneously
- Identify which sensor is failing
- See data flow in real-time
- Verify 100ms uniformity across all sensors

---

## 🚀 How to Use

1. **Navigate to Admin Dashboard**
2. **Click "Maintenance" tab**
3. **Click "Physical Sensors"** (already selected)
4. **Click "🔴 ALL SENSORS LIVE"** (default tab)
5. **Watch all 6 cards update in real-time!**

### What You'll See:
```
🔴 ALL SENSORS - CONTINUOUS LIVE MONITORING
Real-time data from all 4 Mega sensors updating every 100ms | Backend: Connected

[Weight]    [Height]      [Body Temp]
65.3 kg     170.5 cm      37.2°C
🟢 Live     🟢 Live       🟢 Live

[Heart Rate] [SpO2]       [BMI]
75 BPM      98%           22.5 kg/m²
👆 Finger   🟢 Live       ✅ Auto-Calc
```

---

## ✨ Key Benefits

1. **Frontend Control** - You command, backend obeys
2. **Instant Activation** - All sensors power up immediately
3. **Live Monitoring** - See everything updating 10x/second
4. **Easy Debugging** - Spot issues instantly
5. **Professional UX** - Smooth, responsive interface
6. **Production Ready** - Same speed as measurement pages

---

## 🎉 Result

**You now have a professional sensor monitoring dashboard!**

The Maintenance page gives you **instant, real-time visibility** into all 4 Mega sensors with the frontend acting as master, commanding the backend to stream data on demand.

**Perfect for:**
- ✅ System verification
- ✅ Sensor calibration
- ✅ Troubleshooting
- ✅ Live demonstrations
- ✅ Quality assurance

**The system is ready for deployment!** 🚀
