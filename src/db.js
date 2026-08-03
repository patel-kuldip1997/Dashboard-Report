import { openDB } from 'idb';

const DB_NAME = 'gscscl-reports-db';
const DB_VERSION = 1;
const STORE_NAME = 'history_reports';

const initDB = async () => {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        store.createIndex('timestamp', 'timestamp');
      }
    },
  });
};

export const saveHistoryReport = async (reportData) => {
  const db = await initDB();
  const report = {
    ...reportData,
    timestamp: Date.now(), // used for sorting
  };
  return db.add(STORE_NAME, report);
};

export const getHistoryReports = async () => {
  const db = await initDB();
  const reports = await db.getAll(STORE_NAME);
  // Return sorted by newest first
  return reports.sort((a, b) => b.timestamp - a.timestamp);
};

export const getHistoryReport = async (id) => {
  const db = await initDB();
  return db.get(STORE_NAME, id);
};

export const deleteHistoryReport = async (id) => {
  const db = await initDB();
  return db.delete(STORE_NAME, id);
};
