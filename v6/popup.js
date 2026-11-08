// Browser API compatibility layer (Firefox uses browser.*, Chrome uses chrome.*)
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

// Get DOM elements
const taskInput = document.getElementById("taskInput");
const deadlineDate = document.getElementById("deadlineDate");
const deadlineTime = document.getElementById("deadlineTime");
const deadlineDatePicker = document.getElementById("deadlineDatePicker");
const calendarBtn = document.getElementById("calendarBtn");
const taskList = document.getElementById("taskList");
const historyList = document.getElementById("historyList");
const pendingCounter = document.getElementById("pendingCounter");
const historyBtn = document.getElementById("historyBtn");
let selectedPriority = 'high'; // Default priority
let showingHistory = false;
let currentFilter = 'all'; // Default filter (white/all)

// Format date to dd/mm/yyyy
function formatDate(dateString) {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

// Format date and time to dd/mm/yyyy HH:mm
function formatDateTime(dateString) {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

// Fetch tasks from browser.storage
function fetchTasks() {
  browserAPI.storage.local.get(['tasks'], (result) => {
    const tasks = result.tasks || []; // Get tasks from browser.storage
    restoreAlarms(tasks); // Restore alarms for active tasks
    updatePendingCounter(tasks); // Update pending counter
    renderTasks(tasks); // Render the tasks
  });
}

// Update pending tasks counter
function updatePendingCounter(tasks) {
  const pending = tasks.filter(task => !task.completed).length;
  if (pendingCounter) {
    pendingCounter.textContent = `Pending: ${pending}`;
  }
}

// Get priority icon
function getPriorityIcon(priority) {
  switch(priority) {
    case 'high': return '🔴';
    case 'medium': return '🟡';
    case 'low': return '🟢';
    default: return '🟡';
  }
}

// Get priority color class
function getPriorityClass(priority) {
  switch(priority) {
    case 'high': return 'priority-high';
    case 'medium': return 'priority-medium';
    case 'low': return 'priority-low';
    default: return 'priority-medium';
  }
}

// Restore alarms for tasks that have alarms enabled
function restoreAlarms(tasks) {
  let needsUpdate = false;
  
  tasks.forEach(task => {
    if (task.alarmActive && task.deadline) {
      const deadlineTime = new Date(task.deadline).getTime();
      const now = Date.now();
      
      if (deadlineTime > now) {
        browserAPI.alarms.create(`task-${task.id}`, {
          when: deadlineTime
        });
      } else {
        // Deadline has passed, disable alarm
        task.alarmActive = false;
        needsUpdate = true;
      }
    }
  });
  
  if (needsUpdate) {
    browserAPI.storage.local.set({ tasks: tasks });
  }
}

// Render tasks in the DOM
function renderTasks(tasks) {
  taskList.innerHTML = "";  // Clear the task list before rendering
  historyList.innerHTML = ""; // Clear history list

  // Separate completed and incomplete tasks
  const incompleteTasks = tasks.filter(task => !task.completed);
  const completedTasks = tasks.filter(task => task.completed);

  // Filter tasks by priority if filter is set
  let filteredTasks = incompleteTasks;
  if (currentFilter !== 'all') {
    filteredTasks = incompleteTasks.filter(task => {
      const taskPriority = task.priority || 'medium';
      return taskPriority === currentFilter;
    });
  }

  // Sort incomplete tasks by order if available, otherwise keep original order
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (a.order !== undefined && b.order !== undefined) {
      return a.order - b.order;
    }
    return 0;
  });

  // Render incomplete tasks
  sortedTasks.forEach((task, index) => {
    const creationTime = formatDate(task.created_at);
    const deadlineTime = task.deadline ? formatDateTime(task.deadline) : "No Deadline";
    const countdown = task.deadline ? getCountdown(task.deadline) : "N/A";
    const priority = task.priority || 'medium';
    const priorityIcon = getPriorityIcon(priority);
    const priorityClass = getPriorityClass(priority);
    const isCompleted = task.completed || false;

    const li = document.createElement("li");
    li.setAttribute('data-task-id', task.id);
    li.setAttribute('draggable', 'true');
    li.classList.add('task-item', priorityClass);
    if (isCompleted) {
      li.classList.add('completed');
    }
    
    const alarmActive = task.alarmActive || false;
    const alarmIcon = alarmActive ? '🔔' : '🔕';
    const alarmClass = alarmActive ? 'alarm-active' : 'alarm-inactive';
    
    li.innerHTML = `
      <div class="task-view">
        <div class="task-header">
          <div class="task-name-row">
            <div class="task-priority-icon">${priorityIcon}</div>
            <div class="task-name"><strong>${task.name}</strong></div>
            <button class="edit" data-task-id="${task.id}" title="Edit task">✏️</button>
          </div>
        </div>
        <div class="task-info">
          <div class="task-info-row">
            <span class="timestamp">Created at: ${creationTime}</span>
            ${task.deadline ? `<button class="alarm ${alarmClass}" data-task-id="${task.id}" title="${alarmActive ? 'Alarm ON' : 'Alarm OFF'}">${alarmIcon}</button>` : '<span class="alarm-placeholder"></span>'}
          </div>
          <div class="task-info-row">
            <span class="deadline">Deadline: ${deadlineTime}</span>
            ${!isCompleted ? `<button class="complete" data-task-id="${task.id}">Complete</button>` : '<span class="complete-placeholder"></span>'}
          </div>
          <div class="task-info-row">
            <span class="countdown">Countdown: ${countdown}</span>
            <button class="delete" data-task-id="${task.id}">Delete</button>
          </div>
        </div>
      </div>
      <div class="task-edit" style="display: none;">
        <input type="text" class="edit-task-name" value="${task.name}" placeholder="Task name">
        <div class="edit-priority-selector">
          <label>Priority:</label>
          <button type="button" class="edit-priority-btn priority-high ${priority === 'high' ? 'active' : ''}" data-task-id="${task.id}" data-priority="high">🔴</button>
          <button type="button" class="edit-priority-btn priority-medium ${priority === 'medium' ? 'active' : ''}" data-task-id="${task.id}" data-priority="medium">🟡</button>
          <button type="button" class="edit-priority-btn priority-low ${priority === 'low' ? 'active' : ''}" data-task-id="${task.id}" data-priority="low">🟢</button>
        </div>
        <div class="edit-datetime-wrapper">
          <div class="date-time-inputs">
            <div class="date-input-wrapper">
              <input type="text" class="edit-deadline-date" placeholder="dd/mm/yyyy" value="${task.deadline ? formatDateForInput(task.deadline) : ''}">
              <input type="date" class="edit-deadline-date-picker" style="display: none;">
              <button type="button" class="calendar-btn edit-calendar-btn" data-task-id="${task.id}" title="Select date">📅</button>
            </div>
            <input type="time" class="edit-deadline-time" value="${task.deadline ? formatTimeForInput(task.deadline) : ''}">
          </div>
        </div>
        <div class="edit-actions">
          <button class="save-edit" data-task-id="${task.id}">Save</button>
          <button class="cancel-edit" data-task-id="${task.id}">Cancel</button>
        </div>
      </div>
    `;
    taskList.appendChild(li);
  });

  // Filter completed tasks by priority if filter is set
  let filteredCompletedTasks = completedTasks;
  if (currentFilter !== 'all') {
    filteredCompletedTasks = completedTasks.filter(task => {
      const taskPriority = task.priority || 'medium';
      return taskPriority === currentFilter;
    });
  }

  // Render completed tasks in history
  const sortedCompletedTasks = [...filteredCompletedTasks].sort((a, b) => {
    const dateA = new Date(a.completed_at || a.created_at);
    const dateB = new Date(b.completed_at || b.created_at);
    return dateB - dateA; // Most recent first
  });

  sortedCompletedTasks.forEach((task) => {
    const creationTime = formatDate(task.created_at);
    const deadlineTime = task.deadline ? formatDateTime(task.deadline) : "No Deadline";
    const completedTime = task.completed_at ? formatDateTime(task.completed_at) : formatDate(task.created_at);
    const priority = task.priority || 'medium';
    const priorityIcon = getPriorityIcon(priority);

    const li = document.createElement("li");
    li.classList.add('task-item', 'completed', getPriorityClass(priority));
    
    li.innerHTML = `
      <div class="task-view">
        <div class="task-header">
          <div class="task-name-row">
            <div class="task-priority-icon">${priorityIcon}</div>
            <div class="task-name"><strong>${task.name}</strong></div>
          </div>
        </div>
        <div class="task-info">
          <div class="task-info-row">
            <span class="timestamp">Created at: ${creationTime}</span>
          </div>
          <div class="task-info-row">
            <span class="deadline">Deadline: ${deadlineTime}</span>
          </div>
          <div class="task-info-row">
            <span class="countdown">Completed at: ${completedTime}</span>
            <div class="history-actions">
              <button class="incomplete" data-task-id="${task.id}">Incomplete</button>
              <button class="delete" data-task-id="${task.id}">Delete</button>
            </div>
          </div>
        </div>
      </div>
    `;
    historyList.appendChild(li);
  });

  // Attach delete and incomplete listeners to history items
  const historyDeleteButtons = historyList.querySelectorAll('.delete');
  historyDeleteButtons.forEach(button => {
    button.addEventListener('click', () => {
      const taskId = parseInt(button.getAttribute('data-task-id'));
      deleteTask(taskId);
    });
  });

  const incompleteButtons = historyList.querySelectorAll('.incomplete');
  incompleteButtons.forEach(button => {
    button.addEventListener('click', () => {
      const taskId = parseInt(button.getAttribute('data-task-id'));
      markIncomplete(taskId);
    });
  });

  // Attach event listeners to complete buttons
  const completeButtons = taskList.querySelectorAll('.complete');
  completeButtons.forEach(button => {
    button.addEventListener('click', () => {
      const taskId = parseInt(button.getAttribute('data-task-id'));
      toggleComplete(taskId, true);
    });
  });

  // Attach event listeners to delete buttons
  const deleteButtons = taskList.querySelectorAll('.delete');
  deleteButtons.forEach(button => {
    button.addEventListener('click', () => {
      const taskId = parseInt(button.getAttribute('data-task-id'));
      deleteTask(taskId);
    });
  });

  // Attach event listeners to alarm buttons
  const alarmButtons = taskList.querySelectorAll('.alarm');
  alarmButtons.forEach(button => {
    button.addEventListener('click', () => {
      const taskId = parseInt(button.getAttribute('data-task-id'));
      toggleAlarm(taskId);
    });
  });

  // Attach event listeners to edit buttons
  const editButtons = taskList.querySelectorAll('.edit');
  editButtons.forEach(button => {
    button.addEventListener('click', () => {
      const taskId = parseInt(button.getAttribute('data-task-id'));
      enableEditMode(taskId);
    });
  });

  // Attach event listeners to save and cancel buttons
  const saveButtons = taskList.querySelectorAll('.save-edit');
  saveButtons.forEach(button => {
    button.addEventListener('click', () => {
      const taskId = parseInt(button.getAttribute('data-task-id'));
      saveTask(taskId);
    });
  });

  const cancelButtons = taskList.querySelectorAll('.cancel-edit');
  cancelButtons.forEach(button => {
    button.addEventListener('click', () => {
      const taskId = parseInt(button.getAttribute('data-task-id'));
      cancelEdit(taskId);
    });
  });

  // Format date inputs in edit mode
  const editDateInputs = taskList.querySelectorAll('.edit-deadline-date');
  editDateInputs.forEach(input => {
    input.addEventListener('input', (e) => {
      formatDateInput(e.target);
      // Sync with date picker
      const li = e.target.closest('li');
      if (li) {
        const datePicker = li.querySelector('.edit-deadline-date-picker');
        const textValue = e.target.value.trim();
        if (textValue && textValue.match(/^\d{2}\/\d{2}\/\d{4}$/) && datePicker) {
          const [day, month, year] = textValue.split('/');
          datePicker.value = `${year}-${month}-${day}`;
        }
      }
    });
  });

  // Calendar button handlers in edit mode
  const editCalendarButtons = taskList.querySelectorAll('.edit-calendar-btn');
  editCalendarButtons.forEach(button => {
    button.addEventListener('click', () => {
      const li = button.closest('li');
      if (!li) return;
      
      const dateInput = li.querySelector('.edit-deadline-date');
      const datePicker = li.querySelector('.edit-deadline-date-picker');
      
      if (dateInput && datePicker) {
        // If text input has a valid date, set it in the picker
        const textValue = dateInput.value.trim();
        if (textValue && textValue.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
          const [day, month, year] = textValue.split('/');
          datePicker.value = `${year}-${month}-${day}`;
        }
        // Firefox doesn't support showPicker(), so we'll click the input instead
        if (datePicker.showPicker) {
          datePicker.showPicker();
        } else {
          datePicker.click();
        }
      }
    });
  });

  // Sync date picker selection to text input in edit mode
  const editDatePickers = taskList.querySelectorAll('.edit-deadline-date-picker');
  editDatePickers.forEach(picker => {
    picker.addEventListener('change', () => {
      if (picker.value) {
        const li = picker.closest('li');
        if (li) {
          const dateInput = li.querySelector('.edit-deadline-date');
          if (dateInput) {
            const [year, month, day] = picker.value.split('-');
            dateInput.value = `${day}/${month}/${year}`;
          }
        }
      }
    });
  });

  // Priority button handlers in edit mode
  const editPriorityButtons = taskList.querySelectorAll('.edit-priority-btn');
  editPriorityButtons.forEach(button => {
    button.addEventListener('click', () => {
      const taskId = parseInt(button.getAttribute('data-task-id'));
      const priority = button.getAttribute('data-priority');
      
      // Update active state
      const li = button.closest('li');
      if (li) {
        const allPriorityBtns = li.querySelectorAll('.edit-priority-btn');
        allPriorityBtns.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
      }
    });
  });

  // Drag and drop handlers
  const taskItems = taskList.querySelectorAll('li.task-item');
  taskItems.forEach(item => {
    item.addEventListener('dragstart', handleDragStart);
    item.addEventListener('dragover', handleDragOver);
    item.addEventListener('drop', handleDrop);
    item.addEventListener('dragend', handleDragEnd);
  });
}

// Toggle task completion
function toggleComplete(taskId, completed) {
  browserAPI.storage.local.get(['tasks'], (result) => {
    const tasks = result.tasks || [];
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    
    if (taskIndex !== -1) {
      tasks[taskIndex].completed = completed;
      if (completed) {
        tasks[taskIndex].completed_at = new Date().toISOString();
      } else {
        tasks[taskIndex].completed_at = null;
      }
      browserAPI.storage.local.set({ tasks: tasks }, () => {
        fetchTasks();
      });
    }
  });
}

// Mark task as incomplete
function markIncomplete(taskId) {
  browserAPI.storage.local.get(['tasks'], (result) => {
    const tasks = result.tasks || [];
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    
    if (taskIndex !== -1) {
      tasks[taskIndex].completed = false;
      tasks[taskIndex].completed_at = null;
      browserAPI.storage.local.set({ tasks: tasks }, () => {
        fetchTasks();
        // If in history view, switch back to active view
        if (showingHistory) {
          toggleHistory();
        }
      });
    }
  });
}

// Toggle history view
function toggleHistory() {
  showingHistory = !showingHistory;
  
  if (showingHistory) {
    taskList.style.display = 'none';
    historyList.style.display = 'block';
    historyBtn.textContent = 'Active';
    historyBtn.style.backgroundColor = '#4CAF50';
  } else {
    taskList.style.display = 'block';
    historyList.style.display = 'none';
    historyBtn.textContent = 'History';
    historyBtn.style.backgroundColor = '#666';
  }
}

// Drag and drop handlers
let draggedElement = null;

function handleDragStart(e) {
  draggedElement = this;
  this.style.opacity = '0.5';
  e.dataTransfer.effectAllowed = 'move';
}

function handleDragOver(e) {
  if (e.preventDefault) {
    e.preventDefault();
  }
  e.dataTransfer.dropEffect = 'move';
  
  if (draggedElement && this !== draggedElement) {
    const rect = this.getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;
    if (e.clientY < midpoint) {
      this.parentNode.insertBefore(draggedElement, this);
    } else {
      this.parentNode.insertBefore(draggedElement, this.nextSibling);
    }
  }
  return false;
}

function handleDrop(e) {
  if (e.stopPropagation) {
    e.stopPropagation();
  }
  
  if (draggedElement !== this) {
    // Update order in storage
    updateTaskOrder();
  }
  
  return false;
}

function handleDragEnd(e) {
  this.style.opacity = '1';
  draggedElement = null;
}

// Update task order after drag and drop
function updateTaskOrder() {
  const taskItems = taskList.querySelectorAll('li.task-item');
  const taskIds = Array.from(taskItems).map(item => parseInt(item.getAttribute('data-task-id')));
  
  browserAPI.storage.local.get(['tasks'], (result) => {
    const tasks = result.tasks || [];
    const orderedTasks = taskIds.map(id => {
      return tasks.find(t => t.id === id);
    }).filter(t => t !== undefined);
    
    // Update order property
    orderedTasks.forEach((task, index) => {
      task.order = index;
    });
    
    browserAPI.storage.local.set({ tasks: tasks }, () => {
      fetchTasks();
    });
  });
}

// Format date for input field (from ISO to dd/mm/yyyy)
function formatDateForInput(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

// Format time for input field (from ISO to HH:mm)
function formatTimeForInput(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

// Enable edit mode for a task
function enableEditMode(taskId) {
  const li = document.querySelector(`li[data-task-id="${taskId}"]`);
  if (!li) return;
  
  const taskView = li.querySelector('.task-view');
  const taskEdit = li.querySelector('.task-edit');
  
  if (taskView && taskEdit) {
    taskView.style.display = 'none';
    taskEdit.style.display = 'block';
  }
}

// Cancel edit mode
function cancelEdit(taskId) {
  const li = document.querySelector(`li[data-task-id="${taskId}"]`);
  if (!li) return;
  
  const taskView = li.querySelector('.task-view');
  const taskEdit = li.querySelector('.task-edit');
  
  if (taskView && taskEdit) {
    taskView.style.display = 'block';
    taskEdit.style.display = 'none';
    // Re-render to reset any changes
    fetchTasks();
  }
}

// Save edited task
function saveTask(taskId) {
  const li = document.querySelector(`li[data-task-id="${taskId}"]`);
  if (!li) return;
  
  const taskNameInput = li.querySelector('.edit-task-name');
  const dateInput = li.querySelector('.edit-deadline-date');
  const timeInput = li.querySelector('.edit-deadline-time');
  const activePriorityBtn = li.querySelector('.edit-priority-btn.active');
  
  const newName = taskNameInput.value.trim();
  if (!newName) {
    alert('Task name cannot be empty');
    return;
  }
  
  const dateValue = dateInput.value.trim();
  const timeValue = timeInput.value;
  const priority = activePriorityBtn ? activePriorityBtn.getAttribute('data-priority') : 'medium';
  
  let deadline = null;
  if (dateValue) {
    const dateObj = parseDate(dateValue, timeValue);
    if (dateObj && !isNaN(dateObj.getTime())) {
      deadline = dateObj.toISOString();
    }
  }
  
  browserAPI.storage.local.get(['tasks'], (result) => {
    const tasks = result.tasks || [];
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    
    if (taskIndex !== -1) {
      // Cancel existing alarm if deadline changed
      if (tasks[taskIndex].deadline && tasks[taskIndex].alarmActive) {
        browserAPI.alarms.clear(`task-${taskId}`, () => {});
      }
      
      tasks[taskIndex].name = newName;
      tasks[taskIndex].deadline = deadline;
      tasks[taskIndex].priority = priority;
      
      // Restore alarm if it was active and new deadline is valid
      if (deadline && tasks[taskIndex].alarmActive) {
        const deadlineTime = new Date(deadline).getTime();
        const now = Date.now();
        if (deadlineTime > now) {
          browserAPI.alarms.create(`task-${taskId}`, {
            when: deadlineTime
          });
        } else {
          tasks[taskIndex].alarmActive = false;
        }
      } else if (!deadline) {
        tasks[taskIndex].alarmActive = false;
      }
      
      browserAPI.storage.local.set({ tasks: tasks }, () => {
        fetchTasks();
      });
    }
  });
}

// Get countdown to deadline
function getCountdown(deadline) {
  const now = new Date();
  const deadlineDate = new Date(deadline);
  const timeDifference = deadlineDate - now;

  if (timeDifference <= 0) {
    return "Deadline passed";
  }

  const days = Math.floor(timeDifference / (1000 * 60 * 60 * 24));
  const hours = Math.floor((timeDifference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((timeDifference % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeDifference % (1000 * 60)) / 1000);

  return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}

// Convert dd/mm/yyyy to Date object
function parseDate(dateString, timeString) {
  if (!dateString) return null;
  
  const [day, month, year] = dateString.split('/');
  if (!day || !month || !year) return null;
  
  const date = new Date(year, month - 1, day);
  if (timeString) {
    const [hours, minutes] = timeString.split(':');
    date.setHours(parseInt(hours) || 0, parseInt(minutes) || 0, 0, 0);
  }
  
  return date;
}

// Format date input to dd/mm/yyyy
function formatDateInput(input) {
  let value = input.value.replace(/\D/g, ''); // Remove non-digits
  
  if (value.length >= 2) {
    value = value.substring(0, 2) + '/' + value.substring(2);
  }
  if (value.length >= 5) {
    value = value.substring(0, 5) + '/' + value.substring(5, 9);
  }
  
  input.value = value;
}

// Add a new task
function addTask() {
  const taskName = taskInput.value.trim();
  const dateValue = deadlineDate.value.trim();
  const timeValue = deadlineTime.value;

  if (taskName !== "") {
    let deadline = null;
    if (dateValue) {
      const dateObj = parseDate(dateValue, timeValue);
      if (dateObj && !isNaN(dateObj.getTime())) {
        deadline = dateObj.toISOString();
      }
    }

    browserAPI.storage.local.get(['tasks'], (result) => {
      const tasks = result.tasks || []; // Get existing tasks
      const maxOrder = tasks.length > 0 ? Math.max(...tasks.map(t => t.order || 0)) : -1;

      const newTask = {
        id: Date.now(), // Use timestamp as unique task ID
        name: taskName,
        created_at: new Date().toISOString(),
        deadline: deadline,
        priority: selectedPriority,
        completed: false,
        alarmActive: false,
        order: maxOrder + 1
      };

      tasks.push(newTask); // Add the new task
      browserAPI.storage.local.set({ tasks: tasks }, () => {
        // Store tasks in browser.storage
        taskInput.value = "";
        deadlineDate.value = "";
        deadlineTime.value = "";
        updateDateCheckmark(); // Hide checkmark when input is cleared
        fetchTasks(); // Re-fetch and render tasks
      });
    });
  }
}

// Delete a task
function deleteTask(taskId) {
  browserAPI.storage.local.get(['tasks'], (result) => {
    const tasks = result.tasks || []; // Get tasks from browser.storage
    const taskToDelete = tasks.find(t => t.id === taskId);
    
    // Cancel alarm if it exists
    if (taskToDelete && taskToDelete.deadline) {
      browserAPI.alarms.clear(`task-${taskId}`, () => {});
    }
    
    const updatedTasks = tasks.filter(task => task.id !== taskId); // Remove the task by ID
    browserAPI.storage.local.set({ tasks: updatedTasks }, () => {
      // Update tasks in browser.storage
      fetchTasks(); // Re-fetch and render tasks
    });
  });
}

// Toggle alarm for a task
function toggleAlarm(taskId) {
  browserAPI.storage.local.get(['tasks'], (result) => {
    const tasks = result.tasks || [];
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    
    if (taskIndex === -1 || !tasks[taskIndex].deadline) return;
    
    const task = tasks[taskIndex];
    const alarmActive = !task.alarmActive;
    
    // Update task alarm status
    tasks[taskIndex].alarmActive = alarmActive;
    
    if (alarmActive) {
      // Set alarm for deadline
      const deadlineTime = new Date(task.deadline).getTime();
      const now = Date.now();
      
      if (deadlineTime > now) {
        browserAPI.alarms.create(`task-${taskId}`, {
          when: deadlineTime
        });
      }
    } else {
      // Clear alarm
      browserAPI.alarms.clear(`task-${taskId}`, () => {});
    }
    
    browserAPI.storage.local.set({ tasks: tasks }, () => {
      fetchTasks(); // Re-fetch and render tasks
    });
  });
}

// Show/hide checkmark and date display based on date input
function updateDateCheckmark() {
  const dateCheckmark = document.getElementById('dateCheckmark');
  const dateDisplay = document.getElementById('dateDisplay');
  
  if (deadlineDate && deadlineTime && dateCheckmark && dateDisplay) {
    const dateValue = deadlineDate.value.trim();
    const timeValue = deadlineTime.value;
    
    if (dateValue) {
      dateCheckmark.style.display = 'inline-block';
      dateDisplay.style.display = 'block';
      const timeStr = timeValue ? ` ${timeValue}` : '';
      dateDisplay.textContent = `Selected: ${dateValue}${timeStr}`;
    } else {
      dateCheckmark.style.display = 'none';
      dateDisplay.style.display = 'none';
    }
  }
}

// Attach event listeners when the page is loaded
window.onload = () => {
  fetchTasks();
  
  // Add event listener for Add Task button
  const addTaskBtn = document.getElementById('addTaskBtn');
  if (addTaskBtn) {
    addTaskBtn.addEventListener('click', addTask);
  }
  
  // Add event listener for Enter key on task input
  if (taskInput) {
    taskInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        addTask();
      }
    });
  }
  
  // Add event listeners for date and time inputs
  if (deadlineDate) {
    deadlineDate.addEventListener('input', (e) => {
      formatDateInput(e.target);
      updateDateCheckmark();
      // Sync with date picker
      syncDatePickerToText();
    });
    deadlineDate.addEventListener('change', updateDateCheckmark);
  }
  
  if (deadlineTime) {
    deadlineTime.addEventListener('change', updateDateCheckmark);
    deadlineTime.addEventListener('input', updateDateCheckmark);
  }
  
  // Calendar button click handler
  if (calendarBtn && deadlineDatePicker) {
    calendarBtn.addEventListener('click', () => {
      // If text input has a valid date, set it in the picker
      const textValue = deadlineDate.value.trim();
      if (textValue && textValue.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
        const [day, month, year] = textValue.split('/');
        deadlineDatePicker.value = `${year}-${month}-${day}`;
      }
      // Firefox doesn't support showPicker(), so we'll click the input instead
      if (deadlineDatePicker.showPicker) {
        deadlineDatePicker.showPicker();
      } else {
        deadlineDatePicker.click();
      }
    });
    
    // Sync date picker selection to text input
    deadlineDatePicker.addEventListener('change', () => {
      if (deadlineDatePicker.value) {
        const [year, month, day] = deadlineDatePicker.value.split('-');
        deadlineDate.value = `${day}/${month}/${year}`;
        updateDateCheckmark();
      }
    });
  }

  // Priority button handlers
  const priorityButtons = document.querySelectorAll('.priority-btn');
  priorityButtons.forEach(button => {
    button.addEventListener('click', () => {
      priorityButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      selectedPriority = button.getAttribute('data-priority');
    });
  });

  // History button handler
  if (historyBtn) {
    historyBtn.addEventListener('click', toggleHistory);
  }

  // Priority filter button handlers
  const filterButtons = document.querySelectorAll('.filter-btn');
  filterButtons.forEach(button => {
    button.addEventListener('click', () => {
      const filter = button.getAttribute('data-filter');
      currentFilter = filter;
      
      // Update active state
      filterButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      
      // Refresh tasks
      fetchTasks();
    });
  });
};

// Set priority filter
function setPriorityFilter(filter) {
  currentFilter = filter;
  fetchTasks();
}

// Sync date picker value to text input format
function syncDatePickerToText() {
  if (deadlineDate && deadlineDatePicker) {
    const textValue = deadlineDate.value.trim();
    if (textValue && textValue.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      const [day, month, year] = textValue.split('/');
      deadlineDatePicker.value = `${year}-${month}-${day}`;
    }
  }
}
