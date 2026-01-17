import { projectRepository } from './project.repository';
import { dbService } from '../db/db';
import { DirectoryStructure, ChatMessage } from '../types/project';

// Mock config to use in-memory DB
jest.mock('../config', () => ({
  config: {
    dbPath: ':memory:',
  }
}));

describe('ProjectRepository', () => {
  beforeAll(async () => {
    await dbService.init();
  });

  beforeEach(async () => {
    // Clean up tables
    await dbService.run('DELETE FROM artifacts');
    await dbService.run('DELETE FROM messages');
    await dbService.run('DELETE FROM sessions');
  });

  describe('createSession', () => {
    it('should create a new session', async () => {
      const session = await projectRepository.createSession('Test Session');

      expect(session.id).toBeDefined();
      expect(session.description).toBe('Test Session');
      expect(session.status).toBe('active');
      expect(session.history).toEqual([]);

      // Verify in DB
      const row = await dbService.get('SELECT * FROM sessions WHERE id = ?', [session.id]);
      expect(row).toBeDefined();
      expect(row.description).toBe('Test Session');
    });
  });

  describe('getSession', () => {
    it('should return undefined for non-existent session', async () => {
      const session = await projectRepository.getSession('non-existent-id');
      expect(session).toBeUndefined();
    });

    it('should retrieve an existing session', async () => {
      const created = await projectRepository.createSession('Test Session');
      const retrieved = await projectRepository.getSession(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.description).toBe('Test Session');
    });

    it('should include messages history', async () => {
      const session = await projectRepository.createSession('Test Session');
      const message: ChatMessage = { role: 'user', text: 'Hello' };

      await projectRepository.addMessage(session.id, message);

      const retrieved = await projectRepository.getSession(session.id);
      expect(retrieved?.history).toHaveLength(1);
      expect(retrieved?.history[0]).toEqual(message);
    });
  });

  describe('addMessage', () => {
    it('should add a message to the session', async () => {
      const session = await projectRepository.createSession('Test Session');
      await projectRepository.addMessage(session.id, { role: 'user', text: 'Hello' });
      await projectRepository.addMessage(session.id, { role: 'model', text: 'Hi' });

      const retrieved = await projectRepository.getSession(session.id);
      expect(retrieved?.history).toHaveLength(2);
      expect(retrieved?.history[0]).toEqual({ role: 'user', text: 'Hello' });
      expect(retrieved?.history[1]).toEqual({ role: 'model', text: 'Hi' });
    });
  });

  describe('updateStatus', () => {
    it('should update session status', async () => {
      const session = await projectRepository.createSession('Test Session');
      expect(session.status).toBe('active');

      await projectRepository.updateStatus(session.id, 'completed');

      const retrieved = await projectRepository.getSession(session.id);
      expect(retrieved?.status).toBe('completed');
    });
  });

  describe('saveArtifacts and retrieve', () => {
    const mockStructure: DirectoryStructure = {
      name: 'root',
      type: 'directory',
      children: [
        {
          name: 'src',
          type: 'directory',
          children: [
            {
              name: 'index.ts',
              type: 'file',
              description: 'console.log("hello")'
            }
          ]
        },
        {
          name: 'readme.md',
          type: 'file',
          description: '# Readme'
        }
      ]
    };

    it('should save and retrieve artifacts structure', async () => {
      const session = await projectRepository.createSession('Test Session');

      await projectRepository.saveArtifacts(session.id, mockStructure);

      const retrieved = await projectRepository.getSession(session.id);
      expect(retrieved?.artifacts).toBeDefined();

      // We expect the structure to match, but we need to check if the recursive reconstruction works
      // Note: The retrieved object might have properties in different order, so toEqual is best.
      expect(retrieved?.artifacts).toEqual(mockStructure);
    });

    it('should overwrite existing artifacts when saving again', async () => {
      const session = await projectRepository.createSession('Test Session');

      await projectRepository.saveArtifacts(session.id, mockStructure);

      const newStructure: DirectoryStructure = {
        name: 'new-root',
        type: 'directory',
        children: []
      };

      await projectRepository.saveArtifacts(session.id, newStructure);

      const retrieved = await projectRepository.getSession(session.id);
      expect(retrieved?.artifacts).toEqual(newStructure);

      // Check that old artifacts are gone from DB (count rows)
      const rows = await dbService.query('SELECT * FROM artifacts WHERE session_id = ?', [session.id]);
      expect(rows).toHaveLength(1); // Only 'new-root'
      expect(rows[0].name).toBe('new-root');
    });
  });
});
