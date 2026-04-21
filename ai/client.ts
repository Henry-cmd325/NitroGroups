import OpenAI from "openai";
import fs from "fs";

let openai: OpenAI;

export function initializeAIClient() {
    const apiKey = process.env.OPENAI_API_KEY;
    const baseURL = process.env.OPENAI_BASE_URL;

    if (!apiKey) {
        console.warn("\n⚠️ ADVERTENCIA: No se encontró OPENAI_API_KEY en las variables de entorno.");
    }

    openai = new OpenAI({
        apiKey: apiKey || "MISSING",
        baseURL: baseURL || undefined
    });
}
export async function generateCode(
    systemPrompt: string,
    userPrompt: string,
    model: string = "gpt-4o"
): Promise<string> {
    const aiModel = process.env.OPENAI_MODEL || model;
    
    if (!openai) {
        initializeAIClient();
    }

    const messages: any[] = [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
    ];

    console.log(`🧠 Ejecutando modelo: ${aiModel}...`);
    
    const response = await openai.chat.completions.create({
        model: aiModel,
        messages: messages,
        temperature: 0.1,
    });

    const rawContent = response.choices[0].message.content || "";
    return extractCodeBlock(rawContent);
}

function extractCodeBlock(rawMessage: string): string {
    const match = rawMessage.match(/```[a-zA-Z]*\n([\s\S]*?)```/);
    if (match && match[1]) {
        return match[1].trim();
    }
    return rawMessage.trim();
}

