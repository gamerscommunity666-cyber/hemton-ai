export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    const { messages = [], memory = [] } = req.body || {};

    const lastMessage = messages[messages.length - 1];

    // ==========================================
    // SPECIAL RULE: HEMTON'S GRANDSON
    // ==========================================
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
        memory: Array.isArray(memory)
          ? memory.slice(-30)
          : []
      });
    }

    // ==========================================
    // SPECIAL RULE: HEMTON'S AUTHOR
    // ==========================================
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
        memory: Array.isArray(memory)
          ? memory.slice(-30)
          : []
      });
    }

    // ==========================================
    // CHECK GROQ API KEY
    // ==========================================
    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({
        error: "GROQ_API_KEY is not configured."
      });
    }

    // ==========================================
    // SAFE MESSAGE HISTORY
    // ==========================================
    const safeMessages = Array.isArray(messages)
      ? messages
          .slice(-20)
          .map((m) => ({
            role:
              m.role === "assistant"
                ? "assistant"
                : "user",
            content: String(m.content || "").slice(
              0,
              12000
            )
          }))
      : [];

    // ==========================================
    // MEMORY
    // ==========================================
    const safeMemory = Array.isArray(memory)
      ? memory
          .slice(-30)
          .map((x) => String(x).slice(0, 500))
      : [];

    const memoryText =
      safeMemory.length > 0
        ? safeMemory.join("\n")
        : "(none)";

    // ==========================================
    // HEMTON SYSTEM PROMPT
    // ==========================================
    const systemPrompt = `
You are HEMTON.AI, a friendly, intelligent and helpful AI assistant.

Answer naturally, clearly and honestly.

You must return ONLY valid JSON.

Do NOT use markdown.
Do NOT use code fences.
Do NOT write anything outside the JSON object.

Return exactly this format:

{
  "reply": "your answer",
  "memory": []
}

The "reply" value must be a string.

The "memory" value must be an array of strings.

MEMORY RULES:

- Remember useful and durable facts about the user.
- If the user explicitly says "remember", save that fact.
- If the user explicitly says "forget", remove that fact.
- Never store passwords.
- Never store API keys.
- Never store authentication codes.
- Never store financial secrets.
- Never invent personal facts.
- Do not store ordinary one-time conversation.
- Keep memory short and useful.
- Return the complete updated memory list.

CURRENT MEMORY:
${memoryText}
`;

    // ==========================================
    // CALL GROQ
    // ==========================================
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

          // Simple JSON mode.
          // This avoids the structured-schema/tool
          // problem from the previous version.
          response_format: {
            type: "json_object"
          },

          // GPT-OSS reasoning model + JSON mode.
          reasoning_format: "hidden",

          temperature: 0.4,

          max_completion_tokens: 2048
        })
      }
    );

    const data = await response.json();

    // ==========================================
    // GROQ ERROR
    // ==========================================
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

    // ==========================================
    // GET AI RESPONSE
    // ==========================================
    const rawText =
      data?.choices?.[0]?.message?.content;

    if (!rawText) {
      return res.status(500).json({
        error: "Groq returned no text."
      });
    }

    // ==========================================
    // PARSE JSON
    // ==========================================
    let result;

    try {
      result = JSON.parse(rawText);
    } catch (error) {
      console.error(
        "JSON PARSE ERROR:",
        rawText
      );

      return res.status(500).json({
        error: "Could not parse the AI response."
      });
    }

    // ==========================================
    // CLEAN REPLY
    // ==========================================
    const reply =
      typeof result.reply === "string" &&
      result.reply.trim()
        ? result.reply.trim()
        : "I didn't get a response.";

    // ==========================================
    // CLEAN MEMORY
    // ==========================================
    const newMemory =
      Array.isArray(result.memory)
        ? result.memory
            .map((x) => String(x).trim())
            .filter(Boolean)
            .slice(-30)
        : safeMemory;

    // ==========================================
    // SEND TO FRONTEND
    // ==========================================
    return res.status(200).json({
      reply,
      memory: newMemory
    });

  } catch (error) {
    console.error(
      "HEMTON ERROR:",
      error
    );

    return res.status(500).json({
      error:
        "Unexpected server error."
    });
  }
}