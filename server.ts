import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

async function startServer() {
  // AI Exam Generation Endpoint
  app.post("/api/ai/generate-exam", async (req, res) => {
    try {
      const { topic, difficulty, questionCount = 10, sections = ["Maths", "Physics", "Chemistry"] } = req.body;

      const prompt = `Generate a realistic and high-quality exam based on the topic: "${topic}". 
      Difficulty Level: ${difficulty} (e.g., Easy, Medium, Hard, JEE Advanced level).
      Total questions: ${questionCount}.
      Divide them into sections: ${sections.join(", ")}.
      
      ${questionCount == 75 ? "Set numericals to 5 per section (total 15), and the remaining 20 questions per section as MCQs." : "Each section should contain both 'mcqs' and 'numericals'."}
      MCQs must have 4 options labeled A, B, C, and D. There must be 1 correct answer. The 'correctAnswer' field MUST be the option label (e.g., "A").
      Numericals must have a single number as the answer.
      
      Return the result in JSON format matching this schema:
      {
        "title": "Exam Title",
        "duration": 180,
        "sections": {
          "Maths": { "name": "Maths", "mcqs": [...], "numericals": [...] },
          "Physics": { "name": "Physics", "mcqs": [...], "numericals": [...] },
          "Chemistry": { "name": "Chemistry", "mcqs": [...], "numericals": [...] }
        }
      }
      
      Question Schema:
      {
        "id": "unique_string",
        "type": "mcq" | "numerical",
        "text": "Question text",
        "options": ["A", "B", "C", "D"], // only for mcq
        "correctAnswer": "Answer"
      }`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      const examData = JSON.parse(response.text);
      res.json(examData);
    } catch (error: any) {
      console.error("AI Generation Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // AI Document Analysis Endpoint
  app.post("/api/ai/analyze-document", async (req, res) => {
    try {
      const { fileData, mimeType } = req.body;

      const prompt = `Analyze this question paper document. 
      1. Extract all questions including MCQs and Numericals.
      2. Categorize them into Maths, Physics, and Chemistry if applicable.
      3. Identify any errors in the questions (missing options, ambiguous text).
      4. Return the structured exam data and an 'errors' list.
      
      Return format:
      {
        "exam": {
          "title": "Extracted Title",
          "duration": 180,
          "sections": { ... same structure as generate-exam ... }
        },
        "analysis": {
          "errors": ["Error 1", "Error 2"],
          "summary": "Summary of the paper"
        }
      }`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          {
            inlineData: {
              mimeType,
              data: fileData,
            },
          },
          { text: prompt },
        ],
        config: {
          responseMimeType: "application/json",
        },
      });

      const analysisResult = JSON.parse(response.text);
      res.json(analysisResult);
    } catch (error: any) {
      console.error("Document Analysis Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // AI Doubt Solver (Surf with AI) Endpoint
  app.post("/api/ai/solve-doubt", async (req, res) => {
    try {
      const { text, images } = req.body; // images is an array of { fileData: string, mimeType: string }

      const parts: any[] = [];
      
      if (images && images.length > 0) {
        images.forEach((img: any) => {
          parts.push({
            inlineData: {
              mimeType: img.mimeType,
              data: img.fileData,
            }
          });
        });
      }

      const textPrompt = `You are an elite academic mentor and 'Google Lens' standard question solver on the Conqueror Preparation Platform. 
Analyze the provided query and/or images of the question. 
Your objective is to:
1. Conduct search queries if needed to locate other variations or exact formulations of this question online.
2. Provide a rigorous, step-by-step, clear academic explanation showing how to solve this exact problem.
3. Show all mathematical formulas, diagram explanations, and chemical structures/reactions if applicable.
4. Conclude with a prominently highlighted final correct answer block or selected option (A, B, C, or D).

User's accompanying text/question data: ${text || "Please analyze and solve the attached question in detail."}`;

      parts.push({ text: textPrompt });

      let response;
      let usedModel = "gemini-3.5-flash";
      try {
        response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: parts,
          config: {
            systemInstruction: "You are a world-class academic tutor powered by Conqueror Preparation Platform. Do not make up facts. Search the web to verify formulas, values, or current affairs if they are referenced. Use beautiful markdown for output design.",
            tools: [{ googleSearch: {} }],
          },
        });
      } catch (err: any) {
        console.warn("Primary model gemini-3.5-flash failed or hit quota. Retrying with gemini-3.1-flash-lite as fallback...", err.message || err);
        usedModel = "gemini-3.1-flash-lite";
        // Attempt fallback to highly available gemini-3.1-flash-lite
        response = await ai.models.generateContent({
          model: "gemini-3.1-flash-lite",
          contents: parts,
          config: {
            systemInstruction: "You are a world-class academic tutor powered by Conqueror Preparation Platform. Do not make up facts. Search the web to verify formulas, values, or current affairs if they are referenced. Use beautiful markdown for output design.",
            tools: [{ googleSearch: {} }],
          },
        });
      }

      const solution = response.text;
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      const sources = chunks ? chunks.filter((c: any) => c.web).map((c: any) => ({
        title: c.web.title,
        url: c.web.uri
      })) : [];

      res.json({
        solution,
        sources,
        modelInfo: usedModel
      });
    } catch (error: any) {
      console.error("Doubt Solver Error:", error);
      const errText = error.message || String(error);
      const isQuotaExceeded = errText.includes("quota") || errText.includes("RESOURCE_EXHAUSTED") || errText.includes("429");
      res.status(isQuotaExceeded ? 429 : 500).json({ 
        error: errText,
        isQuotaExceeded
      });
    }
  });

  // Send Review Endpoint
  app.post("/api/send-review", async (req, res) => {
    try {
      const { review } = req.body;
      console.log(`New review received for jeswinla.jee@gmail.com: ${review}`);
      // Real email sending logic would go here
      res.json({ success: true });
    } catch (error: any) {
      console.error("Review Submission Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Notify Password Change Endpoint
  app.post("/api/notify-password-change", async (req, res) => {
    try {
      const { newPassword } = req.body;
      const email = "jeswinsamuel.la@gmail.com";
      console.log(`[EMAIL SIMULATION] Sending password notification to ${email}. New Password: ${newPassword}`);
      // In production, integrate with nodemailer or SendGrid here
      res.json({ success: true, message: `Notification sent to ${email}` });
    } catch (error: any) {
      console.error("Password Notification Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
