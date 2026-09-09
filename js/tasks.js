/**
 * Task Management Logic Engine
 */
const TaskManager = (() => {
  const categories = ['Work', 'Personal', 'Projects', 'Shopping', 'Health'];

  function getCategories() {
    return categories;
  }

  function createNewTaskObject(overrides = {}) {
    return {
      id: overrides.id || 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      title: '',
      description: '',
      contents: '',
      category: categories[0],
      priority: 'Medium',
      status: 'Inbox',
      dueDate: '',
      createdDate: new Date().toISOString(),
      updatedDate: new Date().toISOString(),
      completedDate: null,
      progress: 0,
      nextSteps: [],
      ...overrides
    };
  }

  function calculateStepsProgress(steps = []) {
    if (!steps || steps.length === 0) return 0;
    const completedCount = steps.filter(s => s.completed).length;
    return Math.round((completedCount / steps.length) * 100);
  }

  async function toggleStep(taskId, stepId) {
    const task = await StorageManager.getTask(taskId);
    if (!task || !task.nextSteps) return;

    task.nextSteps = task.nextSteps.map(s => {
      if (s.id === stepId) {
        return { ...s, completed: !s.completed };
      }
      return s;
    });

    task.progress = calculateStepsProgress(task.nextSteps);
    if (task.progress === 100) {
      task.status = 'Completed';
      task.completedDate = new Date().toISOString();
    } else if (task.status === 'Completed' && task.progress < 100) {
      task.status = 'In Progress';
      task.completedDate = null;
    }

    task.updatedDate = new Date().toISOString();
    await StorageManager.updateTask(task);
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
      if (task.nextSteps) {
        task.nextSteps = task.nextSteps.map(s => ({ ...s, completed: true }));
      }
    }

    task.updatedDate = new Date().toISOString();
    await StorageManager.updateTask(task);
  }

  function isOverdue(task) {
    if (!task.dueDate || task.status === 'Completed' || task.status === 'Archived') return false;
    const today = new Date().toISOString().slice(0, 10);
    return task.dueDate < today;
  }

  return {
    getCategories,
    createNewTaskObject,
    calculateStepsProgress,
    toggleStep,
    markAsDone,
    isOverdue
  };
})();