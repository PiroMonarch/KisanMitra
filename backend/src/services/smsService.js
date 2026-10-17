const sendSms = async ({ to, message }) => {
  const provider = (process.env.SMS_PROVIDER || "twilio").toLowerCase();
  if (provider !== "twilio") {
    throw new Error("Unsupported SMS provider");
  }

  const accountSid = process.env.SMS_TWILIO_SID;
  const authToken = process.env.SMS_TWILIO_TOKEN;
  const from = process.env.SMS_TWILIO_FROM;

  if (!accountSid || !authToken || !from) {
    throw new Error("SMS provider not configured");
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const body = new URLSearchParams({
    To: to,
    From: from,
    Body: message
  });

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: body.toString()
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.message || "Failed to send SMS");
  }
  return data;
};

module.exports = { sendSms };
