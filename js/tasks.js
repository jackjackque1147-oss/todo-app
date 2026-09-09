/**
 * Business Logic & Task Operations Manager
 */
const TaskManager = (() => {
  const DEFAULT_CATEGORIES = ['Work', 'Personal', 'Projects', 'Programming', 'Website', 'Finance', 'Ideas', 'Other'];

  function initCategories() {
    if (!localStorage.getItem('todo_categories')) {
      localStorage.setItem('todo_categories', JSON.stringify(DEFAULT_CATEGORIES));
    }
  }

  function getCategories() {
    initCategories();
    return JSON.parse(localStorage.getItem('todo_categories'));
  }

  function addCategory(cat) {
    const cats = getCategories();
    if (cat && !cats.includes(cat)) {
      cats.push(cat);
      localStorage.setItem('todo_categories', JSON.stringify(cats));
    }
  }

  function createNewTaskObject(data = {}) {
    const now = new Date().toISOString();
    return {
      id: data.id || 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      title: data.title || '',
      description: data.description || '',
      contents: data.contents || '',
      category: data.category || 'Personal',
      priority: data.priority || 'Medium',
      status: data.status || 'Inbox',
      startDate: data.startDate || '',
      dueDate: data.dueDate || '',
      nextStep: data.nextStep || '',
      notes: data.notes || '',
      tags: data.tags || [],
      checklist: data.checklist || [],
      progress: data.progress || 0,
      createdDate: data.createdDate || now,
      updatedDate: now,
      completedDate: data.completedDate || null
    };
  }

  function calculateChecklistProgress(checklist) {
    if (!checklist || checklist.length === 0) return null;
    const completed = checklist.filter(item => item.completed).length;
    return Math.round((completed / checklist.length) * 100);
  }

  function isOverdue(task) {
    if (!task.dueDate || task.status === 'Completed' || task.status === 'Archived') return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(task.dueDate);
    return due < today;
  }

  async function markAsDone(taskId) {
    const task = await StorageManager.getTask(taskId);
    if (!task) return;

    if (task.status === 'Completed') {
      task.status = 'In Progress';
      task.completedDate = null;
    } else {
      task.status = 'Completed';
      task.completedDate = new Date().toISOString();
      task.progress = 100;
      if (task.checklist && task.checklist.length > 0) {
        task.checklist.forEach(i => i.completed = true);
      }
    }
    task.updatedDate = new Date().toISOString();
    await StorageManager.updateTask(task);
    return task;
  }

  return {
    getCategories,
    addCategory,
    createNewTaskObject,
    calculateChecklistProgress,
    isOverdue,
    markAsDone
  };
})();