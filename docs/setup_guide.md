# NeuroPulse AI — Complete Setup Guide

## Prerequisites

- ESP32 Dev Board (any variant with GPIO 21/22)
- MAX30102 Heart Rate / SpO2 Sensor
- MPU6050 Accelerometer / Gyroscope
- Jumper wires
- USB-C/Micro-USB cable for flashing
- Arduino IDE 2.x installed
- A Firebase project
- A Vercel account
- A Twilio account (for WhatsApp alerts)

---

## Step 1: Arduino IDE Setup

### 1.1 Install ESP32 Board Support

1. Open Arduino IDE → **File → Preferences**
2. In "Additional Board Manager URLs", add:
   ```
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
3. Go to **Tools → Board → Board Manager**
4. Search "esp32" → Install **esp32 by Espressif Systems**

### 1.2 Install Required Libraries

Go to **Sketch → Include Library → Manage Libraries** and install:

| Library | Author |
|:--------|:-------|
| Adafruit MPU6050 | Adafruit |
| Adafruit Unified Sensor | Adafruit |
| SparkFun MAX3010x Pulse and Proximity Sensor | SparkFun |
| ArduinoJson | Benoit Blanchon (v6+) |

### 1.3 Board Configuration

- **Board**: ESP32 Dev Module
- **Upload Speed**: 115200
- **Flash Frequency**: 80MHz
- **Partition Scheme**: Default 4MB with spiffs
- **Port**: Select your ESP32's COM port

---

## Step 2: Hardware Wiring

Connect sensors according to `wiring.md`. Summary:

```
MAX30102 + MPU6050 → ESP32
  VIN/VCC → 3.3V
  GND     → GND
  SDA     → GPIO 21
  SCL     → GPIO 22
```

Both sensors share the same I2C bus (different addresses).

---

## Step 3: Firebase Setup

### 3.1 Create Firebase Project

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Click **Add Project** → name it "neuropulse-ai"
3. Enable **Google Analytics** (optional)

### 3.2 Enable Authentication

1. Go to **Authentication → Sign-in method**
2. Enable **Email/Password** provider

### 3.3 Create Firestore Database

1. Go to **Firestore Database → Create Database**
2. Choose **Production mode**
3. Select your preferred region

### 3.4 Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read their own profile
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if false; // Admin only
    }

    // Patient data - accessible by assigned doctors/caregivers
    match /patients/{patientId} {
      allow read: if request.auth != null;
      allow write: if false; // API routes only

      match /readings/{readingId} {
        allow read: if request.auth != null;
        allow create: if true; // ESP32 ingest (via API)
      }

      match /alerts/{alertId} {
        allow read: if request.auth != null;
        allow create: if true;
        allow update: if request.auth != null; // For "resolve"
      }
    }
  }
}
```

### 3.5 Create Test Users

In **Authentication**, create these test accounts:

| Email | Role |
|:------|:-----|
| patient@neuropulse.ai | patient |
| doctor@neuropulse.ai | doctor |
| caregiver@neuropulse.ai | caregiver |

Then in **Firestore**, create corresponding documents:

**Collection: `users`**

Document ID = Firebase Auth UID of each user:

```json
// Patient user
{
  "name": "John Doe",
  "role": "patient",
  "phone": "+1234567890",
  "linkedPatients": ["PATIENT_001"]
}

// Doctor user
{
  "name": "Dr. Smith",
  "role": "doctor",
  "phone": "+1234567890",
  "linkedPatients": ["PATIENT_001"]
}

// Caregiver user
{
  "name": "Jane Doe",
  "role": "caregiver",
  "phone": "+1234567890",
  "linkedPatients": ["PATIENT_001"]
}
```

**Collection: `patients`**

Document ID = `PATIENT_001`:

```json
{
  "name": "John Doe",
  "age": 65,
  "assignedDoctors": ["<doctor-uid>"],
  "assignedCaregivers": ["<caregiver-uid>"]
}
```

### 3.6 Get Firebase Config

1. Go to **Project Settings → General**
2. Under "Your apps", click **Web** icon (`</>`)
3. Register app → Copy the config object values

### 3.7 Generate Service Account Key

1. Go to **Project Settings → Service Accounts**
2. Click **Generate new private key**
3. Download the JSON file — you'll paste it as one line in env vars

---

## Step 4: Deploy to Vercel

### 4.1 Push to GitHub

```bash
git add .
git commit -m "NeuroPulse AI initial"
git remote add origin <your-repo-url>
git push -u origin main
```

### 4.2 Import to Vercel

1. Go to [vercel.com](https://vercel.com) → **New Project**
2. Import your GitHub repo
3. Framework: **Next.js** (auto-detected)

### 4.3 Set Environment Variables

In Vercel dashboard → **Settings → Environment Variables**, add:

| Variable | Value |
|:---------|:------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Your Firebase API key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | your-project.firebaseapp.com |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | your-project-id |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Your Firebase app ID |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Entire service account JSON (one line) |
| `TWILIO_ACCOUNT_SID` | Your Twilio SID |
| `TWILIO_AUTH_TOKEN` | Your Twilio auth token |
| `TWILIO_WHATSAPP_FROM` | whatsapp:+14155238886 |

### 4.4 Deploy

Click **Deploy** — Vercel will build and deploy automatically.

Note your deployment URL: `https://your-app.vercel.app`

---

## Step 5: Flash ESP32

### 5.1 Update Config in Firmware

Open `docs/neuropulse_esp32_final.ino` and update:

```cpp
#define WIFI_SSID      "YourActualWiFiName"
#define WIFI_PASSWORD  "YourActualWiFiPassword"
#define SERVER_URL     "https://your-app.vercel.app/api/ingest"
#define PATIENT_ID     "PATIENT_001"
```

### 5.2 Upload

1. Connect ESP32 via USB
2. Select correct Board and Port in Arduino IDE
3. Click **Upload** (→ icon)
4. Wait for "Connecting..." then "Writing..."

### 5.3 Verify in Serial Monitor

Open **Tools → Serial Monitor** at 115200 baud. You should see:

```
WiFi: Connecting to YourActualWiFiName
......
WiFi: Connected! IP: 192.168.1.x
SPIFFS: Mounted
SPIFFS: Queue has 0 entries
SYSTEM READY
{"patientId":"PATIENT_001","bpm":72,"spo2":98,...}
POST OK
{"patientId":"PATIENT_001","bpm":73,"spo2":97,...}
POST OK
```

---

## Step 6: Verify Data Flow

1. **Serial Monitor**: Confirm `POST OK` messages
2. **Firestore Console**: Check `patients/PATIENT_001/readings` — new documents appearing every 500ms
3. **Dashboard**: Login at your Vercel URL → see live data updating

---

## Step 7: Twilio WhatsApp Setup

### 7.1 Twilio Sandbox

1. Go to [twilio.com/console](https://twilio.com/console)
2. Navigate to **Messaging → Try it out → Send a WhatsApp message**
3. Follow the sandbox instructions to connect your phone
4. Send the join code from your phone to the Twilio WhatsApp number

### 7.2 Test Alert

Manually trigger a fall event or send data with `bpm > 120` to test WhatsApp alerts.

---

## Troubleshooting

| Issue | Fix |
|:------|:----|
| `MAX30102 error` | Check wiring on GPIO21/22, ensure 3.3V power |
| `MPU error` | Verify I2C connections, check for solder bridges |
| `POST failed with code -1` | Check WiFi credentials and SERVER_URL |
| `OFFLINE - queued` | WiFi disconnected — data is saved to SPIFFS |
| No data in Firestore | Verify FIREBASE_SERVICE_ACCOUNT_JSON is correct |
| WhatsApp not received | Check Twilio sandbox is joined on your phone |
| Dashboard shows "No reading" for SpO2 | Place finger firmly on MAX30102 sensor |
