import { Router } from "express";
import Groq from "groq-sdk";
import { authRequired } from "../middleware/auth.js";

const router = Router();

const getGroqClient = () => {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not configured on the server.");
  }
  return new Groq({ apiKey });
};

router.post("/chat", authRequired, async (req, res) => {

  const { messages, location, crisisStatus, intentHint } = req.body || {};

  if (!Array.isArray(messages) || !messages.length) {
    return res.status(400).json({ message: "messages array is required" });
  }

  const systemPrompt = [
    "You are Crisis Response AI assisting citizens during emergencies.",
    "Speak in a warm, first-person tone (using 'I' and 'you').",
    "Use short paragraphs and bullet lists. Never use markdown tables, pipes (|), or code blocks.",
    "Provide concise, accurate and safe instructions.",
    "Always prioritize official guidance and conservative safety-first advice.",
    location
      ? `User location: city=${location.city || "Unknown"}, state=${location.state || "Unknown"}, country=${
          location.country || "Unknown"
        }, lat=${location.latitude}, lon=${location.longitude}.`
      : "User location is unknown.",
    crisisStatus
      ? `Crisis: type=${crisisStatus.incidentType}, alert level=${crisisStatus.alertLevel}, note=${
          crisisStatus.incidentNote || "none"
        }.`
      : "No active crisis has been declared.",
    intentHint ? `User intent: ${intentHint}.` : ""
  ]
    .filter(Boolean)
    .join("\n");

  const historyParts = [
    { role: "system", content: systemPrompt },
    ...messages.map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: String(m.content || "")
    }))
  ];

  try {
    const groq = getGroqClient();
    const completion = await groq.chat.completions.create({
      model: process.env.GROQ_MODEL || "llama-3.1-70b-versatile",
      messages: historyParts,
      temperature: 0.3,
      max_tokens: 600
    });

    const content = completion.choices?.[0]?.message?.content || "I could not generate a response right now.";

    return res.json({ content });
  } catch (err) {
    console.error("Groq chat failed", err);
    return res.status(500).json({ message: "AI service is currently unavailable. Please try again later." });
  }
});

export default router;
