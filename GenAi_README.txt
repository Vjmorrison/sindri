The Google Gen AI JavaScript SDK is designed for TypeScript and JavaScript developers to build applications powered by Gemini. The SDK supports both the Gemini Developer API and Vertex AI.

The Google Gen AI SDK is designed to work with Gemini 2.0+ features.

Caution
API Key Security: Avoid exposing API keys in client-side code. Use server-side implementations in production environments.

Code Generation
Generative models are often unaware of recent API and SDK updates and may suggest outdated or legacy code.

We recommend using our Code Generation instructions codegen_instructions.md when generating Google Gen AI SDK code to guide your model towards using the more recent SDK features. Copy and paste the instructions into your development environment to provide the model with the necessary context.

Prerequisites
Node.js version 20 or later
The following are required for Vertex AI users (excluding Vertex AI Studio)
Select or create a Google Cloud project.

Enable billing for your project.

Enable the Vertex AI API.

Configure authentication for your project.

Install the gcloud CLI.
Initialize the gcloud CLI.
Create local authentication credentials for your user account:
gcloud auth application-default login
Copy
A list of accepted authentication options are listed in GoogleAuthOptions interface of google-auth-library-node.js GitHub repo.

Installation
To install the SDK, run the following command:

npm install @google/genai
Copy
Quickstart
The simplest way to get started is to use an API key from Google AI Studio:

import {GoogleGenAI} from '@google/genai';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const ai = new GoogleGenAI({apiKey: GEMINI_API_KEY});

async function main() {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: 'Why is the sky blue?',
  });
  console.log(response.text);
}

main();
Copy
Initialization
The Google Gen AI SDK provides support for both the Google AI Studio and Vertex AI implementations of the Gemini API.

Gemini Developer API
For server-side applications, initialize using an API key, which can be acquired from Google AI Studio:

import { GoogleGenAI } from '@google/genai';
const ai = new GoogleGenAI({apiKey: 'GEMINI_API_KEY'});
Copy
Browser
Caution
API Key Security: Avoid exposing API keys in client-side code. Use server-side implementations in production environments.

In the browser the initialization code is identical:

import { GoogleGenAI } from '@google/genai';
const ai = new GoogleGenAI({apiKey: 'GEMINI_API_KEY'});
Copy
Vertex AI
Sample code for VertexAI initialization:

import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({
    vertexai: true,
    project: 'your_project',
    location: 'your_location',
});
Copy
(Optional) (NodeJS only) Using environment variables:
For NodeJS environments, you can create a client by configuring the necessary environment variables. Configuration setup instructions depends on whether you're using the Gemini Developer API or the Gemini API in Vertex AI.

Gemini Developer API: Set GOOGLE_API_KEY as shown below:

export GOOGLE_API_KEY='your-api-key'
Copy
Gemini API on Vertex AI: Set GOOGLE_GENAI_USE_VERTEXAI, GOOGLE_CLOUD_PROJECT and GOOGLE_CLOUD_LOCATION, as shown below:

export GOOGLE_GENAI_USE_VERTEXAI=true
export GOOGLE_CLOUD_PROJECT='your-project-id'
export GOOGLE_CLOUD_LOCATION='us-central1'
Copy
import {GoogleGenAI} from '@google/genai';

const ai = new GoogleGenAI();
Copy
API Selection
By default, the SDK uses the beta API endpoints provided by Google to support preview features in the APIs. The stable API endpoints can be selected by setting the API version to v1.

To set the API version use apiVersion. For example, to set the API version to v1 for Vertex AI:

const ai = new GoogleGenAI({
    vertexai: true,
    project: 'your_project',
    location: 'your_location',
    apiVersion: 'v1'
});
Copy
To set the API version to v1alpha for the Gemini Developer API:

const ai = new GoogleGenAI({
    apiKey: 'GEMINI_API_KEY',
    apiVersion: 'v1alpha'
});
Copy
GoogleGenAI overview
All API features are accessed through an instance of the GoogleGenAI classes. The submodules bundle together related API methods:

ai.models: Use models to query models (generateContent, generateImages, ...), or examine their metadata.
ai.caches: Create and manage caches to reduce costs when repeatedly using the same large prompt prefix.
ai.chats: Create local stateful chat objects to simplify multi turn interactions.
ai.files: Upload files to the API and reference them in your prompts. This reduces bandwidth if you use a file many times, and handles files too large to fit inline with your prompt.
ai.live: Start a live session for real time interaction, allows text + audio + video input, and text or audio output.
Samples
More samples can be found in the github samples directory.

Streaming
For quicker, more responsive API interactions use the generateContentStream method which yields chunks as they're generated:

import {GoogleGenAI} from '@google/genai';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const ai = new GoogleGenAI({apiKey: GEMINI_API_KEY});

async function main() {
  const response = await ai.models.generateContentStream({
    model: 'gemini-2.5-flash',
    contents: 'Write a 100-word poem.',
  });
  for await (const chunk of response) {
    console.log(chunk.text);
  }
}

main();
Copy
Function Calling
To let Gemini to interact with external systems, you can provide functionDeclaration objects as tools. To use these tools it's a 4 step

Declare the function name, description, and parametersJsonSchema
Call generateContent with function calling enabled
Use the returned FunctionCall parameters to call your actual function
Send the result back to the model (with history, easier in ai.chat) as a FunctionResponse
import {GoogleGenAI, FunctionCallingConfigMode, FunctionDeclaration, Type} from '@google/genai';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function main() {
  const controlLightDeclaration: FunctionDeclaration = {
    name: 'controlLight',
    parametersJsonSchema: {
      type: 'object',
      properties:{
        brightness: {
          type:'number',
        },
        colorTemperature: {
          type:'string',
        },
      },
      required: ['brightness', 'colorTemperature'],
    },
  };

  const ai = new GoogleGenAI({apiKey: GEMINI_API_KEY});
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: 'Dim the lights so the room feels cozy and warm.',
    config: {
      toolConfig: {
        functionCallingConfig: {
          // Force it to call any function
          mode: FunctionCallingConfigMode.ANY,
          allowedFunctionNames: ['controlLight'],
        }
      },
      tools: [{functionDeclarations: [controlLightDeclaration]}]
    }
  });

  console.log(response.functionCalls);
}

main();
Copy
Model Context Protocol (MCP) support (experimental)
Built-in MCP support is an experimental feature. You can pass a local MCP server as a tool directly.

import { GoogleGenAI, FunctionCallingConfigMode , mcpToTool} from '@google/genai';
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

// Create server parameters for stdio connection
const serverParams = new StdioClientTransport({
  command: "npx", // Executable
  args: ["-y", "@philschmid/weather-mcp"] // MCP Server
});

const client = new Client(
  {
    name: "example-client",
    version: "1.0.0"
  }
);

// Configure the client
const ai = new GoogleGenAI({});

// Initialize the connection between client and server
await client.connect(serverParams);

// Send request to the model with MCP tools
const response = await ai.models.generateContent({
  model: "gemini-2.5-flash",
  contents: `What is the weather in London in ${new Date().toLocaleDateString()}?`,
  config: {
    tools: [mcpToTool(client)],  // uses the session, will automatically call the tool using automatic function calling
  },
});
console.log(response.text);

// Close the connection
await client.close();
Copy
Generate Content
How to structure contents argument for generateContent
The SDK allows you to specify the following types in the contents parameter:

Content
Content: The SDK will wrap the singular Content instance in an array which contains only the given content instance
Content[]: No transformation happens
Part
Parts will be aggregated on a singular Content, with role 'user'.

Part | string: The SDK will wrap the string or Part in a Content instance with role 'user'.
Part[] | string[]: The SDK will wrap the full provided list into a single Content with role 'user'.
NOTE: This doesn't apply to FunctionCall and FunctionResponse parts, if you are specifying those, you need to explicitly provide the full Content[] structure making it explicit which Parts are 'spoken' by the model, or the user. The SDK will throw an exception if you try this.

Error Handling
To handle errors raised by the API, the SDK provides this ApiError class.

import {GoogleGenAI} from '@google/genai';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const ai = new GoogleGenAI({apiKey: GEMINI_API_KEY});

async function main() {
  await ai.models.generateContent({
    model: 'non-existent-model',
    contents: 'Write a 100-word poem.',
  }).catch((e) => {
    console.error('error name: ', e.name);
    console.error('error message: ', e.message);
    console.error('error status: ', e.status);
  });
}

main();
Copy
Interactions (Preview)
Warning: The Interactions API is in Beta. This is a preview of an experimental feature. Features and schemas are subject to breaking changes.

The Interactions API is a unified interface for interacting with Gemini models and agents. It simplifies state management, tool orchestration, and long-running tasks.

See the documentation site for more details.

Basic Interaction
const interaction = await ai.interactions.create({
    model: 'gemini-2.5-flash',
    input: 'Hello, how are you?',
});
console.debug(interaction);

Copy
Stateful Conversation
The Interactions API supports server-side state management. You can continue a conversation by referencing the previous_interaction_id.

// 1. First turn
const interaction1 = await ai.interactions.create({
    model: 'gemini-2.5-flash',
    input: 'Hi, my name is Amir.',
});
console.debug(interaction1);

// 2. Second turn (passing previous_interaction_id)
const interaction2 = await ai.interactions.create({
  model: 'gemini-2.5-flash',
  input: 'What is my name?',
  previous_interaction_id: interaction1.id,
});
console.debug(interaction2);

Copy
Agents (Deep Research)
You can use specialized agents like deep-research-pro-preview-12-2025 for complex tasks.

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 1. Start the Deep Research Agent
const initialInteraction = await ai.interactions.create({
  input:
      'Research the history of the Google TPUs with a focus on 2025 and 2026.',
  agent: 'deep-research-pro-preview-12-2025',
  background: true,
});

console.log(`Research started. Interaction ID: ${initialInteraction.id}`);

// 2. Poll for results
while (true) {
  const interaction = await ai.interactions.get(initialInteraction.id);
  console.log(`Status: ${interaction.status}`);

  if (interaction.status === 'completed') {
    console.debug('\nFinal Report:\n', interaction.outputs);
    break;
  } else if (['failed', 'cancelled'].includes(interaction.status)) {
    console.log(`Failed with status: ${interaction.status}`);
    break;
  }

  await sleep(10000);  // Sleep for 10 seconds
}

Copy
Multimodal Input
You can provide multimodal data (text, images, audio, etc.) in the input list.

import base64

// Assuming you have a base64 string
// const base64Image = ...;

const interaction = await ai.interactions.create({
  model: 'gemini-2.5-flash',
  input: [
    { type: 'text', text: 'Describe the image.' },
    { type: 'image', data: base64Image, mime_type: 'image/png' },
  ],
});

console.debug(interaction);

Copy
Function Calling
You can define custom functions for the model to use. The Interactions API handles the tool selection, and you provide the execution result back to the model.

// 1. Define the tool
const getWeather = (location: string) => {
  /* Gets the weather for a given location. */
  return `The weather in ${location} is sunny.`;
};

// 2. Send the request with tools
let interaction = await ai.interactions.create({
  model: 'gemini-2.5-flash',
  input: 'What is the weather in Mountain View, CA?',
  tools: [
    {
      type: 'function',
      name: 'get_weather',
      description: 'Gets the weather for a given location.',
      parameters: {
        type: 'object',
        properties: {
          location: {
            type: 'string',
            description: 'The city and state, e.g. San Francisco, CA',
          },
        },
        required: ['location'],
      },
    },
  ],
});

// 3. Handle the tool call
for (const output of interaction.outputs!) {
  if (output.type === 'function_call') {
    console.log(
        `Tool Call: ${output.name}(${JSON.stringify(output.arguments)})`);

    // Execute your actual function here
    // Note: ensure arguments match your function signature
    const result = getWeather(JSON.stringify(output.arguments.location));

    // Send result back to the model
    interaction = await ai.interactions.create({
      model: 'gemini-2.5-flash',
      previous_interaction_id: interaction.id,
      input: [
        {
          type: 'function_result',
          name: output.name,
          call_id: output.id,
          result: result,
        },
      ],
    });

    console.debug(`Response: ${JSON.stringify(interaction)}`);
  }
}

Copy
Built-in Tools
You can also use Google's built-in tools, such as Google Search or Code Execution.

Grounding with Google Search
const interaction = await ai.interactions.create({
  model: 'gemini-2.5-flash',
  input: 'Who won the last Super Bowl',
  tools: [{ type: 'google_search' }],
});

console.debug(interaction);

Copy
Code Execution
const interaction = await ai.interactions.create({
  model: 'gemini-2.5-flash',
  input: 'Calculate the 50th Fibonacci number.',
  tools: [{ type: 'code_execution' }],
});

console.debug(interaction);

Copy
Multimodal Output
The Interactions API can generate multimodal outputs, such as images. You must specify the response_modalities.

import * as fs from 'fs';

const interaction = await ai.interactions.create({
  model: 'gemini-3-pro-image-preview',
  input: 'Generate an image of a futuristic city.',
  response_modalities: ['image'],
});

for (const output of interaction.outputs!) {
  if (output.type === 'image') {
    console.log(`Generated image with mime_type: ${output.mime_type}`);
    // Save the image
    fs.writeFileSync(
        'generated_city.png', Buffer.from(output.data!, 'base64'));
  }
}

Copy
How is this different from the other Google AI SDKs
This SDK (@google/genai) is Google Deepmind’s "vanilla" SDK for its generative AI offerings, and is where Google Deepmind adds new AI features.

Models hosted either on the Vertex AI platform or the Gemini Developer platform are accessible through this SDK.

Other SDKs may be offering additional AI frameworks on top of this SDK, or may be targeting specific project environments (like Firebase).

The @google/generative_language and @google-cloud/vertexai SDKs are previous iterations of this SDK and are no longer receiving new Gemini 2.0+ features