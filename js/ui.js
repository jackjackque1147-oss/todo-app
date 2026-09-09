/**
 * UI Controller & Rendering Engine
 */
const UIController = (() => {
  let currentView = 'dashboard';
  let activeCategory = null;
  let activeSearch = '';
  let activeFilterStatus = 'All';
  let activeFilterPriority = 'All';
  let activeSort = 'recently-created';

  // Temporary container for subtasks while creating/editing a task in the modal
  let modalSteps = [];

  const viewContainer = document.getElementById('view-container');
  const modalOverlay = document.getElementById('modal-overlay');
  const modalContent = document.getElementById('modal-content');

  function init() {
    renderCategoryList();
    setupGlobalEvents();
  }

  function setupGlobalEvents() {
    document.querySelectorAll('[data-view]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const view = e.currentTarget.getAttribute('data-view');
        switchView(view);
      });
    });

    const searchInput = document.getElementById('global-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        activeSearch = e.target.value.toLowerCase();
        renderCurrentView();
      });
    }

    const quickAddBtn = document.getElementById('quick-add-btn');
    if (quickAddBtn) quickAddBtn.addEventListener('click', () => openTaskModal());

    const mobileAddBtn = document.getElementById('mobile-add-btn');
    if (mobileAddBtn) mobileAddBtn.addEventListener('click', () => openTaskModal());

    if (modalOverlay) {
      modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeModal();
      });
    }
  }

  function renderCategoryList() {
    const catContainer = document.getElementById('category-list');
    if (!catContainer) return;

    const categories = TaskManager.getCategories();
    catContainer.innerHTML = categories.map(cat => `
      <div class="cat-item ${activeCategory === cat ? 'active' : ''}" onclick="UIController.filterByCategory('${escapeHtml(cat)}')">
        <span>${escapeHtml(cat)}</span>
      </div>
    `).join('');
  }

  function filterByCategory(cat) {
    activeCategory = activeCategory === cat ? null : cat;
    renderCategoryList();
    if (currentView !== 'tasks') switchView('tasks');
    else renderCurrentView();
  }

  function switchView(view) {
    currentView = view;
    document.querySelectorAll('.nav-btn, .bottom-btn').forEach(btn => {
      if (btn.getAttribute('data-view') === view) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
    renderCurrentView();
  }

  async function renderCurrentView() {
    const allTasks = await StorageManager.getTasks();
    let filteredTasks = filterTasks(allTasks);

    switch (currentView) {
      case 'dashboard':
        renderDashboard(allTasks, filteredTasks);
        break;
      case 'tasks':
        renderTaskListView('All Tasks', filteredTasks);
        break;
      case 'next-actions':
        renderTaskListView('Next Actions', filteredTasks.filter(t => t.nextSteps && t.nextSteps.some(s => !s.completed) && t.status !== 'Completed' && t.status !== 'Archived'));
        break;
      case 'completed':
        renderTaskListView('Completed Tasks', filteredTasks.filter(t => t.status === 'Completed'));
        break;
      case 'archived':
        renderTaskListView('Archived Tasks', filteredTasks.filter(t => t.status === 'Archived'));
        break;
      case 'settings':
        renderSettingsView();
        break;
    }
  }

  function filterTasks(tasks) {
    return tasks.filter(t => {
      if (activeCategory && t.category !== activeCategory) return false;
      if (activeFilterStatus !== 'All' && t.status !== activeFilterStatus) return false;
      if (activeFilterPriority !== 'All' && t.priority !== activeFilterPriority) return false;
      if (activeSearch) {
        const q = activeSearch;
        const inTitle = (t.title || '').toLowerCase().includes(q);
        const inDesc = (t.description || '').toLowerCase().includes(q);
        const inNotes = (t.contents || t.notes || '').toLowerCase().includes(q);
        const inCategory = (t.category || '').toLowerCase().includes(q);
        const inSteps = (t.nextSteps || []).some(s => s.text.toLowerCase().includes(q));
        if (!inTitle && !inDesc && !inNotes && !inCategory && !inSteps) return false;
      }
      return true;
    }).sort((a, b) => {
      if (activeSort === 'recently-created') return new Date(b.createdDate) - new Date(a.createdDate);
      if (activeSort === 'due-date') return (new Date(a.dueDate || '9999-12-31')) - (new Date(b.dueDate || '9999-12-31'));
      if (activeSort === 'priority') {
        const pMap = { Urgent: 4, High: 3, Medium: 2, Low: 1 };
        return pMap[b.priority] - pMap[a.priority];
      }
      if (activeSort === 'alphabetical') return (a.title || '').localeCompare(b.title || '');
      return 0;
    });
  }

  function renderDashboard(allTasks, filteredTasks) {
    const total = allTasks.filter(t => t.status !== 'Archived').length;
    const nextActionsCount = allTasks.filter(t => t.nextSteps && t.nextSteps.some(s => !s.completed) && t.status !== 'Completed' && t.status !== 'Archived').length;
    const inProgressCount = allTasks.filter(t => t.status === 'In Progress').length;
    const completedCount = allTasks.filter(t => t.status === 'Completed').length;
    const overdueCount = allTasks.filter(t => TaskManager.isOverdue(t)).length;

    const nextActionsList = allTasks.filter(t => t.nextSteps && t.nextSteps.some(s => !s.completed) && t.status !== 'Completed' && t.status !== 'Archived').slice(0, 5);

    viewContainer.innerHTML = `
      <div class="dashboard-grid">
        <div class="stat-card"><div class="label">Total Tasks</div><div class="value">${total}</div></div>
        <div class="stat-card"><div class="label">Next Actions</div><div class="value">${nextActionsCount}</div></div>
        <div class="stat-card"><div class="label">In Progress</div><div class="value">${inProgressCount}</div></div>
        <div class="stat-card"><div class="label">Completed</div><div class="value">${completedCount}</div></div>
        <div class="stat-card"><div class="label">Overdue</div><div class="value" style="color:var(--danger)">${overdueCount}</div></div>
      </div>

      <div style="margin-bottom:24px;">
        <h3>⚡ Immediate Next Actions</h3>
        ${nextActionsList.length === 0 ? '<p class="empty-state">No active next actions defined.</p>' : renderTaskGrid(nextActionsList)}
      </div>

      <div>
        <h3>📋 Recent Tasks</h3>
        ${renderTaskGrid(filteredTasks.slice(0, 6))}
      </div>
    `;
  }

  function renderTaskListView(title, tasks) {
    viewContainer.innerHTML = `
      <div class="controls-bar">
        <h2>${title} (${tasks.length})</h2>
        <div class="filters">
          <select class="filter-select" onchange="UIController.setFilter('status', this.value)">
            <option value="All" ${activeFilterStatus === 'All' ? 'selected' : ''}>Status: All</option>
            <option value="Inbox" ${activeFilterStatus === 'Inbox' ? 'selected' : ''}>Inbox</option>
            <option value="Next" ${activeFilterStatus === 'Next' ? 'selected' : ''}>Next</option>
            <option value="In Progress" ${activeFilterStatus === 'In Progress' ? 'selected' : ''}>In Progress</option>
            <option value="Waiting" ${activeFilterStatus === 'Waiting' ? 'selected' : ''}>Waiting</option>
            <option value="Completed" ${activeFilterStatus === 'Completed' ? 'selected' : ''}>Completed</option>
          </select>

          <select class="filter-select" onchange="UIController.setFilter('priority', this.value)">
            <option value="All" ${activeFilterPriority === 'All' ? 'selected' : ''}>Priority: All</option>
            <option value="Low" ${activeFilterPriority === 'Low' ? 'selected' : ''}>Low</option>
            <option value="Medium" ${activeFilterPriority === 'Medium' ? 'selected' : ''}>Medium</option>
            <option value="High" ${activeFilterPriority === 'High' ? 'selected' : ''}>High</option>
            <option value="Urgent" ${activeFilterPriority === 'Urgent' ? 'selected' : ''}>Urgent</option>
          </select>

          <select class="filter-select" onchange="UIController.setSort(this.value)">
            <option value="recently-created" ${activeSort === 'recently-created' ? 'selected' : ''}>Sort: Created</option>
            <option value="due-date" ${activeSort === 'due-date' ? 'selected' : ''}>Sort: Due Date</option>
            <option value="priority" ${activeSort === 'priority' ? 'selected' : ''}>Sort: Priority</option>
            <option value="alphabetical" ${activeSort === 'alphabetical' ? 'selected' : ''}>Sort: A-Z</option>
          </select>
        </div>
      </div>
      ${tasks.length === 0 ? `
        <div class="empty-state">
          <h3>No tasks found</h3>
          <p>Try clearing filters or create a new task.</p>
          <button class="btn btn-primary" style="margin-top:12px" onclick="UIController.openTaskModal()">Create Task</button>
        </div>
      ` : renderTaskGrid(tasks)}
    `;
  }

  function renderTaskGrid(tasks) {
    return `
      <div class="task-grid">
        ${tasks.map(t => renderTaskCard(t)).join('')}
      </div>
    `;
  }

  function renderTaskCard(task) {
    const isOverdue = TaskManager.isOverdue(task);
    const borderClass = task.priority === 'Urgent' ? 'border-urgent' : (task.priority === 'High' ? 'border-high' : '');
    const steps = task.nextSteps || [];
    const completedStepsCount = steps.filter(s => s.completed).length;
    const effectiveProgress = TaskManager.calculateStepsProgress(steps);

    const pendingStep = steps.find(s => !s.completed);

    return `
      <div class="task-card ${borderClass}" onclick="UIController.openTaskDetails('${task.id}')">
        <div class="task-header">
          <div class="task-title">${escapeHtml(task.title)}</div>
          <span class="badge badge-status">${escapeHtml(task.status)}</span>
        </div>
        
        ${task.description ? `<p style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:8px;">${escapeHtml(task.description)}</p>` : ''}
        
        ${pendingStep ? `
          <div class="task-next-step">
            <div class="next-step-label">NEXT STEP</div>
            <div>${escapeHtml(pendingStep.text)}</div>
          </div>
        ` : ''}

        <div style="margin-top: 8px;">
          <div style="display:flex; justify-content:space-between; font-size:0.75rem; color:var(--text-secondary);">
            <span>Progress (${completedStepsCount}/${steps.length})</span>
            <span>${effectiveProgress}%</span>
          </div>
          <div class="progress-bar-container">
            <div class="progress-bar-fill" style="width: ${effectiveProgress}%"></div>
          </div>
        </div>

        <div class="task-footer" onclick="event.stopPropagation()">
          <div style="display:flex; gap:6px; align-items:center;">
            ${isOverdue ? '<span class="badge badge-overdue">OVERDUE</span>' : ''}
            <span>${task.dueDate ? task.dueDate : 'No due date'}</span>
          </div>
          <div class="task-actions">
            <button class="btn btn-sm ${task.status === 'Completed' ? 'btn-secondary' : 'btn-primary'}" onclick="UIController.toggleDone('${task.id}')">
              ${task.status === 'Completed' ? '↩ Reopen' : '✓ Done'}
            </button>
          </div>
        </div>
      </div>
    `;
  }

  async function toggleDone(id) {
    await TaskManager.markAsDone(id);
    renderCurrentView();
  }

  function setFilter(type, val) {
    if (type === 'status') activeFilterStatus = val;
    if (type === 'priority') activeFilterPriority = val;
    renderCurrentView();
  }

  function setSort(val) {
    activeSort = val;
    renderCurrentView();
  }

  async function openTaskDetails(id) {
    const task = await StorageManager.getTask(id);
    if (!task) return;

    const steps = task.nextSteps || [];
    const completedCount = steps.filter(s => s.completed).length;
    const progress = TaskManager.calculateStepsProgress(steps);

    modalContent.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:16px;">
        <h2>${escapeHtml(task.title)}</h2>
        <button class="btn btn-secondary btn-sm" onclick="UIController.closeModal()">✕</button>
      </div>

      <div style="display:flex; gap:8px; margin-bottom:16px;">
        <span class="badge badge-status">${escapeHtml(task.status)}</span>
        <span class="badge" style="background:var(--border-color);">${escapeHtml(task.priority)} Priority</span>
        <span class="badge" style="background:var(--border-color);">${escapeHtml(task.category)}</span>
      </div>

      <div style="margin-bottom:16px;">
        <strong>Description:</strong>
        <p style="color:var(--text-secondary);">${escapeHtml(task.description || 'None')}</p>
      </div>

      <div style="margin-bottom:16px;">
        <div style="display:flex; justify-content:space-between; font-size:0.85rem; color:var(--text-secondary); margin-bottom:4px;">
          <span>Progress</span>
          <span>${progress}% (${completedCount}/${steps.length})</span>
        </div>
        <div class="progress-bar-container">
          <div class="progress-bar-fill" style="width:${progress}%;"></div>
        </div>
      </div>

      ${steps.length > 0 ? `
        <div style="margin-bottom:16px;">
          <strong>Subtasks / Next Steps:</strong>
          <div style="margin-top:8px; display:flex; flex-direction:column; gap:6px;">
            ${steps.map(s => `
              <label style="display:flex; align-items:center; gap:8px; background:var(--bg-primary); padding:8px 12px; border-radius:6px; cursor:pointer;">
                <input type="checkbox" ${s.completed ? 'checked' : ''} onchange="UIController.toggleStepItem('${task.id}', '${s.id}')">
                <span style="${s.completed ? 'text-decoration:line-through; color:var(--text-secondary);' : ''}">${escapeHtml(s.text)}</span>
              </label>
            `).join('')}
          </div>
        </div>
      ` : ''}

      ${task.contents ? `
        <div style="margin-bottom:16px;">
          <strong>Contents / Outline:</strong>
          <pre style="white-space:pre-wrap; background:var(--bg-primary); padding:8px; border-radius:4px; font-family:inherit; font-size:0.85rem;">${escapeHtml(task.contents)}</pre>
        </div>
      ` : ''}

      <div style="margin-bottom:24px; font-size:0.8rem; color:var(--text-secondary);">
        <div>Created: ${new Date(task.createdDate).toLocaleString()}</div>
        ${task.dueDate ? `<div>Due Date: ${task.dueDate}</div>` : ''}
      </div>

      <div style="display:flex; gap:8px; flex-wrap:wrap; justify-content:flex-end;">
        <button class="btn btn-secondary" onclick="UIController.toggleDone('${task.id}'); UIController.closeModal();">
          ${task.status === 'Completed' ? '↩ Reopen' : '✓ Mark Done'}
        </button>
        <button class="btn btn-secondary" onclick="UIController.openTaskModal('${task.id}')">Edit</button>
        <button class="btn btn-secondary" onclick="UIController.archiveTask('${task.id}')">Archive</button>
        <button class="btn btn-danger" onclick="UIController.deleteTask('${task.id}')">Delete</button>
      </div>
    `;
    modalOverlay.classList.remove('hidden');
  }

  async function toggleStepItem(taskId, stepId) {
    await TaskManager.toggleStep(taskId, stepId);
    openTaskDetails(taskId);
    renderCurrentView();
  }

  async function openTaskModal(taskId = null) {
    let task = taskId ? await StorageManager.getTask(taskId) : TaskManager.createNewTaskObject();
    const categories = TaskManager.getCategories();

    modalSteps = (task.nextSteps && task.nextSteps.length > 0)
      ? task.nextSteps.map(s => ({ ...s }))
      : [{ id: 'step_' + Date.now() + '_0', text: '', completed: false }];

    modalContent.innerHTML = `
      <h2>${taskId ? 'Edit Task' : 'New Task'}</h2>
      <form id="task-form" onsubmit="UIController.saveTaskForm(event, '${task.id}')">
        <div class="form-group">
          <label>Title *</label>
          <input type="text" id="form-title" class="form-control" value="${escapeHtml(task.title || '')}" required>
        </div>

        <div class="form-group">
          <label>Next Steps / Actionable Targets</label>
          <div id="modal-steps-list" style="display:flex; flex-direction:column; gap:8px; margin-bottom:8px;"></div>
          <button type="button" class="btn btn-secondary btn-sm" onclick="UIController.addModalStepInput()">+ Add Step</button>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Category</label>
            <select id="form-category" class="form-control">
              ${categories.map(c => `<option value="${escapeHtml(c)}" ${task.category === c ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Priority</label>
            <select id="form-priority" class="form-control">
              <option value="Low" ${task.priority === 'Low' ? 'selected' : ''}>Low</option>
              <option value="Medium" ${task.priority === 'Medium' || !task.priority ? 'selected' : ''}>Medium</option>
              <option value="High" ${task.priority === 'High' ? 'selected' : ''}>High</option>
              <option value="Urgent" ${task.priority === 'Urgent' ? 'selected' : ''}>Urgent</option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Status</label>
            <select id="form-status" class="form-control">
              <option value="Inbox" ${task.status === 'Inbox' || !task.status ? 'selected' : ''}>Inbox</option>
              <option value="Next" ${task.status === 'Next' ? 'selected' : ''}>Next</option>
              <option value="In Progress" ${task.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
              <option value="Waiting" ${task.status === 'Waiting' ? 'selected' : ''}>Waiting</option>
              <option value="Completed" ${task.status === 'Completed' ? 'selected' : ''}>Completed</option>
            </select>
          </div>
          <div class="form-group">
            <label>Due Date</label>
            <input type="date" id="form-dueDate" class="form-control" value="${task.dueDate || ''}">
          </div>
        </div>

        <div class="form-group">
          <label>Description</label>
          <textarea id="form-description" class="form-control" rows="2">${escapeHtml(task.description || '')}</textarea>
        </div>

        <div class="form-group">
          <label>Contents / Detailed Notes</label>
          <textarea id="form-contents" class="form-control" rows="3">${escapeHtml(task.contents || '')}</textarea>
        </div>

        <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:20px;">
          <button type="button" class="btn btn-secondary" onclick="UIController.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Save Task</button>
        </div>
      </form>
    `;

    renderModalSteps();
    modalOverlay.classList.remove('hidden');
  }

  function syncModalStepsFromDOM() {
    const stepInputs = document.querySelectorAll('#modal-steps-list input');
    stepInputs.forEach((input, idx) => {
      if (modalSteps[idx]) {
        modalSteps[idx].text = input.value;
      }
    });
  }

  function renderModalSteps() {
    const list = document.getElementById('modal-steps-list');
    if (!list) return;

    list.innerHTML = modalSteps.map((step, idx) => `
      <div style="display:flex; gap:8px; align-items:center;">
        <input type="text" class="form-control" value="${escapeHtml(step.text)}" placeholder="Step description..." oninput="UIController.updateModalStepText(${idx}, this.value)">
        <button type="button" class="btn btn-danger btn-sm" onclick="UIController.removeModalStep(${idx})">✕</button>
      </div>
    `).join('');
  }

  function addModalStepInput() {
    syncModalStepsFromDOM();
    modalSteps.push({
      id: 'step_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      text: '',
      completed: false
    });
    renderModalSteps();
  }

  function updateModalStepText(index, text) {
    if (modalSteps[index]) {
      modalSteps[index].text = text;
    }
  }

  function removeModalStep(index) {
    syncModalStepsFromDOM();
    modalSteps.splice(index, 1);
    renderModalSteps();
  }

  async function saveTaskForm(e, taskId) {
    e.preventDefault();
    let task = await StorageManager.getTask(taskId);

    syncModalStepsFromDOM();

    const formTitle = document.getElementById('form-title').value;
    const formCategory = document.getElementById('form-category').value;
    const formPriority = document.getElementById('form-priority').value;
    const formStatus = document.getElementById('form-status').value;
    const formDueDate = document.getElementById('form-dueDate').value;
    const formDescription = document.getElementById('form-description').value;
    const formContents = document.getElementById('form-contents').value;

    const formattedSteps = modalSteps.filter(s => s.text.trim() !== '');

    const taskData = {
      id: taskId,
      title: formTitle,
      category: formCategory,
      priority: formPriority,
      status: formStatus,
      dueDate: formDueDate,
      description: formDescription,
      contents: formContents,
      nextSteps: formattedSteps,
      createdDate: task ? task.createdDate : new Date().toISOString(),
      completedDate: (formStatus === 'Completed') ? (task?.completedDate || new Date().toISOString()) : null
    };

    const updatedTask = TaskManager.createNewTaskObject(taskData);

    await StorageManager.updateTask(updatedTask);
    closeModal();
    renderCurrentView();
  }

  async function archiveTask(id) {
    const task = await StorageManager.getTask(id);
    if (task) {
      task.status = 'Archived';
      await StorageManager.updateTask(task);
      closeModal();
      renderCurrentView();
    }
  }

  async function deleteTask(id) {
    if (confirm('Are you sure you want to delete this task?')) {
      await StorageManager.deleteTask(id);
      closeModal();
      renderCurrentView();
    }
  }

  function renderSettingsView() {
    const theme = localStorage.getItem('todo_theme') || 'system';

    viewContainer.innerHTML = `
      <h2>⚙ Settings</h2>
      <div style="max-width:600px; margin-top:16px; display:flex; flex-direction:column; gap:20px;">
        <div class="stat-card">
          <h3>Appearance</h3>
          <div style="margin-top:10px;">
            <label>Theme Option</label>
            <select class="form-control" style="margin-top:6px;" onchange="UIController.setTheme(this.value)">
              <option value="system" ${theme === 'system' ? 'selected' : ''}>System Default</option>
              <option value="light" ${theme === 'light' ? 'selected' : ''}>Light Mode</option>
              <option value="dark" ${theme === 'dark' ? 'selected' : ''}>Dark Mode</option>
            </select>
          </div>
        </div>

        <div class="stat-card">
          <h3>Data Backup & Restore</h3>
          <p style="font-size:0.85rem; color:var(--text-secondary); margin:6px 0 12px 0;">Export your tasks locally to JSON or migrate to another device.</p>
          <div style="display:flex; gap:10px;">
            <button class="btn btn-primary" onclick="UIController.exportBackup()">Export Data</button>
            <button class="btn btn-secondary" onclick="document.getElementById('import-file').click()">Import Data</button>
            <input type="file" id="import-file" style="display:none" accept=".json" onchange="UIController.importBackup(event)">
          </div>
        </div>

        <div class="stat-card">
          <h3>Danger Zone</h3>
          <p style="font-size:0.85rem; color:var(--text-secondary); margin:6px 0 12px 0;">Permanently clear all locally saved task data.</p>
          <button class="btn btn-danger" onclick="UIController.clearAllData()">Clear All Data</button>
        </div>

        <div class="stat-card">
          <h3>About App</h3>
          <p style="font-size:0.85rem; color:var(--text-secondary);">TaskFlow PWA v1.0.0 (Offline Capable)</p>
        </div>
      </div>
    `;
  }

  function setTheme(theme) {
    localStorage.setItem('todo_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }

  async function exportBackup() {
    const jsonStr = await StorageManager.exportData();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `todo-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
  }

  async function importBackup(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const merge = confirm('Do you want to MERGE with existing tasks? Click Cancel to REPLACE.');
        await StorageManager.importData(evt.target.result, merge);
        alert('Data imported successfully!');
        renderCurrentView();
      } catch (err) {
        alert('Failed to import file. Invalid format.');
      }
    };
    reader.readAsText(file);
  }

  async function clearAllData() {
    if (confirm('WARNING: This will erase all tasks permanently. Proceed?')) {
      await StorageManager.clearAllData();
      renderCurrentView();
    }
  }

  function closeModal() {
    modalOverlay.classList.add('hidden');
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }

  return {
    init,
    switchView,
    filterByCategory,
    setFilter,
    setSort,
    toggleDone,
    openTaskDetails,
    openTaskModal,
    addModalStepInput,
    updateModalStepText,
    removeModalStep,
    saveTaskForm,
    toggleStepItem,
    archiveTask,
    deleteTask,
    closeModal,
    setTheme,
    exportBackup,
    importBackup,
    clearAllData
  };
})();