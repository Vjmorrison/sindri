import { DatabaseService } from './db';

// Mock config
jest.mock('../config', () => ({
  config: {
    dbPath: ':memory:',
  }
}));

describe('DatabaseService', () => {
  let dbService: DatabaseService;

  beforeEach(() => {
    dbService = new DatabaseService();
  });

  afterEach(async () => {
    // Close DB connection if needed, though DatabaseService doesn't expose close()
    // and using :memory: usually cleans up itself when the object is garbage collected
    // or we can just let it be for now since it is unit test.
  });

  describe('init', () => {
    it('should initialize the database', async () => {
      await expect(dbService.init()).resolves.toBeUndefined();

      // Verify tables are created (migrations ran)
      const tables = await dbService.query("SELECT name FROM sqlite_master WHERE type='table' AND name='migrations'");
      expect(tables).toHaveLength(1);
      expect(tables[0].name).toBe('migrations');
    });

    it('should be idempotent (safe to call multiple times)', async () => {
      await dbService.init();
      await expect(dbService.init()).resolves.toBeUndefined();
    });
  });

  describe('operations', () => {
    beforeEach(async () => {
      await dbService.init();
      // create a test table
      await dbService.run('CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT)');
    });

    describe('run', () => {
      it('should execute INSERT and return lastID', async () => {
        const result = await dbService.run('INSERT INTO test (name) VALUES (?)', ['test_item']);
        expect(result.id).toBe(1);
        expect(result.changes).toBe(1);
      });

      it('should execute UPDATE and return changes', async () => {
        await dbService.run('INSERT INTO test (name) VALUES (?)', ['test_item']);
        const result = await dbService.run('UPDATE test SET name = ? WHERE id = ?', ['updated_item', 1]);
        expect(result.changes).toBe(1);
      });

      it('should handle errors', async () => {
        await expect(dbService.run('INSERT INTO non_existent_table (name) VALUES (?)', ['test']))
          .rejects.toThrow();
      });
    });

    describe('get', () => {
      it('should retrieve a single row', async () => {
        await dbService.run('INSERT INTO test (name) VALUES (?)', ['row1']);
        const row = await dbService.get('SELECT * FROM test WHERE id = ?', [1]);
        expect(row).toEqual({ id: 1, name: 'row1' });
      });

      it('should return undefined if no row found', async () => {
        const row = await dbService.get('SELECT * FROM test WHERE id = ?', [999]);
        expect(row).toBeUndefined();
      });

      it('should handle errors', async () => {
        await expect(dbService.get('SELECT * FROM non_existent_table'))
          .rejects.toThrow();
      });
    });

    describe('query (all)', () => {
      it('should retrieve multiple rows', async () => {
        await dbService.run('INSERT INTO test (name) VALUES (?)', ['row1']);
        await dbService.run('INSERT INTO test (name) VALUES (?)', ['row2']);

        const rows = await dbService.query('SELECT * FROM test ORDER BY id');
        expect(rows).toHaveLength(2);
        expect(rows[0]).toEqual({ id: 1, name: 'row1' });
        expect(rows[1]).toEqual({ id: 2, name: 'row2' });
      });

      it('should return empty array if no rows found', async () => {
        const rows = await dbService.query('SELECT * FROM test WHERE id = ?', [999]);
        expect(rows).toEqual([]);
      });

      it('should handle errors', async () => {
        await expect(dbService.query('SELECT * FROM non_existent_table'))
          .rejects.toThrow();
      });
    });
  });
});
