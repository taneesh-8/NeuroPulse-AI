/*
 * NeuroPulse AI — ESP32 Firmware
 * ================================
 * Wearable health monitor with MAX30102 + MPU6050
 * Sends data to NeuroPulse AI cloud dashboard via HTTPS
 *
 * EXISTING SENSOR CODE: Unchanged from working hardware
 * ADDITIONS: WiFi, HTTPS POST, SPIFFS offline queue,
 *            activity classification, reconnect logic
 *
 * Required Libraries (Arduino IDE):
 *   - Adafruit MPU6050
 *   - Adafruit Unified Sensor
 *   - SparkFun MAX3010x Pulse and Proximity Sensor
 *   - ArduinoJson (v6+)
 *   - WiFi (built-in ESP32)
 *   - WiFiClientSecure (built-in ESP32)
 *   - HTTPClient (built-in ESP32)
 *   - SPIFFS (built-in ESP32)
 *
 * Board: ESP32 Dev Module
 * Upload Speed: 115200
 */

// ==================== INCLUDES ====================
// Original sensor libraries
#include <Wire.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include "MAX30105.h"
#include "heartRate.h"
#include "spo2_algorithm.h"

// NEW: WiFi + HTTP + Storage
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <SPIFFS.h>

// ==================== CONFIG (EDIT THESE) ====================
#define WIFI_SSID      "your_wifi_ssid"
#define WIFI_PASSWORD  "your_wifi_password"
#define SERVER_URL     "https://your-app.vercel.app/api/ingest"
#define PATIENT_ID     "PATIENT_001"
#define WIFI_CHECK_INTERVAL 30000   // Check WiFi every 30 seconds
#define MAX_QUEUE_LINES     500     // Max offline queue entries

// ==================== SENSOR OBJECTS ====================
MAX30105 particleSensor;
Adafruit_MPU6050 mpu;

// ==================== EXISTING VARIABLES (UNCHANGED) ====================
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
bool fallDetected = false;

// ==================== NEW VARIABLES ====================
unsigned long lastWiFiCheck = 0;
String activity = "resting";

// ==================== WiFi FUNCTIONS ====================
void connectWiFi() {
  Serial.print("WiFi: Connecting to ");
  Serial.println(WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.print("WiFi: Connected! IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println();
    Serial.println("WiFi: Connection failed - will retry later");
  }
}

void checkWiFiReconnect() {
  if (millis() - lastWiFiCheck > WIFI_CHECK_INTERVAL) {
    lastWiFiCheck = millis();
    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("WiFi: Reconnecting...");
      WiFi.disconnect();
      WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
      int attempts = 0;
      while (WiFi.status() != WL_CONNECTED && attempts < 10) {
        delay(500);
        attempts++;
      }
      if (WiFi.status() == WL_CONNECTED) {
        Serial.println("WiFi: Reconnected!");
        flushQueue();
      }
    }
  }
}

// ==================== SPIFFS QUEUE FUNCTIONS ====================
void initSPIFFS() {
  if (!SPIFFS.begin(true)) {
    Serial.println("SPIFFS: Mount failed!");
    return;
  }
  Serial.println("SPIFFS: Mounted");

  File f = SPIFFS.open("/queue.txt", FILE_READ);
  if (f) {
    int lines = 0;
    while (f.available()) {
      f.readStringUntil('\n');
      lines++;
    }
    f.close();
    Serial.print("SPIFFS: Queue has ");
    Serial.print(lines);
    Serial.println(" entries");
  }
}

void saveToQueue(String jsonStr) {
  // Check line count
  File f = SPIFFS.open("/queue.txt", FILE_READ);
  int lineCount = 0;
  if (f) {
    while (f.available()) {
      f.readStringUntil('\n');
      lineCount++;
    }
    f.close();
  }

  // If queue is full, trim oldest entries
  if (lineCount >= MAX_QUEUE_LINES) {
    File readFile = SPIFFS.open("/queue.txt", FILE_READ);
    String remaining = "";
    int skip = lineCount - MAX_QUEUE_LINES + 100; // Drop 100 oldest
    int current = 0;
    while (readFile.available()) {
      String line = readFile.readStringUntil('\n');
      current++;
      if (current > skip) {
        remaining += line + "\n";
      }
    }
    readFile.close();

    File writeFile = SPIFFS.open("/queue.txt", FILE_WRITE);
    writeFile.print(remaining);
    writeFile.close();
    Serial.println("SPIFFS: Trimmed oldest entries");
  }

  // Append new entry
  File appendFile = SPIFFS.open("/queue.txt", FILE_APPEND);
  if (appendFile) {
    appendFile.println(jsonStr);
    appendFile.close();
  }
}

void flushQueue() {
  if (!SPIFFS.exists("/queue.txt")) return;

  File f = SPIFFS.open("/queue.txt", FILE_READ);
  if (!f || f.size() == 0) {
    if (f) f.close();
    return;
  }

  Serial.println("SPIFFS: Flushing queue...");
  String remaining = "";
  int sent = 0;
  int failed = 0;

  while (f.available()) {
    String line = f.readStringUntil('\n');
    line.trim();
    if (line.length() == 0) continue;

    if (sendToServer(line)) {
      sent++;
    } else {
      remaining += line + "\n";
      failed++;
      break; // Stop on first failure
    }
  }
  f.close();

  // Save remaining (unsent) entries
  if (remaining.length() > 0 || f.available()) {
    // Read rest of unsent lines
    File f2 = SPIFFS.open("/queue.txt", FILE_READ);
    String allRemaining = remaining;
    int skipLines = sent + (failed > 0 ? failed : 0);
    int currentLine = 0;
    while (f2.available()) {
      String line = f2.readStringUntil('\n');
      currentLine++;
      if (currentLine > sent + 1) {
        line.trim();
        if (line.length() > 0) {
          allRemaining += line + "\n";
        }
      }
    }
    f2.close();

    File writeFile = SPIFFS.open("/queue.txt", FILE_WRITE);
    writeFile.print(allRemaining);
    writeFile.close();
  } else {
    SPIFFS.remove("/queue.txt");
  }

  Serial.print("SPIFFS: Flushed ");
  Serial.print(sent);
  Serial.println(" queued entries");
}

// ==================== HTTP POST FUNCTION ====================
bool sendToServer(String jsonStr) {
  if (WiFi.status() != WL_CONNECTED) return false;

  WiFiClientSecure client;
  client.setInsecure(); // Skip cert validation for Vercel HTTPS

  HTTPClient http;
  http.begin(client, SERVER_URL);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(5000);

  int httpCode = http.POST(jsonStr);
  http.end();

  if (httpCode == 200 || httpCode == 201) {
    return true;
  } else {
    Serial.print("HTTP: Failed with code ");
    Serial.println(httpCode);
    return false;
  }
}

// ==================== EXISTING SENSOR CODE (UNCHANGED) ====================
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

// ==================== SETUP ====================
void setup() {
  Serial.begin(115200);
  Wire.begin(21, 22);

  // Initialize MAX30102
  if (!particleSensor.begin(Wire, I2C_SPEED_FAST)) {
    Serial.println("MAX30102 error");
    while (1);
  }
  particleSensor.setup();
  particleSensor.setPulseAmplitudeRed(0x1F);
  particleSensor.setPulseAmplitudeGreen(0);

  // Initialize MPU6050
  if (!mpu.begin()) {
    Serial.println("MPU error");
    while (1);
  }
  mpu.setAccelerometerRange(MPU6050_RANGE_8_G);
  mpu.setGyroRange(MPU6050_RANGE_500_DEG);
  mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);

  // NEW: Initialize SPIFFS
  initSPIFFS();

  // NEW: Connect to WiFi
  connectWiFi();

  // Initial SpO2 reading
  runSpO2();

  Serial.println("SYSTEM READY");
}

// ==================== MAIN LOOP ====================
void loop() {
  // --- Existing heart rate detection (UNCHANGED) ---
  long irValue = particleSensor.getIR();

  if (irValue > 50000 && checkForBeat(irValue)) {
    long delta = millis() - lastBeat;
    lastBeat = millis();
    float newBpm = 60 / (delta / 1000.0);
    if (newBpm > 20 && newBpm < 200) {
      bpm = newBpm;
    }
  }

  // --- Existing SpO2 refresh every 3s (UNCHANGED) ---
  if (millis() - lastSpO2 > 3000) {
    lastSpO2 = millis();
    runSpO2();
  }

  // --- Existing accelerometer/gyro reading (UNCHANGED) ---
  sensors_event_t accel, gyro, temp;
  mpu.getEvent(&accel, &gyro, &temp);
  ax = accel.acceleration.x / 9.81;
  ay = accel.acceleration.y / 9.81;
  az = accel.acceleration.z / 9.81;
  gx = gyro.gyro.x;
  gy = gyro.gyro.y;
  gz = gyro.gyro.z;
  accelMagnitude = sqrt(ax*ax + ay*ay + az*az);

  // --- Existing fall detection (UNCHANGED) ---
  if (accelMagnitude > 3.0) fallDetected = true;

  // --- NEW: Activity classification ---
  if (accelMagnitude < 1.1)      activity = "resting";
  else if (accelMagnitude < 2.0) activity = "walking";
  else                           activity = "exercising";

  // --- NEW: WiFi reconnect check ---
  checkWiFiReconnect();

  // --- Send data every 500ms (MODIFIED to include WiFi POST) ---
  if (millis() - lastSend > 500) {
    lastSend = millis();

    // Build JSON using ArduinoJson
    StaticJsonDocument<512> doc;
    doc["patientId"] = PATIENT_ID;
    doc["bpm"] = (int)bpm;
    doc["spo2"] = validSPO2 ? spo2 : -1;
    doc["ax"] = round(ax * 100.0) / 100.0;
    doc["ay"] = round(ay * 100.0) / 100.0;
    doc["az"] = round(az * 100.0) / 100.0;
    doc["gx"] = round(gx * 100.0) / 100.0;
    doc["gy"] = round(gy * 100.0) / 100.0;
    doc["gz"] = round(gz * 100.0) / 100.0;
    doc["accel"] = round(accelMagnitude * 100.0) / 100.0;
    doc["fall"] = fallDetected;
    doc["activity"] = activity;
    doc["timestamp"] = millis();

    String jsonStr;
    serializeJson(doc, jsonStr);

    // Print to Serial (for debugging)
    Serial.println(jsonStr);

    // POST to server or queue
    if (WiFi.status() == WL_CONNECTED) {
      if (sendToServer(jsonStr)) {
        Serial.println("POST OK");
      } else {
        Serial.println("OFFLINE - queued");
        saveToQueue(jsonStr);
      }
    } else {
      Serial.println("OFFLINE - queued");
      saveToQueue(jsonStr);
    }

    fallDetected = false;
  }
}
