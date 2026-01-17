import fs from 'fs/promises';
import path from 'path';
import { ProjectSession, DirectoryStructure, ChatMessage } from '../types/project';
import { geminiService } from './gemini.service';
import { projectRepository } from '../repositories/project.repository';

export class ProjectService {

  async createSession(description: string): Promise<ProjectSession> {
    const session = await projectRepository.createSession(description);
    
    // Initial BA response
    const initialResponse = await geminiService.chat([], `Hi, I want to start a new project: ${description}`);
    
    const message: ChatMessage = { role: 'model', text: initialResponse };
    await projectRepository.addMessage(session.id, message);
    session.history.push(message);

    return session;
  }

  async getSession(id: string): Promise<ProjectSession | undefined> {
    return await projectRepository.getSession(id);
  }

  async respond(id: string, text: string): Promise<string> {
    const session = await projectRepository.getSession(id);
    if (!session) throw new Error('Session not found');

    const userMsg: ChatMessage = { role: 'user', text };
    await projectRepository.addMessage(id, userMsg);
    // Add to history context for next call
    session.history.push(userMsg);

    const response = await geminiService.chat(session.history, text);

    const modelMsg: ChatMessage = { role: 'model', text: response };
    await projectRepository.addMessage(id, modelMsg);
    
    return response;
  }

  async generateArtifacts(id: string): Promise<DirectoryStructure> {
    const session = await projectRepository.getSession(id);
    if (!session) throw new Error('Session not found');

    const structureJson = await geminiService.generateStructure(session.history);
    
    // Clean up JSON response in case Gemini adds markdown blocks
    const cleanedJson = structureJson.replace(/```json|```/g, '').trim();
    const structure: DirectoryStructure = JSON.parse(cleanedJson);
    
    await projectRepository.saveArtifacts(id, structure);
    await projectRepository.updateStatus(id, 'generating');
    
    return structure;
  }

  async instantiateProject(id: string, targetPath: string): Promise<void> {
    const session = await projectRepository.getSession(id);
    if (!session || !session.artifacts) throw new Error('Session or artifacts not found');

    await this.createFileSystem(session.artifacts, targetPath, session.history);
    await projectRepository.updateStatus(id, 'completed');
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
