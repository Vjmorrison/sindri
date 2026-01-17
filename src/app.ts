import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger';
import projectRoutes from './routes/project.routes';
import { dbService } from './db/db';

// Initialize Database
dbService.init().catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});

const app: Application = express();

app.use(cors());
app.use(express.json());

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get('/', (req: Request, res: Response) => {
  res.send('Bootstrapper Service is running');
});

app.use('/api/project', projectRoutes);

export const viteNodeApp = app;
