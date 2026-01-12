import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 3000,
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  modelName: 'gemini-2.0-flash', // Default model
};

if (!config.geminiApiKey) {
  console.warn('Warning: GEMINI_API_KEY is not set in environment variables.');
}
