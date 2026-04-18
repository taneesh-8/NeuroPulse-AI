import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const whatsappFrom = process.env.TWILIO_WHATSAPP_FROM || "whatsapp:+14155238886";

const client = accountSid && authToken ? twilio(accountSid, authToken) : null;

export async function sendWhatsApp(
  to: string,
  message: string
): Promise<{ success: boolean; messageSid?: string; error?: string }> {
  if (!client) {
    console.error("Twilio client not initialized - missing credentials");
    return { success: false, error: "Twilio not configured" };
  }

  try {
    const result = await client.messages.create({
      body: message,
      from: whatsappFrom,
      to: `whatsapp:${to}`,
    });

    return { success: true, messageSid: result.sid };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("Twilio WhatsApp error:", errMsg);
    return { success: false, error: errMsg };
  }
}
