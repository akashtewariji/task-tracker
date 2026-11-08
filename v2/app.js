// Get DOM elements
const taskInput = document.getElementById("task-input");
const deadlineInput = document.getElementById("deadline-input");
const addBtn = document.getElementById("add-btn");
const taskList = document.getElementById("task-list");

// Load tasks from localStorage if available
let tasks = JSON.parse(localStorage.getItem("tasks")) || [];

// Display tasks on page load
function renderTasks() {
  taskList.innerHTML = "";
  tasks.forEach((task, index) => {
    const li = document.createElement("li");

    // Display task name, timestamp, and countdown timer
    const creationTime = new Date(task.createdAt).toLocaleString();
    const deadlineTime = task.deadline ? new Date(task.deadline).toLocaleString() : "No Deadline";
    const countdown = task.deadline ? getCountdown(task.deadline) : "N/A";

    li.innerHTML = `
      ${task.name} 
      <span class="timestamp">Created at: ${creationTime}</span> 
      <br>
      <span class="deadline">Deadline: ${deadlineTime}</span>
      <br>
      <span class="countdown">Countdown: ${countdown}</span>
      <button onclick="removeTask(${index})">Delete</button>
    `;
    taskList.appendChild(li);
  });
  startCountdowns(); // Start countdowns when tasks are rendered
}

// Function to get the countdown for the task
function getCountdown(deadline) {
  const now = new Date().getTime();
  const distance = new Date(deadline).getTime() - now;
  
  if (distance < 0) {
    return "Deadline passed";
  }

  const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((distance % (1000 * 60)) / 1000);

  return `${hours}h ${minutes}m ${seconds}s`;
}

// Update countdown timers every second
function startCountdowns() {
  setInterval(() => {
    renderTasks(); // Re-render tasks every second to update countdown
  }, 1000);
}

// Add a task
function addTask() {
  const taskName = taskInput.value.trim();
  const deadline = deadlineInput.value;
  
  if (taskName !== "") {
    const createdAt = new Date().getTime();
    const task = {
      name: taskName,
      createdAt: createdAt,
      deadline: deadline ? new Date(deadline).getTime() : null, // Null if no deadline
    };

    tasks.push(task);
    localStorage.setItem("tasks", JSON.stringify(tasks));
    taskInput.value = "";
    deadlineInput.value = "";
    renderTasks();
  }
}

// Remove a task
function removeTask(index) {
  tasks.splice(index, 1);
  localStorage.setItem("tasks", JSON.stringify(tasks));
  renderTasks();
}

// Add task when button is clicked
addBtn.addEventListener("click", addTask);

// Add task when Enter key is pressed
taskInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    addTask();
  }
});

// Render tasks on initial load
renderTasks();
