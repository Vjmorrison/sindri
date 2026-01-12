import fs from 'fs/promises';
import path from 'path';
import { ProjectSession, DirectoryStructure, ChatMessage } from '../types/project';
import { geminiService } from './gemini.service';
import { randomUUID } from 'crypto';

export class ProjectService {
  private sessions: Map<string, ProjectSession> = new Map();

  async createSession(description: string): Promise<ProjectSession> {
    const id = randomUUID();
    const session: ProjectSession = {
      id,
      description,
      history: [],
      status: 'active',
    };
    
    // Initial BA response
    const initialResponse = await geminiService.chat([], `Hi, I want to start a new project: ${description}`);
    session.history.push({ role: 'model', text: initialResponse });
    
    this.sessions.set(id, session);
    return session;
  }

  getSession(id: string): ProjectSession | undefined {
    return this.sessions.get(id);
  }

  async respond(id: string, text: string): Promise<string> {
    const session = this.sessions.get(id);
    if (!session) throw new Error('Session not found');

    const response = await geminiService.chat(session.history, text);
    session.history.push({ role: 'user', text });
    session.history.push({ role: 'model', text: response });
    
    return response;
  }

  async generateArtifacts(id: string): Promise<DirectoryStructure> {
    const session = this.sessions.get(id);
    if (!session) throw new Error('Session not found');

    const structureJson = await geminiService.generateStructure(session.history);
    
    // Clean up JSON response in case Gemini adds markdown blocks
    const cleanedJson = structureJson.replace(/```json|```/g, '').trim();
    const structure: DirectoryStructure = JSON.parse(cleanedJson);
    
    session.artifacts = structure;
    session.status = 'generating';
    
    return structure;
  }

  async instantiateProject(id: string, targetPath: string): Promise<void> {
    const session = this.sessions.get(id);
    if (!session || !session.artifacts) throw new Error('Session or artifacts not found');

    await this.createFileSystem(session.artifacts, targetPath, session.history);
    session.status = 'completed';
  }

  private async createFileSystem(node: DirectoryStructure, currentPath: string, history: ChatMessage[]): Promise<void> {
    const fullPath = path.join(currentPath, node.name);

    if (node.type === 'directory') {
      await fs.mkdir(fullPath, { recursive: true });
      
      // Create GEMINI.md in each directory
      if (node.description) {
        await fs.writeFile(
          path.join(fullPath, 'GEMINI.md'),
          `# Directory: ${node.name}\n\n${node.description}`
        );
      }

      if (node.children) {
        for (const child of node.children) {
          await this.createFileSystem(child, fullPath, history);
        }
      }
    } else {
      // For files, use LLM to instantiate content
      console.log(`Instantiating file: ${node.name}`);
      let content = await geminiService.instantiateFile(node.name, node.description || '', history);
      
      // Basic cleanup of markdown blocks if any
      content = content.replace(/```[a-z]*\n/g, '').replace(/```/g, '');
      
      await fs.writeFile(fullPath, content);
    }
  }
}

export const projectService = new ProjectService();
