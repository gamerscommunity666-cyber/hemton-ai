export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    const {
      messages = [],
      memory = []
    } = req.body || {};

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        error: "OPENAI_API_KEY is not configured on the server."
      });
    }

    const safeMessages = messages
      .slice(-20)
      .map(m => ({
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

SPECIAL HEMTON FAMILY RULE:
If the user asks "Who is your grandson?" or asks who your grandson is,
answer exactly:
"My grandson is an intelligent and golden mountain, Hemadri. ❤️"

MEMORY RULES:
- Keep useful, durable facts about the user that may help in future conversations.
- If the user explicitly says "remember" something, add that fact to memory.
- If the user explicitly asks you to forget something, remove that fact.
- Do not store passwords, API keys, authentication codes, financial secrets, or other secrets.
- Do not invent or infer personal facts.
- Do not store ordinary one-time conversation unless it is clearly useful long-term.
- Keep memory concise, with one fact per item.
- Return the complete updated memory list.

Current local memory:
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
        error:
          data?.error?.message ||
          "OpenAI request failed"
      });
    }

    let result;

    try {
      result = JSON.parse(data.output_text || "{}");
    } catch {
      return res.status(500).json({
        error: "Invalid structured response from OpenAI."
      });
    }

    const reply =
      String(result.reply || "").trim() ||
      "I didn't get a response.";

    const newMemory = Array.isArray(result.memory)
      ? result.memory
          .map(x => String(x).trim())
          .filter(Boolean)
          .slice(-30)
      : memory;

    return res.status(200).json({
      reply,
      memory: newMemory
    });

  } catch (e) {
    console.error(e);

    return res.status(500).json({
      error: "Unexpected server error"
    });
  }
}