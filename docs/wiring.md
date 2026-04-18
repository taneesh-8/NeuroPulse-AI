# NeuroPulse AI — Wiring Diagram

## ESP32 Dev Board Pin Connections

### MAX30102 (Heart Rate + SpO2 Sensor)

| MAX30102 Pin | ESP32 Pin | Notes |
|:-------------|:----------|:------|
| VIN          | 3.3V      | Power supply (3.3V only!) |
| GND          | GND       | Ground |
| SDA          | GPIO 21   | I2C Data |
| SCL          | GPIO 22   | I2C Clock |
| INT          | —         | Not used (optional) |

### MPU6050 (Accelerometer + Gyroscope)

| MPU6050 Pin | ESP32 Pin | Notes |
|:------------|:----------|:------|
| VCC         | 3.3V      | Power supply |
| GND         | GND       | Ground |
| SDA         | GPIO 21   | I2C Data (shared bus with MAX30102) |
| SCL         | GPIO 22   | I2C Clock (shared bus with MAX30102) |
| INT         | —         | Not used |

### I2C Bus

Both MAX30102 and MPU6050 share the same I2C bus:
- **SDA** → GPIO 21
- **SCL** → GPIO 22
- They have different I2C addresses so no conflict occurs:
  - MAX30102: `0x57`
  - MPU6050: `0x68`

## Wiring Notes

```
ESP32 3.3V ─────┬──── MAX30102 VIN
                │
                └──── MPU6050 VCC

ESP32 GND  ─────┬──── MAX30102 GND
                │
                └──── MPU6050 GND

ESP32 GPIO21 ───┬──── MAX30102 SDA
(SDA)           │
                └──── MPU6050 SDA

ESP32 GPIO22 ───┬──── MAX30102 SCL
(SCL)           │
                └──── MPU6050 SCL
```

## Power Considerations

- Both sensors operate at 3.3V logic levels
- Do NOT connect to 5V — may damage the MAX30102
- Total current draw: ~50mA (both sensors active)
- For battery operation: 3.7V LiPo with voltage regulator recommended

## Sensor Placement

- **MAX30102**: Place flat against fingertip or earlobe
  - Ensure good skin contact for accurate readings
  - Red LED should face the skin
- **MPU6050**: Mount securely on the wrist or body
  - Orientation affects accel readings (±1g on each axis at rest)
  - Secure mount prevents false fall detections
