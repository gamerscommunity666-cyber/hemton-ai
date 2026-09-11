# HEMTON.AI

A real AI assistant web app with chat, browser voice input, spoken replies, and local conversation storage.

## Architecture

Browser UI -> `/api/chat` serverless function -> OpenAI Responses API

The OpenAI API key is NEVER placed in the browser.

## Deploy

1. Import this repository into Vercel.
2. In Vercel Project Settings -> Environment Variables, add:
   `OPENAI_API_KEY` = your OpenAI secret key.
3. Optionally add `OPENAI_MODEL`.
4. Redeploy.
5. Open the Vercel URL.

GitHub Pages alone cannot safely hold the secret API key.

## Local memory

Chat history is stored in the browser's localStorage. The app sends recent history to the backend with each request.
