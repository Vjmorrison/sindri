import sqlite3 from 'sqlite3';
import { config } from '../config';
import { migrations } from './migrations';

class DatabaseService {
  private db: sqlite3.Database | null = null;

  async init(): Promise<void> {
    if (this.db) return;

    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(config.dbPath, (err) => {
        if (err) {
          console.error('Error opening database:', err);
          reject(err);
        } else {
          console.log('Connected to SQLite database at', config.dbPath);
          this.runMigrations().then(resolve).catch(reject);
        }
      });
    });
  }

  getDb(): sqlite3.Database {
    if (!this.db) {
      throw new Error('Database not initialized. Call init() first.');
    }
    return this.db;
  }

  private async runMigrations(): Promise<void> {
    const db = this.getDb();

    return new Promise((resolve, reject) => {
      // 1. Create migrations table
      db.run(`
        CREATE TABLE IF NOT EXISTS migrations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) return reject(err);

        // 2. Get applied migrations
        db.all('SELECT name FROM migrations', [], async (err, rows: any[]) => {
          if (err) return reject(err);

          const applied = new Set(rows.map(r => r.name));

          try {
            for (const migration of migrations) {
              if (!applied.has(migration.name)) {
                console.log(`Applying migration: ${migration.name}`);

                await new Promise<void>((res, rej) => {
                  db.serialize(() => {
                    // Remove the redundant migrations table creation from the migration script
                    // if it causes issues, but IF NOT EXISTS is safe.

                    db.exec(migration.up, (err) => {
                      if (err) return rej(err);

                      db.run('INSERT INTO migrations (name) VALUES (?)', [migration.name], (err) => {
                        if (err) return rej(err);
                        res();
                      });
                    });
                  });
                });
              }
            }
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      });
    });
  }

  // Helper for running queries as Promises
  async query(sql: string, params: any[] = []): Promise<any[]> {
    const db = this.getDb();
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  async run(sql: string, params: any[] = []): Promise<{ id: number; changes: number }> {
    const db = this.getDb();
    return new Promise((resolve, reject) => {
      db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, changes: this.changes });
      });
    });
  }

  async get(sql: string, params: any[] = []): Promise<any> {
    const db = this.getDb();
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }
}

export const dbService = new DatabaseService();
