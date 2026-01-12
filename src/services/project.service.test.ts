import { projectService } from './project.service';
import { geminiService } from './gemini.service';
import fs from 'fs/promises';

jest.mock('./gemini.service');
jest.mock('fs/promises');

describe('ProjectService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create a session and return initial response', async () => {
    const session = await projectService.createSession('A new web app');
    expect(session.id).toBeDefined();
    expect(session.history).toHaveLength(1);
    expect(session.history[0].role).toBe('model');
    expect(geminiService.chat).toHaveBeenCalled();
  });

  it('should handle responses and update history', async () => {
    const session = await projectService.createSession('A new web app');
    const response = await projectService.respond(session.id, 'I want it to use React');
    
    expect(response).toBe('Mocked BA response');
    const updatedSession = projectService.getSession(session.id);
    expect(updatedSession?.history).toHaveLength(3); // 1 initial + 1 user + 1 model
  });

  it('should generate artifacts structure', async () => {
    const session = await projectService.createSession('A new web app');
    const structure = await projectService.generateArtifacts(session.id);
    
    expect(structure.name).toBe('test-project');
    expect(geminiService.generateStructure).toHaveBeenCalled();
  });

  it('should instantiate project files', async () => {
    const session = await projectService.createSession('A new web app');
    await projectService.generateArtifacts(session.id);
    await projectService.instantiateProject(session.id, '/tmp/test');
    
    expect(fs.mkdir).toHaveBeenCalled();
    expect(fs.writeFile).toHaveBeenCalled();
    expect(geminiService.instantiateFile).toHaveBeenCalled();
  });
});
