/*
 * 🧠 NeuroPulse AI — ESP32 Firmware
 * Based on your working sensor code + WiFi/HTTP added
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include "MAX30105.h"
#include "heartRate.h"
#include "spo2_algorithm.h"
#include <ArduinoJson.h>

// ═══ CONFIGURATION ═══
const char* WIFI_SSID     = "Tanvi's A55";
const char* WIFI_PASSWORD = "tanvi2910";
const char* SERVER_URL    = "http://10.125.20.15:3000/api/ingest";
const char* PATIENT_ID    = "PATIENT_001";

MAX30105 particleSensor;
Adafruit_MPU6050 mpu;

long lastBeat = 0;
float bpm = 0;

uint32_t irBuffer[25];
uint32_t redBuffer[25];
int32_t spo2 = 0;
int8_t validSPO2 = 0;
int32_t dummyHR;
int8_t dummyValid;

float ax, ay, az, gx, gy, gz, accelMagnitude;
unsigned long lastSpO2 = 0;
unsigned long lastSend = 0;
unsigned long lastHTTP = 0;
bool fallDetected = false;

String classifyActivity() {
  if (fallDetected) return "fall";
  if (accelMagnitude < 1.1) return "resting";
  if (accelMagnitude < 1.5) return "walking";
  if (accelMagnitude < 2.0) return "jogging";
  return "running";
}

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
    Serial.println(" ✅ Connected! IP: " + WiFi.localIP().toString());
  } else {
    Serial.println(" ❌ Failed!");
  }
}

void setup() {
  Serial.begin(115200);
  Wire.begin(21, 22);

  // WiFi
  connectWiFi();

  // MAX30102
  if (!particleSensor.begin(Wire, I2C_SPEED_FAST)) {
    Serial.println("MAX30102 error");
    while (1);
  }
  particleSensor.setup();
  particleSensor.setPulseAmplitudeRed(0x1F);
  particleSensor.setPulseAmplitudeGreen(0);

  // MPU6050
  if (!mpu.begin()) {
    Serial.println("MPU error");
    while (1);
  }
  mpu.setAccelerometerRange(MPU6050_RANGE_8_G);
  mpu.setGyroRange(MPU6050_RANGE_500_DEG);
  mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);

  // SpO2 once at startup
  runSpO2();

  Serial.println("═══════════════════════════════════════");
  Serial.println("  🧠 NeuroPulse AI — SYSTEM READY");
  Serial.println("  📡 Server: " + String(SERVER_URL));
  Serial.println("═══════════════════════════════════════");
}

void runSpO2() {
  for (int i = 0; i < 25; i++) {
    while (!particleSensor.available())
      particleSensor.check();
    redBuffer[i] = particleSensor.getRed();
    irBuffer[i]  = particleSensor.getIR();
    particleSensor.nextSample();
  }
  maxim_heart_rate_and_oxygen_saturation(
    irBuffer, 25, redBuffer,
    &spo2, &validSPO2,
    &dummyHR, &dummyValid
  );
}

void sendToServer() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("⚠️ WiFi lost — reconnecting...");
    connectWiFi();
    return;
  }

  JsonDocument doc;
  doc["patientId"] = PATIENT_ID;
  doc["bpm"]       = (int)bpm;
  doc["spo2"]      = validSPO2 ? (int)spo2 : -1;
  doc["ax"]        = round(ax * 100) / 100.0;
  doc["ay"]        = round(ay * 100) / 100.0;
  doc["az"]        = round(az * 100) / 100.0;
  doc["gx"]        = round(gx * 100) / 100.0;
  doc["gy"]        = round(gy * 100) / 100.0;
  doc["gz"]        = round(gz * 100) / 100.0;
  doc["accel"]     = round(accelMagnitude * 100) / 100.0;
  doc["fall"]      = fallDetected;
  doc["activity"]  = classifyActivity();
  doc["timestamp"] = millis();

  String payload;
  serializeJson(doc, payload);

  HTTPClient http;
  http.begin(SERVER_URL);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(5000);

  int httpCode = http.POST(payload);

  // Print status line
  Serial.print("❤️ " + String((int)bpm) + " BPM");
  Serial.print(" | 🫁 " + String(validSPO2 ? (int)spo2 : -1) + "%");
  Serial.print(" | ⚡ " + String(accelMagnitude, 2) + "g");
  Serial.print(" | 🏃 " + classifyActivity());
  if (fallDetected) Serial.print(" | 🚨 FALL!");
  Serial.print(" | 📡 " + String(httpCode));
  Serial.println();

  http.end();
}

void loop() {
  long irValue = particleSensor.getIR();

  // ❤️ Heart rate
  if (irValue > 50000 && checkForBeat(irValue)) {
    long delta = millis() - lastBeat;
    lastBeat = millis();
    float newBpm = 60 / (delta / 1000.0);
    if (newBpm > 20 && newBpm < 200) {
      bpm = newBpm;
    }
  }

  // 🫁 SpO2 every 3 seconds
  if (millis() - lastSpO2 > 3000) {
    lastSpO2 = millis();
    runSpO2();
  }

  // 🏃 MPU
  sensors_event_t accel, gyro, temp;
  mpu.getEvent(&accel, &gyro, &temp);
  ax = accel.acceleration.x / 9.81;
  ay = accel.acceleration.y / 9.81;
  az = accel.acceleration.z / 9.81;
  gx = gyro.gyro.x;
  gy = gyro.gyro.y;
  gz = gyro.gyro.z;
  accelMagnitude = sqrt(ax*ax + ay*ay + az*az);

  // 🚨 Fall detection
  if (accelMagnitude > 3.0) fallDetected = true;

  // 📡 Serial output every 500ms
  if (millis() - lastSend > 500) {
    lastSend = millis();
    Serial.print("{");
    Serial.print("\"bpm\":"); Serial.print((int)bpm);
    Serial.print(",\"spo2\":"); Serial.print(validSPO2 ? spo2 : -1);
    Serial.print(",\"ax\":"); Serial.print(ax, 2);
    Serial.print(",\"ay\":"); Serial.print(ay, 2);
    Serial.print(",\"az\":"); Serial.print(az, 2);
    Serial.print(",\"gx\":"); Serial.print(gx, 2);
    Serial.print(",\"gy\":"); Serial.print(gy, 2);
    Serial.print(",\"gz\":"); Serial.print(gz, 2);
    Serial.print(",\"accel\":"); Serial.print(accelMagnitude, 2);
    Serial.print(",\"fall\":"); Serial.print(fallDetected ? "true" : "false");
    Serial.println("}");
  }

  // 📡 Send to server every 3 seconds
  if (millis() - lastHTTP > 3000) {
    lastHTTP = millis();
    sendToServer();
    fallDetected = false;  // Reset after sending
  }
}
