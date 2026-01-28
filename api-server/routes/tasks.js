const express = require('express');
const router = express.Router();

// In-memory data store (in a real app, this would be a database)
let tasks = [
  {
    id: 1,
    title: 'Learn Node.js',
    description: 'Study Node.js fundamentals and best practices',
    completed: false,
    createdAt: new Date().toISOString()
  },
  {
    id: 2,
    title: 'Build REST API',
    description: 'Create a RESTful API with Express',
    completed: false,
    createdAt: new Date().toISOString()
  }
];

let nextId = 3;

// GET all tasks
router.get('/', (req, res) => {
  const { completed } = req.query;
  
  let filteredTasks = tasks;
  if (completed !== undefined) {
    const isCompleted = completed === 'true';
    filteredTasks = tasks.filter(task => task.completed === isCompleted);
  }
  
  res.json({
    success: true,
    count: filteredTasks.length,
    data: filteredTasks
  });
});

// GET a specific task
router.get('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const task = tasks.find(t => t.id === id);
  
  if (!task) {
    return res.status(404).json({
      success: false,
      error: 'Task not found'
    });
  }
  
  res.json({
    success: true,
    data: task
  });
});

// POST create a new task
router.post('/', (req, res) => {
  const { title, description } = req.body;
  
  if (!title) {
    return res.status(400).json({
      success: false,
      error: 'Title is required'
    });
  }
  
  const newTask = {
    id: nextId++,
    title,
    description: description || '',
    completed: false,
    createdAt: new Date().toISOString()
  };
  
  tasks.push(newTask);
  
  res.status(201).json({
    success: true,
    message: 'Task created successfully',
    data: newTask
  });
});

// PUT update a task
router.put('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const taskIndex = tasks.findIndex(t => t.id === id);
  
  if (taskIndex === -1) {
    return res.status(404).json({
      success: false,
      error: 'Task not found'
    });
  }
  
  const { title, description, completed } = req.body;
  
  if (title !== undefined) tasks[taskIndex].title = title;
  if (description !== undefined) tasks[taskIndex].description = description;
  if (completed !== undefined) tasks[taskIndex].completed = completed;
  tasks[taskIndex].updatedAt = new Date().toISOString();
  
  res.json({
    success: true,
    message: 'Task updated successfully',
    data: tasks[taskIndex]
  });
});

// DELETE a task
router.delete('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const taskIndex = tasks.findIndex(t => t.id === id);
  
  if (taskIndex === -1) {
    return res.status(404).json({
      success: false,
      error: 'Task not found'
    });
  }
  
  const deletedTask = tasks.splice(taskIndex, 1)[0];
  
  res.json({
    success: true,
    message: 'Task deleted successfully',
    data: deletedTask
  });
});

module.exports = router;
