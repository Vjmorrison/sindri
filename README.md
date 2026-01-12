# Bootstrapper Service

A microservice that uses Gemini GenAI to help users kick off and instantiate new software projects through a structured BA/PM dialogue.

## Tech Stack
- **Runtime:** Node.js
- **Framework:** Express
- **Language:** TypeScript
- **AI SDK:** `@google/genai` (Gemini)
- **Build Tool:** Vite
- **Test Framework:** Jest

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file and add your Gemini API Key:
   ```env
   GEMINI_API_KEY=your_api_key_here
   ```

3. Run in development mode:
   ```bash
   npm run dev
   ```

## API Endpoints

### Documentation
**Swagger UI:** `http://localhost:3000/api-docs`
Interactive API documentation where you can test endpoints directly.

### 1. Kickoff Project
Starts a new project session with a vague description.
- **URL:** `POST /api/project/kickoff`
- **Body:** `{ "description": "I want to build a simple todo list app with a backend" }`

### 2. Respond to Questions
Answer the Business Analyst's questions to refine requirements.
- **URL:** `POST /api/project/respond`
- **Body:** `{ "id": "session-id", "text": "I want to use Node.js and MongoDB" }`

### 3. Generate Artifacts
Generate the project directory structure and `GEMINI.md` files.
- **URL:** `POST /api/project/generate-artifacts`
- **Body:** `{ "id": "session-id" }`

### 4. Instantiate Project
Generate the actual code for the project files based on the artifacts.
- **URL:** `POST /api/project/instantiate`
- **Body:** `{ "id": "session-id", "targetDir": "my-new-project" }`

## Testing
Run the test suite:
```bash
npm test
```
