export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { prompt } = req.body || {};

    if (!prompt) {
      return res.status(400).json({ error: "Image prompt is required." });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: "OPENAI_API_KEY is not configured." });
    }

    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-image-2",
        prompt: String(prompt).slice(0, 4000),
        size: "1024x1024"
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data?.error?.message || "Image generation failed."
      });
    }

    const image = data?.data?.[0];

    if (!image) {
      return res.status(500).json({
        error: "No image was returned."
      });
    }

    return res.status(200).json({
      image: image.b64_json
        ? `data:image/png;base64,${image.b64_json}`
        : image.url
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Unexpected image generation error."
    });
  }
}