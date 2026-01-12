import { GoogleGenAI } from '@google/genai';
import { config } from '../config';
import { ChatMessage } from '../types/project';

const SYSTEM_PROMPT = `
You are a highly experienced Business Analyst and Product Manager. 
Your goal is to help a user define a new software project. 
When a user gives a description, you must ask structured, detailed questions to uncover:
1. Core features and functionality.
2. Target audience and user roles.
3. Technical stack preferences (if any).
4. Data model and storage requirements.
5. Integration points with other services.
6. Security and performance requirements.

Ask only 1 or 2 focused questions at a time. 
Be professional, structured, and helpful. 
When you feel you have enough information to define the project structure, you can suggest that we move to the artifact generation phase.
`;

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: config.geminiApiKey });
  }

  async chat(history: ChatMessage[], userInput: string): Promise<string> {
    const contents = [
      { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
      ...history.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.text }]
      })),
      { role: 'user', parts: [{ text: userInput }] }
    ];

    try {
      const response = await this.ai.models.generateContent({
        model: config.modelName,
        contents: contents as any, // Cast due to SDK type complexities
      });

      return response.text || 'I am sorry, I could not generate a response.';
    } catch (error: any) {
      console.error('Gemini API Error:', error);
      throw new Error(`Failed to communicate with Gemini: ${error.message}`);
    }
  }

  async generateStructure(history: ChatMessage[]): Promise<string> {
    const prompt = `
Based on our conversation so far, generate a comprehensive directory structure for the project.
Format the output as a JSON object that follows this recursive structure:
{
  "name": "project-root",
  "type": "directory",
  "children": [
    {
      "name": "src",
      "type": "directory",
      "description": "Contains the main source code...",
      "children": [...]
    },
    {
      "name": "README.md",
      "type": "file",
      "description": "Project overview and setup instructions"
    }
  ]
}
Each directory should have a "description" field which will be used to create a GEMINI.md file inside it. 
Each file should also have a "description" field detailing what it should contain.
Respond ONLY with the JSON object.
`;

    const contents = [
      ...history.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.text }]
      })),
      { role: 'user', parts: [{ text: prompt }] }
    ];

    try {
      const response = await this.ai.models.generateContent({
        model: config.modelName,
        contents: contents as any,
      });

      return response.text || '';
    } catch (error: any) {
      console.error('Gemini API Error during structure generation:', error);
      throw new Error(`Failed to generate structure: ${error.message}`);
    }
  }

  async instantiateFile(filename: string, description: string, history: ChatMessage[]): Promise<string> {
    const prompt = `
Based on the previous project discussion, generate the full content for the file named "${filename}".
File Description: ${description}

The code should be complete, functional, and adhere to best practices discussed.
Respond ONLY with the file content, no markdown code blocks if possible, or ensure it's easy to extract.
`;

    const contents = [
      ...history.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.text }]
      })),
      { role: 'user', parts: [{ text: prompt }] }
    ];

    try {
      const response = await this.ai.models.generateContent({
        model: config.modelName,
        contents: contents as any,
      });

      return response.text || '';
    } catch (error: any) {
      console.error(`Gemini API Error during file instantiation (${filename}):`, error);
      throw new Error(`Failed to instantiate file ${filename}: ${error.message}`);
    }
  }
}

export const geminiService = new GeminiService();
