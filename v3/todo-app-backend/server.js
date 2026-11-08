const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

// Initialize the app
const app = express();
app.use(express.json()); // To parse JSON request bodies
app.use(cors()); // Allow cross-origin requests from your frontend

// Set up the PostgreSQL connection pool
const pool = new Pool({
  user: 'akash', // PostgreSQL user
  host: 'localhost', // Host where PostgreSQL is running
  database: 'todolist', // Database name
  password: 'akash', // Your PostgreSQL password
  port: 5432, // Default PostgreSQL port
});

// Routes

// Get all tasks
app.get('/tasks', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tasks');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ message: 'Error fetching tasks' });
  }
});

// Add a new task
app.post('/tasks', async (req, res) => {
  const { name, deadline } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO tasks (name, deadline) VALUES ($1, $2) RETURNING *',
      [name, deadline ? new Date(deadline) : null]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding task:', error);
    res.status(500).json({ message: 'Error adding task' });
  }
});

// Delete a task
app.delete('/tasks/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM tasks WHERE id = $1', [id]);
    res.status(200).json({ message: 'Task deleted' });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ message: 'Error deleting task' });
  }
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
