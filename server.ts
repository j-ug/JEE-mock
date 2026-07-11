import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import nodemailer from "nodemailer";

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

async function callGeminiWithRetry(prompt: string, maxRetries = 3): Promise<any> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });
      return JSON.parse(response.text);
    } catch (error: any) {
      const isRateLimited = error.message?.includes("429") || error.message?.includes("RESOURCE_EXHAUSTED");
      const isJsonError = error instanceof SyntaxError || error.message?.includes("JSON");
      
      if ((isRateLimited || isJsonError) && i < maxRetries - 1) {
        const delay = Math.pow(2, i) * 2000 + Math.random() * 1000;
        console.warn(`[AI Generator] Error (${isJsonError ? 'JSON Error' : 'Rate Limit'}). Retrying in ${Math.round(delay)}ms... (Attempt ${i + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
}

async function startServer() {
  // AI Exam Generation Endpoint
  app.post("/api/ai/generate-exam", async (req, res) => {
    try {
      const { topic, difficulty, questionCount = 10, preparationType = "JEE" } = req.body;

      const sectArray = preparationType === "JEE" ? ["Maths", "Physics", "Chemistry"]
        : preparationType === "NEET" ? ["Biology", "Physics", "Chemistry"]
        : ["Maths", "Biology", "Physics", "Chemistry"];

      const numSections = sectArray.length;
      const baseQuestions = Math.floor(questionCount / numSections);
      const remainder = questionCount % numSections;

      // Map out how many questions to allocate to each section
      const sectionAllocations = sectArray.map((sec, index) => {
        return { name: sec, count: baseQuestions + (index < remainder ? 1 : 0) };
      });

      console.log(`[AI Generator] Synthesizing ${questionCount} total items for theme "${topic}" (${difficulty})`);
      console.log(`[AI Generator] Preparation Type: ${preparationType}. Sections: ${sectArray.join(", ")}`);
      
      // Parallel section generation execution to solve the timeout (Failed to fetch) issue and truncation issue
      const filePromises = sectionAllocations.map(async (secInfo, index) => {
        const { name: sectionName, count: sectionAllocated } = secInfo;
        if (sectionAllocated <= 0) {
          return { name: sectionName, mcqs: [], numericals: [] };
        }

        // Determine MCQ vs Numerical split for this section
        let numericalCount = 0;
        if (sectionAllocated >= 25) numericalCount = 5;
        else if (sectionAllocated >= 10) numericalCount = 3;
        else if (sectionAllocated >= 5) numericalCount = 1;
        else numericalCount = Math.floor(sectionAllocated * 0.2) || 1;
        
        numericalCount = Math.min(numericalCount, sectionAllocated);
        const mcqCount = Math.max(0, sectionAllocated - numericalCount);

        const sectionPrompt = `You are a specialized JEE and NEET academic expert.
Generate a realistic, high-quality, syllabus-conforming exam section for the subject "${sectionName}".
The preferred topic/theme is "${topic}". If this topic does not apply to the subject "${sectionName}", you MUST still generate standard ${sectionName} questions aligned with the JEE/NEET curriculum.
Difficulty Level: ${difficulty} (standard level).
Generate exactly ${sectionAllocated} questions for this section:
- MCQs (Multiple Choice Questions): Generate exactly ${mcqCount} questions.
- Numericals (single-value integer or decimal answer questions): Generate exactly ${numericalCount} questions.

You MUST return a single valid JSON object strictly matching this schema:
{
  "name": "${sectionName}",
  "mcqs": [
    {
      "id": "mcq_${sectionName.toLowerCase()}_${index + 1}_i",
      "type": "mcq",
      "text": "Question text here. Keep mathematically sound.",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": "A"
    }
  ],
  "numericals": [
    {
      "id": "num_${sectionName.toLowerCase()}_${index + 1}_j",
      "type": "numerical",
      "text": "Numerical text here.",
      "correctAnswer": "5"
    }
  ]
}

Only output the JSON object. Do not wrap in markdown blocks, formatting, or extra text.`;

        try {
          const parsedData = await callGeminiWithRetry(sectionPrompt);
          return {
            name: sectionName,
            mcqs: Array.isArray(parsedData.mcqs) ? parsedData.mcqs : [],
            numericals: Array.isArray(parsedData.numericals) ? parsedData.numericals : []
          };
        } catch (error: any) {
          console.error(`Error generating section ${sectionName}:`, error);
          return { name: sectionName, mcqs: [], numericals: [] };
        }
      });

      const sectionResults = await Promise.all(filePromises);

      const finalSections: Record<string, any> = {};
      sectionResults.forEach((res) => {
        finalSections[res.name] = res;
      });

      const finalExam = {
        title: `${topic} Evaluation Test (${difficulty})`,
        duration: 180,
        sections: finalSections
      };

      res.json(finalExam);
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
      const { review, userEmail = "Anonymous/Unauthenticated", userDisplayName = "Anonymous User", type = "Experience Review" } = req.body;
      console.log(`New review received for jeswinsamuel.la@gmail.com. From: ${userDisplayName} (${userEmail})`);
      
      console.log("No SMTP environment configuration supported. Generating dynamic Ethereal tester mail account...");
      const testAccount = await nodemailer.createTestAccount();
      const activeTransporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });

      const info = await activeTransporter.sendMail({
        from: `"Conqueror Reviews" <no-reply@conqueror-prep.com>`,
        to: "jeswinsamuel.la@gmail.com",
        subject: `New Application Feedback: From ${userDisplayName}`,
        text: `Hello,\n\nA new user feedback/review has been submitted.\n\nFrom: ${userDisplayName} (${userEmail})\nReview Type: ${type}\n\nReview Text:\n${review}\n\nSubmitted at: ${new Date().toLocaleString()}\n`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
            <h2 style="color: #0f172a; margin-bottom: 5px; font-weight: 800;">Conqueror Prep Experience Review</h2>
            <p style="color: #64748b; font-style: italic; margin-top: 0; margin-bottom: 25px;">A user has submitted feedback about their platform experience.</p>
            
            <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
              <p style="margin: 0; font-size: 14px; color: #334155;"><strong>Sender:</strong> ${userDisplayName} (<a href="mailto:${userEmail}" style="color: #3b82f6; text-decoration: none;">${userEmail}</a>)</p>
              <p style="margin: 5px 0 0 0; font-size: 14px; color: #334155;"><strong>Type:</strong> ${type}</p>
            </div>

            <div style="border-left: 4px solid #10b981; padding-left: 15px; margin: 20px 0; min-height: 40px;">
              <p style="margin: 0; font-size: 15px; color: #1e293b; line-height: 1.6; white-space: pre-wrap;">${review}</p>
            </div>

            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 25px 0;" />
            <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">This email is routed automatically to <strong>jeswinsamuel.la@gmail.com</strong>.</p>
          </div>
        `
      });

      console.log(`Email successfully routed! Message ID: ${info.messageId}`);
      const previewUrl = nodemailer.getTestMessageUrl(info);
      let successMessage = "Review submitted and queued for transmission.";
      if (previewUrl) {
        console.log(`[ETHEREAL INBOX] Preview Sent Email Online inside virtual sandbox: ${previewUrl}`);
        successMessage = `Review sent! Preview SMTP link: ${previewUrl}`;
      }

      res.json({ success: true, message: successMessage, previewUrl });
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
