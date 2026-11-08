// Get DOM elements
const taskInput = document.getElementById("taskInput");
const deadlineInput = document.getElementById("deadlineInput");
const taskList = document.getElementById("taskList");

// Fetch tasks from localStorage
function fetchTasks() {
  const tasks = JSON.parse(localStorage.getItem('tasks')) || []; // Get tasks from localStorage
  renderTasks(tasks); // Render the tasks
}

// Render tasks in the DOM
function renderTasks(tasks) {
  taskList.innerHTML = "";  // Clear the task list before rendering

  tasks.forEach((task) => {
    const creationTime = new Date(task.created_at).toLocaleString();
    const deadlineTime = task.deadline ? new Date(task.deadline).toLocaleString() : "No Deadline";
    const countdown = task.deadline ? getCountdown(task.deadline) : "N/A";

    const li = document.createElement("li");
    li.innerHTML = `
      ${task.name} 
      <span class="timestamp">Created at: ${creationTime}</span> 
      <br>
      <span class="deadline">Deadline: ${deadlineTime}</span>
      <br>
      <span class="countdown">Countdown: ${countdown}</span>
      <button class="delete" onclick="deleteTask(${task.id})">Delete</button>
    `;
    taskList.appendChild(li);
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

// Add a new task
function addTask() {
  const taskName = taskInput.value.trim();
  const deadline = deadlineInput.value;

  if (taskName !== "") {
    const newTask = {
      id: Date.now(), // Use timestamp as unique task ID
      name: taskName,
      created_at: new Date().toISOString(),
      deadline: deadline ? new Date(deadline).toISOString() : null
    };

    const tasks = JSON.parse(localStorage.getItem('tasks')) || []; // Get existing tasks
    tasks.push(newTask); // Add the new task
    localStorage.setItem('tasks', JSON.stringify(tasks)); // Store tasks in localStorage

    taskInput.value = "";
    deadlineInput.value = "";
    fetchTasks(); // Re-fetch and render tasks
  }
}

// Delete a task
function deleteTask(taskId) {
  const tasks = JSON.parse(localStorage.getItem('tasks')) || []; // Get tasks from localStorage
  const updatedTasks = tasks.filter(task => task.id !== taskId); // Remove the task by ID
  localStorage.setItem('tasks', JSON.stringify(updatedTasks)); // Update tasks in localStorage
  fetchTasks(); // Re-fetch and render tasks
}

// Load tasks when the page is loaded
window.onload = fetchTasks;
