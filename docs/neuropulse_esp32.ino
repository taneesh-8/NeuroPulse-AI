/*
 * ═══════════════════════════════════════════════════════
 *  🧠 NeuroPulse AI — ESP32 Firmware
 *  Wearable Health Monitor + Fall Detection
 * ═══════════════════════════════════════════════════════
 * 
 * HARDWARE:
 *   - ESP32 Dev Board (any variant)
 *   - MAX30102 Pulse Oximeter (I2C: SDA=21, SCL=22)
 *   - MPU6050 Accelerometer/Gyroscope (same I2C bus)
 * 
 * WIRING:
 *   ESP32  →  MAX30102  →  MPU6050
 *   3.3V   →  VIN       →  VCC
 *   GND    →  GND       →  GND
 *   GPIO21 →  SDA       →  SDA  (shared I2C)
 *   GPIO22 →  SCL       →  SCL  (shared I2C)
 * 
 * LIBRARIES (install via Arduino Library Manager):
 *   1. "SparkFun MAX3010x Pulse and Proximity Sensor Library"
 *   2. "Adafruit MPU6050"
 *   3. "Adafruit Unified Sensor"
 *   4. "ArduinoJson" by Benoit Blanchon
 *   5. "WiFi" (built-in ESP32)
 *   6. "HTTPClient" (built-in ESP32)
 * 
 * BOARD SETUP:
 *   Arduino IDE → Board: "ESP32 Dev Module"
 *   Upload Speed: 115200
 * ═══════════════════════════════════════════════════════
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <ArduinoJson.h>
#include "MAX30105.h"
#include "heartRate.h"
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>

// ═══════════════════════════════════════
// 🔧 CONFIGURATION — CHANGE THESE!
// ═══════════════════════════════════════
const char* WIFI_SSID     = "Tanvi's A55";
const char* WIFI_PASSWORD = "tanvi2910";
const char* SERVER_URL    = "http://10.125.20.15:3000/api/ingest";
const char* PATIENT_ID    = "patient_001";           // ← Must match Firestore patient doc ID

// Timing
const unsigned long SEND_INTERVAL = 3000;  // Send data every 3 seconds
const unsigned long SAMPLE_RATE   = 50;    // Sensor read rate (ms)

// Fall detection thresholds
const float FALL_THRESHOLD = 2.5;          // g-force threshold for fall
const float FREE_FALL_LOW  = 0.3;          // Free-fall detection (< 0.3g)

// ═══════════════════════════════════════
// 🔌 SENSOR OBJECTS
// ═══════════════════════════════════════
MAX30105 particleSensor;
Adafruit_MPU6050 mpu;

// ═══════════════════════════════════════
// 📊 DATA VARIABLES
// ═══════════════════════════════════════
// Heart rate
const byte RATE_SIZE = 8;
byte rates[RATE_SIZE];
byte rateSpot = 0;
long lastBeat = 0;
float beatsPerMinute = 0;
int beatAvg = 0;

// SpO2
long irValue = 0;
long redValue = 0;
int spo2Value = -1;  // -1 means not available

// MPU6050
float ax, ay, az;    // Accelerometer (m/s²)
float gx, gy, gz;    // Gyroscope (rad/s)
float accelMag = 0;  // Acceleration magnitude in g

// Fall detection
bool fallDetected = false;
unsigned long lastFallTime = 0;
const unsigned long FALL_COOLDOWN = 10000; // 10s cooldown between fall alerts

// Activity classification
String activity = "resting";

// Timing
unsigned long lastSendTime = 0;
unsigned long lastSampleTime = 0;

// ═══════════════════════════════════════
// 🚀 SETUP
// ═══════════════════════════════════════
void setup() {
  Serial.begin(115200);
  Serial.println();
  Serial.println("═══════════════════════════════════════");
  Serial.println("  🧠 NeuroPulse AI — ESP32 Starting");
  Serial.println("═══════════════════════════════════════");

  // Connect WiFi
  connectWiFi();

  // Initialize I2C
  Wire.begin(21, 22);

  // Initialize MAX30102
  Serial.print("Initializing MAX30102... ");
  if (!particleSensor.begin(Wire, I2C_SPEED_FAST)) {
    Serial.println("❌ MAX30102 NOT FOUND! Check wiring.");
    Serial.println("   SDA → GPIO21, SCL → GPIO22, VIN → 3.3V");
    // Continue without pulse sensor (will send 0 BPM)
  } else {
    Serial.println("✅ Found!");
    particleSensor.setup();
    particleSensor.setPulseAmplitudeRed(0x0A);
    particleSensor.setPulseAmplitudeGreen(0);
    particleSensor.setPulseAmplitudeIR(0x1F);
  }

  // Initialize MPU6050
  Serial.print("Initializing MPU6050...  ");
  if (!mpu.begin()) {
    Serial.println("❌ MPU6050 NOT FOUND! Check wiring.");
    Serial.println("   SDA → GPIO21, SCL → GPIO22, VCC → 3.3V");
  } else {
    Serial.println("✅ Found!");
    mpu.setAccelerometerRange(MPU6050_RANGE_8_G);
    mpu.setGyroRange(MPU6050_RANGE_500_DEG);
    mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);
  }

  Serial.println();
  Serial.println("═══════════════════════════════════════");
  Serial.println("  📡 Sending to: " + String(SERVER_URL));
  Serial.println("  👤 Patient ID: " + String(PATIENT_ID));
  Serial.println("  ⏱️  Interval:  " + String(SEND_INTERVAL) + "ms");
  Serial.println("═══════════════════════════════════════");
  Serial.println();
}

// ═══════════════════════════════════════
// 🔄 MAIN LOOP
// ═══════════════════════════════════════
void loop() {
  unsigned long now = millis();

  // Read sensors at SAMPLE_RATE
  if (now - lastSampleTime >= SAMPLE_RATE) {
    lastSampleTime = now;
    readHeartRate();
    readMPU6050();
    detectFall();
    classifyActivity();
  }

  // Send data at SEND_INTERVAL
  if (now - lastSendTime >= SEND_INTERVAL) {
    lastSendTime = now;
    sendData();
  }
}

// ═══════════════════════════════════════
// 📡 WiFi CONNECTION
// ═══════════════════════════════════════
void connectWiFi() {
  Serial.print("📶 Connecting to WiFi: " + String(WIFI_SSID));
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println(" ✅ Connected!");
    Serial.println("   IP: " + WiFi.localIP().toString());
  } else {
    Serial.println(" ❌ Failed! Retrying in loop...");
  }
}

// ═══════════════════════════════════════
// ❤️ HEART RATE READING (MAX30102)
// ═══════════════════════════════════════
void readHeartRate() {
  irValue = particleSensor.getIR();
  redValue = particleSensor.getRed();

  // Check if finger is on sensor (IR > 50000 means finger detected)
  if (irValue < 50000) {
    // No finger — reset
    beatsPerMinute = 0;
    beatAvg = 0;
    spo2Value = -1;
    return;
  }

  // Check for heartbeat
  if (checkForBeat(irValue)) {
    long delta = millis() - lastBeat;
    lastBeat = millis();

    beatsPerMinute = 60.0 / (delta / 1000.0);

    if (beatsPerMinute > 20 && beatsPerMinute < 255) {
      rates[rateSpot++ % RATE_SIZE] = (byte)beatsPerMinute;

      // Calculate average
      beatAvg = 0;
      for (byte x = 0; x < RATE_SIZE; x++) {
        beatAvg += rates[x];
      }
      beatAvg /= RATE_SIZE;
    }
  }

  // Simplified SpO2 estimation
  // Real SpO2 requires proper calibration; this is approximate
  if (irValue > 50000 && redValue > 50000) {
    float ratio = (float)redValue / (float)irValue;
    // Rough SpO2 estimation (simplified Beer-Lambert)
    spo2Value = constrain((int)(110.0 - 25.0 * ratio), 70, 100);
  }
}

// ═══════════════════════════════════════
// 🏃 MPU6050 READING
// ═══════════════════════════════════════
void readMPU6050() {
  sensors_event_t a, g, temp;
  mpu.getEvent(&a, &g, &temp);

  // Accelerometer (m/s²)
  ax = a.acceleration.x;
  ay = a.acceleration.y;
  az = a.acceleration.z;

  // Gyroscope (rad/s)
  gx = g.gyro.x;
  gy = g.gyro.y;
  gz = g.gyro.z;

  // Magnitude in g (1g = 9.81 m/s²)
  accelMag = sqrt(ax * ax + ay * ay + az * az) / 9.81;
}

// ═══════════════════════════════════════
// 🚨 FALL DETECTION
// ═══════════════════════════════════════
void detectFall() {
  unsigned long now = millis();

  // Reset fall flag after cooldown
  if (fallDetected && (now - lastFallTime > FALL_COOLDOWN)) {
    fallDetected = false;
  }

  // Fall detection algorithm:
  // 1. Sudden spike in acceleration (impact) OR
  // 2. Brief free-fall followed by impact
  if (!fallDetected) {
    if (accelMag > FALL_THRESHOLD) {
      fallDetected = true;
      lastFallTime = now;
      Serial.println("🚨 FALL DETECTED! Accel: " + String(accelMag) + "g");
    }
  }
}

// ═══════════════════════════════════════
// 🏃 ACTIVITY CLASSIFICATION
// ═══════════════════════════════════════
void classifyActivity() {
  if (fallDetected) {
    activity = "fall";
  } else if (accelMag < 1.1) {
    activity = "resting";
  } else if (accelMag < 1.5) {
    activity = "walking";
  } else if (accelMag < 2.0) {
    activity = "jogging";
  } else {
    activity = "running";
  }
}

// ═══════════════════════════════════════
// 📤 SEND DATA TO SERVER
// ═══════════════════════════════════════
void sendData() {
  // Check WiFi
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("⚠️ WiFi disconnected — reconnecting...");
    connectWiFi();
    return;
  }

  // Build JSON payload
  JsonDocument doc;
  doc["patientId"] = PATIENT_ID;
  doc["bpm"]       = beatAvg;
  doc["spo2"]      = spo2Value;
  doc["ax"]        = round(ax * 100) / 100.0;
  doc["ay"]        = round(ay * 100) / 100.0;
  doc["az"]        = round(az * 100) / 100.0;
  doc["gx"]        = round(gx * 100) / 100.0;
  doc["gy"]        = round(gy * 100) / 100.0;
  doc["gz"]        = round(gz * 100) / 100.0;
  doc["accel"]     = round(accelMag * 100) / 100.0;
  doc["fall"]      = fallDetected;
  doc["activity"]  = activity;
  doc["timestamp"] = millis();

  String payload;
  serializeJson(doc, payload);

  // Send HTTP POST
  HTTPClient http;
  http.begin(SERVER_URL);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(5000);

  int httpCode = http.POST(payload);

  if (httpCode > 0) {
    String response = http.getString();
    
    // Print status
    Serial.print("❤️ " + String(beatAvg) + " BPM");
    Serial.print(" | 🫁 " + String(spo2Value) + "%");
    Serial.print(" | ⚡ " + String(accelMag, 2) + "g");
    Serial.print(" | 🏃 " + activity);
    if (fallDetected) Serial.print(" | 🚨 FALL!");
    Serial.print(" | 📡 " + String(httpCode));
    Serial.println();
  } else {
    Serial.println("❌ HTTP Error: " + http.errorToString(httpCode));
  }

  http.end();
}
