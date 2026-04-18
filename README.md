# 🧠 NeuroPulse AI

**Real-time IoT Health Monitoring Dashboard** — A multi-role web application for wearable ESP32 health devices.

Track heart rate, blood oxygen (SpO2), activity, and fall detection in real-time with role-based dashboards for patients, doctors, and caregivers.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![Firebase](https://img.shields.io/badge/Firebase-Firestore-orange?logo=firebase)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Vercel](https://img.shields.io/badge/Deploy-Vercel-black?logo=vercel)

---

## Features

### 🏥 Patient Dashboard
- Live BPM with color-coded severity (green/yellow/red)
- SpO2 circular gauge with "No reading" handling
- Activity detection (Resting / Walking / Exercising)
- Fall detection status with acceleration monitor
- Gyroscope + Accelerometer X/Y/Z live readout
- 24-hour BPM and SpO2 trend charts

### 👨‍⚕️ Doctor Dashboard
- Patient selector for multi-patient monitoring
- 3D rotating heart model (Three.js) — color changes with BPM severity
- 7-day BPM and SpO2 charts
- Weekly stats: Average BPM, Average SpO2, Fall count
- Alert history table
- CSV data export

### 👩‍⚕️ Caregiver Dashboard
- Live patient status card (all vitals at a glance)
- Active alerts with "Mark Resolved" button
- Manual "Send WhatsApp" trigger
- Mobile-responsive design for phone use
- Real-time Firestore listeners

### 📱 WhatsApp Alerts (Twilio)
- Automatic alerts for: Fall detected, Low SpO2 (<94%), Abnormal BPM
- Rich-formatted WhatsApp messages with emoji
- Sent to all assigned caregivers

### 🔌 ESP32 Firmware
- MAX30102 heart rate + SpO2 sensor
- MPU6050 accelerometer + gyroscope
- WiFi HTTPS POST to Vercel every 500ms
- SPIFFS offline queue (up to 500 entries)
- Automatic WiFi reconnection every 30 seconds
- Activity classification from acceleration data

---

## Tech Stack

| Layer | Technology |
|:------|:-----------|
| Framework | Next.js 16 (App Router, TypeScript) |
| Styling | Tailwind CSS v4 |
| Auth + Database | Firebase (Auth + Firestore) |
| Real-time | Firestore onSnapshot listeners |
| Charts | Recharts |
| 3D Visualization | Three.js + React Three Fiber |
| Alerts | Twilio WhatsApp API |
| Deployment | Vercel |
| Hardware | ESP32 + MAX30102 + MPU6050 |

---

## Quick Start

### 1. Clone & Install

```bash
git clone <your-repo-url>
cd neuropulse-ai
npm install
```

### 2. Set Up Firebase

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable **Email/Password** authentication
3. Create a **Firestore** database
4. Apply the security rules from `docs/setup_guide.md`
5. Create test users and patient documents (see setup guide)
6. Get your Firebase config and service account key

### 3. Configure Environment

Copy the example env file and fill in your values:

```bash
cp .env.local.example .env.local
```

Required variables:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
```

### 4. Run Local Dev Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 5. Deploy to Vercel

```bash
# Push to GitHub first
git add . && git commit -m "Initial deploy"
git push origin main

# Import in Vercel dashboard
# Set all env variables in Vercel → Settings → Environment Variables
# Deploy!
```

### 6. Flash ESP32

1. Open `docs/neuropulse_esp32_final.ino` in Arduino IDE
2. Update WiFi credentials and server URL:
   ```cpp
   #define WIFI_SSID      "YourWiFi"
   #define WIFI_PASSWORD  "YourPassword"
   #define SERVER_URL     "https://your-app.vercel.app/api/ingest"
   #define PATIENT_ID     "PATIENT_001"
   ```
3. Install required libraries (see `docs/setup_guide.md`)
4. Select **ESP32 Dev Module** board
5. Upload and verify in Serial Monitor (115200 baud)

### 7. Verify Data Flow

```
Serial Monitor → "POST OK"
Firestore Console → patients/PATIENT_001/readings (new docs)
Dashboard → Live updating charts and values
```

---

## Firestore Data Model

```
/patients/{patientId}
  ├── name, age, assignedDoctors[], assignedCaregivers[]
  ├── /readings/{readingId}
  │   └── bpm, spo2, ax, ay, az, gx, gy, gz, accel, fall, activity, timestamp
  └── /alerts/{alertId}
      └── type, bpm, spo2, accel, activity, timestamp, status

/users/{userId}
  └── name, role, phone, linkedPatients[]
```

---

## API Routes

| Route | Method | Description |
|:------|:-------|:------------|
| `/api/ingest` | POST | Receives ESP32 sensor data, stores in Firestore, triggers alerts |
| `/api/alert` | POST | Sends WhatsApp notification via Twilio |
| `/api/readings` | GET | Returns readings for CSV export (`?patientId=X&days=7`) |

---

## ESP32 JSON Payload

```json
{
  "patientId": "PATIENT_001",
  "bpm": 72,
  "spo2": 98,
  "ax": 0.01,
  "ay": 0.02,
  "az": 1.00,
  "gx": 0.01,
  "gy": 0.00,
  "gz": 0.00,
  "accel": 1.02,
  "fall": false,
  "activity": "resting",
  "timestamp": 1713400000
}
```

---

## Twilio WhatsApp Setup

1. Go to [twilio.com/console](https://twilio.com/console)
2. Navigate to **Messaging → Try it out → Send a WhatsApp message**
3. Follow sandbox instructions to connect your phone
4. Set env variables: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM`

---

## Project Structure

```
├── app/
│   ├── layout.tsx          # Root layout with toaster
│   ├── page.tsx            # Redirect to /login
│   ├── login/page.tsx      # Firebase auth login
│   ├── patient/page.tsx    # Patient dashboard
│   ├── doctor/page.tsx     # Doctor dashboard
│   ├── caregiver/page.tsx  # Caregiver dashboard
│   └── api/
│       ├── ingest/route.ts # ESP32 data ingestion
│       ├── alert/route.ts  # WhatsApp alerts
│       └── readings/route.ts # Data export
├── components/
│   ├── BPMCard.tsx         # Heart rate display
│   ├── SpO2Gauge.tsx       # Blood oxygen gauge
│   ├── ActivityBadge.tsx   # Activity status
│   ├── FallStatus.tsx      # Fall detection
│   ├── HeartModel3D.tsx    # 3D heart (Three.js)
│   ├── AlertsList.tsx      # Alert history
│   ├── ReadingsChart.tsx   # Recharts charts
│   ├── GyroReadout.tsx     # Motion sensor data
│   ├── Navbar.tsx          # Navigation bar
│   ├── PatientSelector.tsx # Patient dropdown
│   └── LoginBackground.tsx # Animated background
├── lib/
│   ├── firebase.ts         # Client Firebase SDK
│   ├── firebaseAdmin.ts    # Admin Firebase SDK
│   ├── twilio.ts           # Twilio helper
│   └── utils.ts            # Utility functions
├── docs/
│   ├── neuropulse_esp32_final.ino # ESP32 firmware
│   ├── wiring.md           # Hardware wiring
│   └── setup_guide.md      # Full setup guide
├── vercel.json             # Vercel config
├── .env.local.example      # Env template
└── README.md               # This file
```

---

## License

MIT
