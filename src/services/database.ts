import * as SQLite from 'expo-sqlite';
import { MatchRecord, Player } from '../types';

// Create a single reference to the DB
let dbInstance: SQLite.SQLiteDatabase | null = null;

const getDB = async () => {
  if (!dbInstance) {
    dbInstance = await SQLite.openDatabaseAsync('stickit.db');
  }
  return dbInstance;
};

export const initDB = async () => {
  const db = await getDB();
  
  // await db.execAsync('DROP TABLE IF EXISTS matches;');
  // Create tables
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS players (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS jump_elements (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE);
    CREATE TABLE IF NOT EXISTS jump_orders (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, sequence TEXT);
    
    -- Fixed: Combined match table with events column
    CREATE TABLE IF NOT EXISTS matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT, 
      date TEXT NOT NULL, 
      winner TEXT NOT NULL, 
      participants TEXT NOT NULL, 
      stats TEXT NOT NULL,
      events TEXT NOT NULL
    );
  `);

  // The "Master List" of jumps you requested
  const fullJumpSet = [
    'hurk salto', 'hoek salto', 'strek salto', 
    'hurk 1/2', 'hoek 1/2', 'strek 1/2', 
    'hurk 1/1', 'hoek 1/1', 'strek 1/1', 
    'strek 3/2', 'strek 2/1', 'strek 5/2', 
    'dubbel hurk', 'dubbel hoek', 'dubbel hurk 1/2', 
    'dubbel spreidhoek', 'tchukie'
  ];

  // Insert them safely
  for (const name of fullJumpSet) {
    await db.runAsync('INSERT OR IGNORE INTO jump_elements (name) VALUES (?);', [name]);
  }

};

export const getPlayers = async (): Promise<Player[]> => {
  const db = await getDB();
  return await db.getAllAsync<Player>('SELECT * FROM players ORDER BY name;');
};

export const addPlayer = async (name: string) => {
  const db = await SQLite.openDatabaseAsync('stickit.db');
  await db.runAsync('INSERT INTO players (name) VALUES (?);', [name]);
};

export const deletePlayer = async (id: number) => {
  const db = await SQLite.openDatabaseAsync('stickit.db');
  await db.runAsync('DELETE FROM players WHERE id = ?;', [id]);
};

export const getSavedOrder = async (): Promise<string[]> => {
  const db = await getDB();
  const row = await db.getFirstAsync<{ sequence: string }>(
    'SELECT sequence FROM jump_orders WHERE id = 1'
  );
  return row ? JSON.parse(row.sequence) : [];
};

export const saveMatch = async (record: Omit<MatchRecord, 'id'>) => {
  const db = await getDB();
  await db.runAsync(
    'INSERT INTO matches (date, winner, participants, stats, events) VALUES (?, ?, ?, ?, ?);',
    [
      record.date,
      record.winner,
      JSON.stringify(record.participants),
      JSON.stringify(record.stats),
      JSON.stringify(record.events), // New: Detailed turn-by-turn data
    ]
  );
};

// Add this to your existing database.ts
export const getJumpLibrary = async (): Promise<string[]> => {
  const db = await getDB(); // Uses your existing singleton connection
  const elements = await db.getAllAsync<{ name: string }>('SELECT name FROM jump_elements ORDER BY name ASC');
  return elements.map(e => e.name);
};

export const getMatchHistory = async (): Promise<MatchRecord[]> => {
  const db = await getDB();
  const rows = await db.getAllAsync<any>('SELECT * FROM matches ORDER BY date DESC;');
  
  return rows.map((row) => ({
    ...row,
    participants: JSON.parse(row.participants),
    stats: JSON.parse(row.stats),
    events: JSON.parse(row.events), // Added: Parse events
  }));
};