# API Server

A RESTful API server built with Node.js and Express demonstrating backend development with modern web technologies.

## Features

- 🚀 RESTful API endpoints
- 📝 CRUD operations for tasks
- 🔒 Input validation
- 📊 JSON data handling
- 🌐 CORS enabled
- 🎯 Error handling middleware
- 📝 Request logging

## Technologies

- Node.js
- Express.js (with built-in JSON parsing)
- CORS middleware

## API Endpoints

### Tasks API

- `GET /api/tasks` - Get all tasks
- `GET /api/tasks/:id` - Get a specific task
- `POST /api/tasks` - Create a new task
- `PUT /api/tasks/:id` - Update a task
- `DELETE /api/tasks/:id` - Delete a task

### Health Check

- `GET /api/health` - Server health check

## How to Run

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the server:
   ```bash
   npm start
   ```

3. Server will run on `http://localhost:3001`

For development with auto-reload:
```bash
npm run dev
```

## Testing the API

Using curl:

```bash
# Get all tasks
curl http://localhost:3001/api/tasks

# Create a new task
curl -X POST http://localhost:3001/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"My Task","description":"Task description"}'

# Get a specific task
curl http://localhost:3001/api/tasks/1

# Update a task
curl -X PUT http://localhost:3001/api/tasks/1 \
  -H "Content-Type: application/json" \
  -d '{"title":"Updated Task","completed":true}'

# Delete a task
curl -X DELETE http://localhost:3001/api/tasks/1
```

Or use tools like Postman, Insomnia, or your browser's developer tools.

## Project Structure

```
api-server/
├── routes/
│   └── tasks.js      # Task routes
├── server.js         # Main server file
├── package.json
└── README.md
```
