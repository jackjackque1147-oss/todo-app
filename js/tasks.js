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

  /**
   * Generates a new Task Object with support for multiple next steps/subtasks
   */
  function createNewTaskObject(data = {}) {
    const now = new Date().toISOString();
    
    // Normalizes input steps to ensure correct structure [{ id, text, completed }]
    const formattedSteps = (data.nextSteps || data.checklist || []).map((step, index) => {
      if (typeof step === 'string') {
        return { id: 'step_' + Date.now() + '_' + index, text: step, completed: false };
      }
      return {
        id: step.id || 'step_' + Date.now() + '_' + index,
        text: step.text || step.title || '',
        completed: Boolean(step.completed)
      };
    });

    const initialProgress = calculateStepsProgress(formattedSteps) ?? (data.progress || 0);

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
      // Array holding multiple actionable sub-steps
      nextSteps: formattedSteps,
      notes: data.notes || '',
      tags: data.tags || [],
      progress: initialProgress,
      createdDate: data.createdDate || now,
      updatedDate: now,
      completedDate: data.completedDate || null
    };
  }

  /**
   * Calculates completion progress percentage from step array
   */
  function calculateStepsProgress(nextSteps) {
    if (!nextSteps || nextSteps.length === 0) return 0;
    const completed = nextSteps.filter(step => step.completed).length;
    return Math.round((completed / nextSteps.length) * 100);
  }

  /**
   * Toggles an individual step within a task and recalculates progress
   */
  function toggleStep(taskId, stepId) {
    return StorageManager.getTask(taskId).then(async (task) => {
      if (!task || !task.nextSteps) return null;

      const step = task.nextSteps.find(s => s.id === stepId);
      if (step) {
        step.completed = !step.completed;
        
        // Update task progress based on new step state
        task.progress = calculateStepsProgress(task.nextSteps);
        
        // Auto-complete task when all steps are done
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
      return task;
    });
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
      task.progress = calculateStepsProgress(task.nextSteps);
    } else {
      task.status = 'Completed';
      task.completedDate = new Date().toISOString();
      task.progress = 100;
      
      // Mark all inner sub-steps as completed
      if (task.nextSteps && task.nextSteps.length > 0) {
        task.nextSteps.forEach(s => s.completed = true);
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
    calculateStepsProgress,
    toggleStep,
    isOverdue,
    markAsDone
  };
})();