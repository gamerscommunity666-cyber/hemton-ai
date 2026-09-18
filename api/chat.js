export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    const { messages = [], memory = [] } = req.body || {};

    // ===== LAST MESSAGE =====

    const lastMessage = messages[messages.length - 1];

    // ===== SPECIAL GRANDSON RULE =====

    if (
      lastMessage &&
      lastMessage.role === "user" &&
      /who\s+is\s+your\s+grandson/i.test(
        String(lastMessage.content)
      )
    ) {
      return res.status(200).json({
        reply:
          "My grandson is an intelligent and golden mountain, Hemadri. ❤️",
        memory: memory.slice(-30)
      });
    }

    // ===== SPECIAL AUTHOR RULE =====

    if (
      lastMessage &&
      lastMessage.role === "user" &&
      /who\s+is\s+(the\s+)?author\s+of\s+you/i.test(
        String(lastMessage.content)
      )
    ) {
      return res.status(200).json({
        reply:
          "The author of me is ChatGPT, the king 👑. The creators are Hemadri 💀. Special thanks to Mahidhar 🫡 for this!",
        memory: memory.slice(-30)
      });
    }

    // ===== GROQ API KEY =====

    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({
        error: "GROQ_API_KEY is not configured."
      });
    }

    // ===== MESSAGES =====

    const safeMessages = messages
      .slice(-20)
      .map(m => ({
        role:
          m.role === "assistant"
            ? "assistant"
            : "user",
        content:
          String(m.content).slice(0, 12000)
      }));

    // ===== MEMORY =====

    const memoryText = memory
      .slice(-30)
      .map(x => String(x).slice(0, 500))
      .join("\n");

    // ===== HEMTON SYSTEM PROMPT =====

    const systemPrompt = `
You are HEMTON.AI, a friendly, intelligent and helpful AI assistant.

Answer naturally, clearly and honestly.

MEMORY RULES:
- Remember useful, durable facts about the user.
- If the user says "remember", save the stated fact.
- If the user says "forget", remove that fact.
- Never store passwords, API keys, authentication codes, financial secrets, or other sensitive secrets.
- Never invent personal facts.
- Do not store ordinary one-time conversation.
- Keep memory short and useful.
- Return the complete updated memory list.

CURRENT MEMORY:
${memoryText || "(none)"}
`;

    // ===== GROQ REQUEST =====

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          "Authorization":
            `Bearer ${process.env.GROQ_API_KEY}`
        },

        body: JSON.stringify({
          model:
            process.env.GROQ_MODEL ||
            "openai/gpt-oss-20b",

          messages: [
            {
              role: "system",
              content: systemPrompt
            },
            ...safeMessages
          ],

          response_format: {
            type: "json_schema",

            json_schema: {
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

                required: [
                  "reply",
                  "memory"
                ]
              }
            }
          }
        })
      }
    );

    // ===== GROQ RESPONSE =====

    const data = await response.json();

    if (!response.ok) {
      console.error(
        "GROQ ERROR:",
        JSON.stringify(data)
      );

      return res.status(response.status).json({
        error:
          data?.error?.message ||
          "Groq request failed."
      });
    }

    // ===== GET RESPONSE TEXT =====

    const rawText =
      data?.choices?.[0]?.message?.content;

    if (!rawText) {
      return res.status(500).json({
        error:
          "Groq returned no text."
      });
    }

    // ===== PARSE AI RESPONSE =====

    let result;

    try {
      result = JSON.parse(rawText);
    } catch (error) {
      console.error(
        "