import * as SQLite from 'expo-sqlite';

import { MatchRecord, Player } from '../types';

export const db = SQLite.openDatabase('stickit.db');

const executeSqlAsync = (sql: string, params: (string | number)[] = []) =>
  new Promise<SQLite.SQLResultSet>((resolve, reject) => {
    db.transaction((transaction) => {
      transaction.executeSql(
        sql,
        params,
        (_, result) => resolve(result),
        (_, error) => {
          reject(error);
          return false;
        }
      );
    });
  });

export const initDB = async () => {
  await executeSqlAsync(
    'CREATE TABLE IF NOT EXISTS players (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL);'
  );
  await executeSqlAsync(
    'CREATE TABLE IF NOT EXISTS matches (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT NOT NULL, winner TEXT NOT NULL, participants TEXT NOT NULL, stats TEXT NOT NULL);'
  );
};

export const getPlayers = async (): Promise<Player[]> => {
  const result = await executeSqlAsync('SELECT * FROM players ORDER BY name;');
  return result.rows._array as Player[];
};

export const addPlayer = async (name: string) => {
  await executeSqlAsync('INSERT INTO players (name) VALUES (?);', [name]);
};

export const deletePlayer = async (id: number) => {
  await executeSqlAsync('DELETE FROM players WHERE id = ?;', [id]);
};

export const saveMatch = async (record: Omit<MatchRecord, 'id'>) => {
  await executeSqlAsync(
    'INSERT INTO matches (date, winner, participants, stats) VALUES (?, ?, ?, ?);',
    [
      record.date,
      record.winner,
      JSON.stringify(record.participants),
      JSON.stringify(record.stats),
    ]
  );
};

export const getMatchHistory = async (): Promise<MatchRecord[]> => {
  const result = await executeSqlAsync('SELECT * FROM matches ORDER BY date DESC;');
  return result.rows._array.map((row: any) => ({
    id: row.id,
    date: row.date,
    winner: row.winner,
    participants: JSON.parse(row.participants),
    stats: JSON.parse(row.stats),
  })) as MatchRecord[];
};
