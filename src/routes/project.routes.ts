import { Router, Request, Response } from 'express';
import { projectService } from '../services/project.service';
import path from 'path';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     ProjectSession:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: The session ID
 *         description:
 *           type: string
 *           description: The initial project description
 *         history:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               role:
 *                 type: string
 *               text:
 *                 type: string
 *         status:
 *           type: string
 *           enum: [active, generating, completed]
 *     DirectoryStructure:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *         type:
 *           type: string
 *           enum: [directory, file]
 *         children:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/DirectoryStructure'
 *         description:
 *           type: string
 */

/**
 * @swagger
 * /api/project/kickoff:
 *   post:
 *     summary: Start a new project session
 *     tags: [Project]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - description
 *             properties:
 *               description:
 *                 type: string
 *                 description: Vague description of the software project
 *                 example: "I want to build a simple todo list app with a backend"
 *     responses:
 *       200:
 *         description: The created project session
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProjectSession'
 *       400:
 *         description: Missing description
 *       500:
 *         description: Server error
 */
router.post('/kickoff', async (req: Request, res: Response) => {
  try {
    const { description } = req.body;
    if (!description) return res.status(400).json({ error: 'Description is required' });

    const session = await projectService.createSession(description);
    res.json(session);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/project/respond:
 *   post:
 *     summary: Respond to the Business Analyst's questions
 *     tags: [Project]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id
 *               - text
 *             properties:
 *               id:
 *                 type: string
 *                 description: The session ID
 *               text:
 *                 type: string
 *                 description: User's answer to the question
 *                 example: "I want to use Node.js and MongoDB"
 *     responses:
 *       200:
 *         description: The AI's response (next question or conclusion)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 response:
 *                   type: string
 *       400:
 *         description: Missing ID or text
 *       500:
 *         description: Server error
 */
router.post('/respond', async (req: Request, res: Response) => {
  try {
    const { id, text } = req.body;
    if (!id || !text) return res.status(400).json({ error: 'ID and text are required' });

    const response = await projectService.respond(id, text);
    res.json({ response });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/project/generate-artifacts:
 *   post:
 *     summary: Generate the directory structure and descriptions
 *     tags: [Project]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id
 *             properties:
 *               id:
 *                 type: string
 *                 description: The session ID
 *     responses:
 *       200:
 *         description: The generated directory structure
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DirectoryStructure'
 *       400:
 *         description: Missing ID
 *       500:
 *         description: Server error
 */
router.post('/generate-artifacts', async (req: Request, res: Response) => {
  try {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'ID is required' });

    const structure = await projectService.generateArtifacts(id);
    res.json(structure);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/project/instantiate:
 *   post:
 *     summary: Instantiate the project files with generated code
 *     tags: [Project]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id
 *               - targetDir
 *             properties:
 *               id:
 *                 type: string
 *                 description: The session ID
 *               targetDir:
 *                 type: string
 *                 description: Directory path to create the project in
 *                 example: "my-new-project"
 *     responses:
 *       200:
 *         description: Success message
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 path:
 *                   type: string
 *       400:
 *         description: Missing ID or targetDir
 *       500:
 *         description: Server error
 */
router.post('/instantiate', async (req: Request, res: Response) => {
  try {
    const { id, targetDir } = req.body;
    if (!id || !targetDir) return res.status(400).json({ error: 'ID and targetDir are required' });

    // Ensure targetDir is an absolute path or relative to a safe base
    const absolutePath = path.isAbsolute(targetDir) 
      ? targetDir 
      : path.join(process.cwd(), 'output', targetDir);

    await projectService.instantiateProject(id, absolutePath);
    res.json({ message: 'Project instantiated successfully', path: absolutePath });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/project/session/{id}:
 *   get:
 *     summary: Get session details
 *     tags: [Project]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The session ID
 *     responses:
 *       200:
 *         description: The project session
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProjectSession'
 *       404:
 *         description: Session not found
 */
router.get('/session/:id', async (req: Request, res: Response) => {
  try {
    const session = await projectService.getSession(req.params.id as string);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    res.json(session);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
