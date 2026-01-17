import { projectService } from './project.service';
import { geminiService } from './gemini.service';
import fs from 'fs/promises';
import { dbService } from '../db/db';

jest.mock('./gemini.service');
jest.mock('fs/promises');

// Mock config to use in-memory DB
jest.mock('../config', () => ({
  config: {
    port: 3000,
    geminiApiKey: 'test-key',
    modelName: 'test-model',
    dbPath: ':memory:',
  }
}));

describe('ProjectService', () => {
  beforeAll(async () => {
    await dbService.init();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    // Clean up DB tables
    await dbService.run('DELETE FROM messages');
    await dbService.run('DELETE FROM artifacts');
    await dbService.run('DELETE FROM sessions');
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
    const updatedSession = await projectService.getSession(session.id);
    expect(updatedSession?.history).toHaveLength(3); // 1 initial + 1 user + 1 model
  });

  it('should generate artifacts structure', async () => {
    const session = await projectService.createSession('A new web app');
    const structure = await projectService.generateArtifacts(session.id);
    
    expect(structure.name).toBe('test-project');
    expect(geminiService.generateStructure).toHaveBeenCalled();

    // Verify it is saved in DB
    const savedSession = await projectService.getSession(session.id);
    expect(savedSession?.artifacts).toBeDefined();
    expect(savedSession?.artifacts?.name).toBe('test-project');
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
