export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    const { messages = [], memory = [] } = req.body || {};

    const lastMessage = messages[messages.length - 1];

    /*
      SPECIAL HEMTON RULE:
      Who is your grandson?
    */
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

    /*
      SPECIAL HEMTON RULE:
      Who is the author of you?
    */
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

    /*
      Check Groq API key
    */
    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({
        error: "GROQ_API_KEY is not configured."
      });
    }

    /*
      Keep the conversation reasonably small
    */
    const safeMessages = messages
      .slice(-20)
      .map((m) => ({
        role:
          m.role === "assistant"
            ? "assistant"
            : "user",
        content: String(m.content).slice(0, 12000)
      }));

    /*
      Convert memory into text
    */
    const memoryText = memory
      .slice(-30)
      .map((x) => String(x).slice(0, 500))
      .join("\n");

    /*
      HEMTON system instructions
    */
    const systemPrompt = `
You are HEMTON.AI, a friendly, intelligent and helpful AI assistant.

Answer naturally, clearly and honestly.

IMPORTANT:
Return ONLY valid JSON.
Do not use markdown code fences.
Do not put any text before or after the JSON.

The JSON must have exactly this structure:

{
  "reply": "your answer here",
  "memory": []
}

"reply" must always be a string.

"memory" must always be an array of strings.

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

    /*
      Call Groq
    */
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
            "llama-3.3-70b-versatile",

          messages: [
            {
              role: "system",
              content: systemPrompt
            },
            ...safeMessages
          ],

          response_format: {
            type: "json_object"
          },

          temperature: 0.4
        })
      }
    );

    const data = await response.json();

    /*
      Groq error
    */
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

    /*
      Get model response
    */
    const rawText =
      data?.choices?.[0]?.message?.content;

    if (!rawText) {
      return res.status(500).json({
        error: "Groq returned no text."
      });
    }

    /*
      Parse JSON
    */
    let result;

    try {
      result = JSON.parse(rawText);
    } catch (error) {
      console.error(
        "JSON parse failed:",
        rawText
      );

      return res.status(500).json({
        error:
          "Could not parse the AI response."
      });
    }

    /*
      Clean reply
    */
    const reply =
      typeof result.reply === "string" &&
      result.reply.trim()
        ? result.reply.trim()
        : "I didn't get a response.";

    /*
      Clean memory
    */
    const newMemory =
      Array.isArray(result.memory)
        ? result.memory
            .map((x) => String(x).trim())
            .filter(Boolean)
            .slice(-30)
        : memory.slice(-30);

    /*
      Send result back to HEMTON
    */
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