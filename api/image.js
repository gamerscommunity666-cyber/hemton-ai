 export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { prompt } = req.body || {};

    if (!prompt) {
      return res.status(400).json({
        error: "Image prompt is required."
      });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        error: "OPENAI_API_KEY is missing."
      });
    }

    const response = await fetch(
      "https://api.openai.com/v1/images/generations",
      {
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
      }
    );

    const data = await response.json();

    console.log("IMAGE API STATUS:", response.status);
    console.log("IMAGE API RESPONSE:", JSON.stringify(data));

    if (!response.ok) {
      return res.status(response.status).json({
        error: data?.error?.message || "Image API failed."
      });
    }

    const item = data?.data?.[0];

    if (!item) {
      return res.status(500).json({
        error: "The image API returned no image."
      });
    }

    if (item.b64_json) {
      return res.status(200).json({
        image: `data:image/png;base64,${item.b64_json}`
      });
    }

    if (item.url) {
      return res.status(200).json({
        image: item.url
      });
    }

    return res.status(500).json({
      error: "The image response contained no usable image."
    });

  } catch (error) {
    console.error("IMAGE ERROR:", error);

    return res.status(500).json({
      error: error.message || "Unexpected image error."
    });
  }
}