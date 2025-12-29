import { GoogleGenerativeAI } from "@google/generative-ai";
import "dotenv/config";

async function test() {
  const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

  const res = await ai
    .getGenerativeModel({ model: "models/gemini-2.5-flash" })
    .generateContent("Say hello");

  console.log(res.response.text());
}

test();
