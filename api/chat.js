export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { messages = [], memory = [] } = req.body || {};

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        error: "OPENAI_API_KEY is not configured on the server."
      });
    }

    const safeMessages = messages.slice(-20).map(m => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: String(m.content).slice(0, 12000)
    }));

    const memoryText = memory
      .slice(-20)
      .map(x => String(x).slice(0, 500))
      .join("\n");

    const system = `You are HEMTON.AI, a friendly, capable AI assistant.
Be helpful, clear and honest.
You have no hidden access to the user's device.
Never reveal API keys or secrets.

Local memory supplied by the app:
${memoryText || "(none)"}`;

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-5.6-luna",
        instructions: system,
        input: safeMessages
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data?.error?.message || "OpenAI request failed"
      });
    }

    const reply = data.output_text || "I didn't get a response.";

    return res.status(200).json({
      reply,
      memory
    });

  } catch (e) {
    return res.status(500).json({
      error: "Unexpected server error"
    });
  }
}
