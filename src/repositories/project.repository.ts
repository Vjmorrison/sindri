import { dbService } from '../db/db';
import { ProjectSession, ChatMessage, DirectoryStructure } from '../types/project';
import { randomUUID } from 'crypto';

export class ProjectRepository {
  async createSession(description: string): Promise<ProjectSession> {
    const id = randomUUID();
    const status = 'active';

    await dbService.run(
      'INSERT INTO sessions (id, description, status) VALUES (?, ?, ?)',
      [id, description, status]
    );

    return {
      id,
      description,
      status,
      history: []
    };
  }

  async getSession(id: string): Promise<ProjectSession | undefined> {
    const sessionRow = await dbService.get('SELECT * FROM sessions WHERE id = ?', [id]);
    if (!sessionRow) return undefined;

    const messageRows = await dbService.query(
      'SELECT role, text FROM messages WHERE session_id = ? ORDER BY id ASC',
      [id]
    );

    const artifactRows = await dbService.query(
      'SELECT * FROM artifacts WHERE session_id = ?',
      [id]
    );

    const session: ProjectSession = {
      id: sessionRow.id,
      description: sessionRow.description,
      status: sessionRow.status as any,
      history: messageRows.map(row => ({ role: row.role, text: row.text } as ChatMessage))
    };

    if (artifactRows.length > 0) {
      session.artifacts = this.reconstructArtifacts(artifactRows);
    }

    return session;
  }

  async addMessage(sessionId: string, message: ChatMessage): Promise<void> {
    await dbService.run(
      'INSERT INTO messages (session_id, role, text) VALUES (?, ?, ?)',
      [sessionId, message.role, message.text]
    );
  }

  async updateStatus(sessionId: string, status: string): Promise<void> {
    await dbService.run(
      'UPDATE sessions SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [status, sessionId]
    );
  }

  async saveArtifacts(sessionId: string, rootNode: DirectoryStructure): Promise<void> {
    try {
      await dbService.run('BEGIN TRANSACTION');

      // Clear existing artifacts for this session to avoid duplicates if regenerated
      await dbService.run('DELETE FROM artifacts WHERE session_id = ?', [sessionId]);

      await this.insertArtifactNode(sessionId, rootNode, null);

      await dbService.run('COMMIT');
    } catch (error) {
      await dbService.run('ROLLBACK');
      throw error;
    }
  }

  private async insertArtifactNode(sessionId: string, node: DirectoryStructure, parentId: number | null): Promise<void> {
    const result = await dbService.run(
      'INSERT INTO artifacts (session_id, parent_id, name, type, description) VALUES (?, ?, ?, ?, ?)',
      [sessionId, parentId, node.name, node.type, node.description || null]
    );

    const nodeId = result.id;

    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        await this.insertArtifactNode(sessionId, child, nodeId);
      }
    }
  }

  private reconstructArtifacts(rows: any[]): DirectoryStructure | undefined {
    const nodeMap = new Map<number, DirectoryStructure & { id: number; parent_id: number | null }>();

    // First pass: create objects
    rows.forEach(row => {
      nodeMap.set(row.id, {
        id: row.id,
        parent_id: row.parent_id,
        name: row.name,
        type: row.type as 'directory' | 'file',
        description: row.description || undefined,
        children: row.type === 'directory' ? [] : undefined
      });
    });

    let root: (DirectoryStructure & { id: number; parent_id: number | null }) | undefined = undefined;

    // Second pass: link children
    nodeMap.forEach(node => {
      if (node.parent_id === null) {
        root = node;
      } else {
        const parent = nodeMap.get(node.parent_id);
        if (parent && parent.children) {
          parent.children.push(node);
        }
      }
    });

    if (!root) return undefined;

    // Helper to strip internal DB fields if needed, or we just return the object
    // Since strict return type might complain about extra fields if not casted
    return this.cleanNode(root);
  }

  private cleanNode(node: any): DirectoryStructure {
    const { id, parent_id, ...rest } = node;
    if (rest.children) {
      rest.children = rest.children.map((child: any) => this.cleanNode(child));
    }
    return rest as DirectoryStructure;
  }
}

export const projectRepository = new ProjectRepository();
