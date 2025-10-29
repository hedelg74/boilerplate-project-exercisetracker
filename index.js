const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// Base de datos en memoria (arrays)
let users = [];
let exercises = [];
let userIdCounter = 1;

// Función para generar IDs
function generateId() {
  return (userIdCounter++).toString();
}

// Servir página principal
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

// POST /api/users - Crear nuevo usuario
app.post('/api/users', (req, res) => {
  const { username } = req.body;
  
  if (!username) {
    return res.json({ error: 'Username is required' });
  }

  const newUser = {
    username: username,
    _id: generateId()
  };

  users.push(newUser);
  
  res.json({
    username: newUser.username,
    _id: newUser._id
  });
});

// GET /api/users - Obtener todos los usuarios
app.get('/api/users', (req, res) => {
  res.json(users);
});

// POST /api/users/:_id/exercises - Agregar ejercicio
app.post('/api/users/:_id/exercises', (req, res) => {
  const userId = req.params._id;
  const { description, duration, date } = req.body;

  // Buscar usuario
  const user = users.find(u => u._id === userId);
  if (!user) {
    return res.json({ error: 'User not found' });
  }

  // Validar campos requeridos
  if (!description || !duration) {
    return res.json({ error: 'Description and duration are required' });
  }

  // Procesar fecha
  const exerciseDate = date ? new Date(date) : new Date();

  // Crear ejercicio
  const newExercise = {
    userId: userId,
    description: description,
    duration: parseInt(duration),
    date: exerciseDate
  };

  exercises.push(newExercise);

  // Respuesta en el formato requerido
  res.json({
    username: user.username,
    description: newExercise.description,
    duration: newExercise.duration,
    date: newExercise.date.toDateString(),
    _id: user._id
  });
});

// GET /api/users/:_id/logs - Obtener log de ejercicios
app.get('/api/users/:_id/logs', (req, res) => {
  const userId = req.params._id;
  const { from, to, limit } = req.query;

  // Buscar usuario
  const user = users.find(u => u._id === userId);
  if (!user) {
    return res.json({ error: 'User not found' });
  }

  // Filtrar ejercicios del usuario
  let userExercises = exercises.filter(ex => ex.userId === userId);

  // Aplicar filtro 'from'
  if (from) {
    const fromDate = new Date(from);
    userExercises = userExercises.filter(ex => ex.date >= fromDate);
  }

  // Aplicar filtro 'to'
  if (to) {
    const toDate = new Date(to);
    userExercises = userExercises.filter(ex => ex.date <= toDate);
  }

  // Aplicar límite
  if (limit) {
    userExercises = userExercises.slice(0, parseInt(limit));
  }

  // Formatear log
  const log = userExercises.map(ex => ({
    description: ex.description,
    duration: ex.duration,
    date: ex.date.toDateString()
  }));

  // Respuesta en el formato requerido
  res.json({
    username: user.username,
    count: log.length,
    _id: user._id,
    log: log
  });
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📝 Visit http://localhost:${PORT}`);
});

// const listener = app.listen(process.env.PORT || 3000, () => {
//   console.log('Your app is listening on port ' + listener.address().port)
// })
