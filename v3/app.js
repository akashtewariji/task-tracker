const taskInput = document.getElementById("task-input");
const deadlineInput = document.getElementById("deadline-input");
const addBtn = document.getElementById("add-btn");
const taskList = document.getElementById("task-list");

// Fetch tasks from the backend
async function fetchTasks() {
  try {
    const response = await fetch('http://localhost:5000/tasks');
    const tasks = await response.json();
    renderTasks(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
  }
}

// Render tasks
function renderTasks(tasks) {
  taskList.innerHTML = "";
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
      <button onclick="deleteTask('${task.id}')">Delete</button>
    `;
    taskList.appendChild(li);
  });
}

// Add a task to the backend
async function addTask() {
  const taskName = taskInput.value.trim();
  const deadline = deadlineInput.value;

  if (taskName !== "") {
    try {
      const response = await fetch('http://localhost:5000/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: taskName, deadline })
      });
      const newTask = await response.json();
      taskInput.value = "";
      deadlineInput.value = "";
      fetchTasks(); // Re-fetch tasks after adding a new one
    } catch (error) {
      console.error('Error adding task:', error);
    }
  }
}

// Delete a task from the backend
async function deleteTask(id) {
  try {
    await fetch(`http://localhost:5000/tasks/${id}`, { method: 'DELETE' });
    fetchTasks(); // Re-fetch tasks after deletion
  } catch (error) {
    console.error('Error deleting task:', error);
  }
}

// Fetch tasks initially
fetchTasks();

// Add task when button is clicked
addBtn.addEventListener("click", addTask);

// Add task when Enter key is pressed
taskInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    addTask();
  }
});

async function fetchTasks() {
  try {
    const response = await fetch('http://localhost:5000/tasks');
    const tasks = await response.json();
    console.log("Tasks from backend:", tasks); // Log the tasks to the console
    renderTasks(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
  }
}
// Function to calculate the countdown to the deadline
function getCountdown(deadline) {
  const now = new Date();
  const deadlineDate = new Date(deadline);
  const timeDifference = deadlineDate - now;

  if (timeDifference <= 0) {
    return "Deadline passed";
  }

  const days = Math.floor(timeDifference / (1000 * 60 * 60 * 24)); // Convert time difference to days
  const hours = Math.floor((timeDifference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)); // Hours
  const minutes = Math.floor((timeDifference % (1000 * 60 * 60)) / (1000 * 60)); // Minutes
  const seconds = Math.floor((timeDifference % (1000 * 60)) / 1000); // Seconds

  return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}
