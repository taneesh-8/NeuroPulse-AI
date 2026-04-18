import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { patientId, type, bpm, spo2, accel, activity, timestamp } = body;

    if (!patientId || !type) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    const patientName = body.patientName || patientId;

    // Build alert message
    const issueMap: Record<string, string> = {
      fall: "🚨 FALL DETECTED",
      lowSpo2: "🫁 LOW SpO2 ALERT",
      abnormalBpm: "❤️ ABNORMAL HEART RATE",
    };
    const issue = issueMap[type] || type;
    const time = new Date(timestamp || Date.now()).toLocaleString();

    const message = `🧠 *NeuroPulse AI Alert*
━━━━━━━━━━━━━━━━
*Patient:* ${patientName}
*Issue:* ${issue}
❤️ *BPM:* ${bpm ?? "N/A"}  |  🫁 *SpO2:* ${spo2 === -1 ? "N/A" : `${spo2}%`}
📊 *Activity:* ${activity || "Unknown"}
⚡ *Accel:* ${accel ? `${Number(accel).toFixed(2)}g` : "N/A"}
🕐 *Time:* ${time}

⚡ *Please check on your patient immediately.*`;

    let messageSid = null;
    let twilioSuccess = false;

    // ── AUTO-SEND via Twilio if configured ──
    const twilioSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioFrom = process.env.TWILIO_WHATSAPP_FROM;
    const alertPhone = process.env.ALERT_PHONE_NUMBER; // caregiver's WhatsApp number

    if (twilioSid && twilioToken && twilioFrom && alertPhone) {
      try {
        const twilio = (await import("twilio")).default;
        const client = twilio(twilioSid, twilioToken);

        const msg = await client.messages.create({
          body: message,
          from: twilioFrom.startsWith("whatsapp:") ? twilioFrom : `whatsapp:${twilioFrom}`,
          to: alertPhone.startsWith("whatsapp:") ? alertPhone : `whatsapp:${alertPhone}`,
        });
        messageSid = msg.sid;
        twilioSuccess = true;
        console.log(`✅ WhatsApp alert sent to ${alertPhone} — SID: ${msg.sid}`);
      } catch (twilioErr) {
        console.error("❌ Twilio WhatsApp error:", twilioErr);
      }
    } else {
      console.log("⚠️ Twilio not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM, ALERT_PHONE_NUMBER in .env.local");
    }

    // Always generate WhatsApp Web link as fallback for manual use
    const whatsappUrl = alertPhone
      ? `https://wa.me/${alertPhone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;

    return NextResponse.json({
      success: true,
      twilioSent: twilioSuccess,
      messageSid,
      message,
      whatsappUrl,
    });
  } catch (error) {
    console.error("Alert API error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
