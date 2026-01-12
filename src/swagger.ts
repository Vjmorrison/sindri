import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Bootstrapper API',
      version: '1.0.0',
      description: 'API documentation for the Bootstrapper microservice, which uses Gemini GenAI to help users define and instantiate software projects.',
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Local server',
      },
    ],
  },
  apis: ['./src/routes/*.ts'], // Path to the API docs
};

export const swaggerSpec = swaggerJsdoc(options);
