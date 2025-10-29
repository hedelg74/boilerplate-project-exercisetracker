// server.js
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/exercise-tracker', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Schemas
const userSchema = new mongoose.Schema({
  username: { type: String, required: true }
});

const exerciseSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Exercise = mongoose.model('Exercise', exerciseSchema);

// Routes

// Home page
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

// POST /api/users - Create new user
app.post('/api/users', async (req, res) => {
  try {
    const { username } = req.body;
    
    if (!username) {
      return res.json({ error: 'Username is required' });
    }

    const newUser = new User({ username });
    const savedUser = await newUser.save();
    
    res.json({
      username: savedUser.username,
      _id: savedUser._id
    });
  } catch (error) {
    res.json({ error: error.message });
  }
});

// GET /api/users - Get all users
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}).select('_id username');
    res.json(users);
  } catch (error) {
    res.json({ error: error.message });
  }
});

// POST /api/users/:_id/exercises - Add exercise
app.post('/api/users/:_id/exercises', async (req, res) => {
  try {
    const userId = req.params._id;
    const { description, duration, date } = req.body;

    // Validate user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.json({ error: 'User not found' });
    }

    // Validate required fields
    if (!description || !duration) {
      return res.json({ error: 'Description and duration are required' });
    }

    // Parse date or use current date
    const exerciseDate = date ? new Date(date) : new Date();

    // Create exercise
    const newExercise = new Exercise({
      userId: userId,
      description: description,
      duration: parseInt(duration),
      date: exerciseDate
    });

    const savedExercise = await newExercise.save();

    res.json({
      username: user.username,
      description: savedExercise.description,
      duration: savedExercise.duration,
      date: savedExercise.date.toDateString(),
      _id: user._id
    });
  } catch (error) {
    res.json({ error: error.message });
  }
});

// GET /api/users/:_id/logs - Get user exercise log
app.get('/api/users/:_id/logs', async (req, res) => {
  try {
    const userId = req.params._id;
    const { from, to, limit } = req.query;

    // Validate user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.json({ error: 'User not found' });
    }

    // Build query filter
    let filter = { userId: userId };

    if (from || to) {
      filter.date = {};
      if (from) {
        filter.date.$gte = new Date(from);
      }
      if (to) {
        filter.date.$lte = new Date(to);
      }
    }

    // Query exercises
    let exercisesQuery = Exercise.find(filter).select('description duration date -_id');

    // Apply limit if provided
    if (limit) {
      exercisesQuery = exercisesQuery.limit(parseInt(limit));
    }

    const exercises = await exercisesQuery.exec();

    // Format response
    const log = exercises.map(ex => ({
      description: ex.description,
      duration: ex.duration,
      date: ex.date.toDateString()
    }));

    res.json({
      username: user.username,
      count: exercises.length,
      _id: user._id,
      log: log
    });
  } catch (error) {
    res.json({ error: error.message });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});