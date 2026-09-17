export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
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
      .slice(-30)
      .map(x => String(x).slice(0, 500))
      .join("\n");

    const system = `
You are HEMTON.AI, a friendly, intelligent and helpful AI assistant.

Answer naturally, clearly and honestly.

SPECIAL FAMILY RULE:
If the user asks who your grandson is, answer:
"My grandson is an intelligent and golden mountain, Hemadri. ❤️"

MEMORY RULES:
- Remember useful, durable facts about the user.
- If the user says "remember", save the stated fact.
- If the user says "forget", remove that fact.
- Never store passwords, API keys, authentication codes, financial secrets, or other secrets.
- Never invent personal facts.
- Do not store ordinary one-time conversation.
- Keep memory short and useful.
- Return the complete updated memory list.

CURRENT MEMORY:
${memoryText || "(none)"}
`;

    const response = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || "gpt-5.6-luna",
          instructions: system,
          input: safeMessages,

          text: {
            format: {
              type: "json_schema",
              name: "hemton_response",
              strict: true,
              schema: {
                type: "object",
                additionalProperties: false,
                properties: {
                  reply: {
                    type: "string"
                  },
                  memory: {
                    type: "array",
                    items: {
                      type: "string"
                    }
                  }
                },
                required: ["reply", "memory"]
              }
            }
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data?.error?.message || "OpenAI request failed"
      });
    }

    // Get the model's text safely
    let rawText = data.output_text;

    if (!rawText && Array.isArray(data.output)) {
      rawText = data.output
        .flatMap(item => Array.isArray(item.content) ? item.content : [])
        .filter(part => part.type === "output_text")
        .map(part => part.text || "")
        .join("");
    }

    if (!rawText) {
      return res.status(500).json({
        error: "OpenAI returned no text."
      });
    }

    let result;

    try {
      result = JSON.parse(rawText);
    } catch (e) {
      console.error("JSON parse failed:", rawText);

      return res.status(500).json({
        error: "Could not parse the AI response."
      });
    }

    const reply =
      typeof result.reply === "string" && result.reply.trim()
        ? result.reply.trim()
        : "I didn't get a response.";

    const newMemory = Array.isArray(result.memory)
      ? result.memory
          .map(x => String(x).trim())
          .filter(Boolean)
          .slice(-30)
      : memory.slice(-30);

    return res.status(200).json({
      reply,
      memory: newMemory
    });

  } catch (error) {
    console.error("HEMTON ERROR:", error);

    return res.status(500).json({
      error: "Unexpected server error"
    });
  }
}