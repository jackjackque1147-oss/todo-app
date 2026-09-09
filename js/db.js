/**
 * IndexedDB Wrapper / StorageManager Interface
 */
const StorageManager = (() => {
  const DB_NAME = 'TodoPWA_DB';
  const DB_VERSION = 1;
  const STORE_NAME = 'tasks';
  let db = null;

  function openDB() {
    return new Promise((resolve, reject) => {
      if (db) return resolve(db);
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = (e) => reject('Database error: ' + e.target.errorCode);
      request.onsuccess = (e) => {
        db = e.target.result;
        resolve(db);
      };
      request.onupgradeneeded = (e) => {
        const database = e.target.result;
        if (!database.objectStoreNames.contains(STORE_NAME)) {
          const store = database.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('status', 'status', { unique: false });
          store.createIndex('category', 'category', { unique: false });
          store.createIndex('priority', 'priority', { unique: false });
          store.createIndex('dueDate', 'dueDate', { unique: false });
        }
      };
    });
  }

  async function addTask(task) {
    const database = await openDB();
    return new Promise((resolve, reject) => {
      const tx = database.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.add(task);
      req.onsuccess = () => resolve(task);
      req.onerror = () => reject('Failed to add task');
    });
  }

  async function updateTask(task) {
    const database = await openDB();
    return new Promise((resolve, reject) => {
      const tx = database.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(task);
      req.onsuccess = () => resolve(task);
      req.onerror = () => reject('Failed to update task');
    });
  }

  async function deleteTask(id) {
    const database = await openDB();
    return new Promise((resolve, reject) => {
      const tx = database.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve(id);
      req.onerror = () => reject('Failed to delete task');
    });
  }

  async function getTask(id) {
    const database = await openDB();
    return new Promise((resolve, reject) => {
      const tx = database.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject('Failed to get task');
    });
  }

  async function getTasks() {
    const database = await openDB();
    return new Promise((resolve, reject) => {
      const tx = database.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject('Failed to fetch tasks');
    });
  }

  async function exportData() {
    const tasks = await getTasks();
    const categories = JSON.parse(localStorage.getItem('todo_categories') || '[]');
    return JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), tasks, categories }, null, 2);
  }

  async function importData(jsonString, merge = false) {
    try {
      const data = JSON.parse(jsonString);
      if (!data || !Array.isArray(data.tasks)) throw new Error('Invalid JSON schema');

      const database = await openDB();
      if (!merge) {
        const txClear = database.transaction(STORE_NAME, 'readwrite');
        await new Promise((res) => {
          txClear.objectStore(STORE_NAME).clear().onsuccess = () => res();
        });
      }

      const tx = database.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      for (const task of data.tasks) {
        store.put(task);
      }

      if (data.categories && Array.isArray(data.categories)) {
        const existing = JSON.parse(localStorage.getItem('todo_categories') || '[]');
        const updated = merge ? Array.from(new Set([...existing, ...data.categories])) : data.categories;
        localStorage.setItem('todo_categories', JSON.stringify(updated));
      }

      return true;
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  async function clearAllData() {
    const database = await openDB();
    const tx = database.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).clear();
  }

  return {
    addTask,
    updateTask,
    deleteTask,
    getTask,
    getTasks,
    exportData,
    importData,
    clearAllData
  };
})();