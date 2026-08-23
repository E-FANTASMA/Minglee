export const sendWhatsAppMessage = async (to, text) => {
  const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
  const META_PHONE_NUMBER_ID = process.env.META_PHONE_NUMBER_ID;
  const META_GRAPH_VERSION = process.env.META_GRAPH_VERSION || "v18.0";

  if (!META_ACCESS_TOKEN || !META_PHONE_NUMBER_ID) {
    console.warn("SENDING WHATSAPP REPLY skipped: META_ACCESS_TOKEN or META_PHONE_NUMBER_ID unset");
    return;
  }

  const url = `https://graph.facebook.com/${META_GRAPH_VERSION}/${META_PHONE_NUMBER_ID}/messages`;

  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: to,
    type: "text",
    text: { body: text },
  };

  try {
    console.log(`SENDING WHATSAPP REPLY to=${to}`);
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${META_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`SENDING WHATSAPP REPLY failed HTTP ${response.status} body=${errorBody}`);
    } else {
      console.log("SENDING WHATSAPP REPLY success");
    }
  } catch (err) {
    console.error("WhatsApp send failed:", err);
  }
};

export const processIncomingMessage = async (payload) => {
  const entries = payload.entry || [];
  
  for (const entry of entries) {
    const changes = entry.changes || [];
    
    for (const change of changes) {
      const value = change.value || {};
      const messages = value.messages || [];
      
      for (const message of messages) {
        if (message.type === "text") {
          const from = message.from; // Sender's phone number
          const textBody = message.text.body;
          
          console.log(`Received WhatsApp message from ${from}: ${textBody}`);
          
          // Reply with a basic hi
          await sendWhatsAppMessage(from, "Hi");
        }
      }
    }
  }
};
