import React, { useState, useEffect } from 'react';

const ExerciseTracker = () => {
  const [users, setUsers] = useState([]);
  const [newUsername, setNewUsername] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [exercise, setExercise] = useState({
    description: '',
    duration: '',
    date: ''
  });
  const [logParams, setLogParams] = useState({
    userId: '',
    from: '',
    to: '',
    limit: ''
  });
  const [logResult, setLogResult] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const result = await window.storage.list('user:');
      if (result && result.keys) {
        const userPromises = result.keys.map(async (key) => {
          const data = await window.storage.get(key);
          return data ? JSON.parse(data.value) : null;
        });
        const loadedUsers = (await Promise.all(userPromises)).filter(u => u);
        setUsers(loadedUsers);
      }
    } catch (error) {
      console.log('No users found yet');
    }
  };

  const generateId = () => {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  };

  const createUser = async () => {
    if (!newUsername.trim()) {
      setMessage('Please enter a username');
      return;
    }

    const newUser = {
      username: newUsername.trim(),
      _id: generateId()
    };

    try {
      await window.storage.set(`user:${newUser._id}`, JSON.stringify(newUser));
      setUsers([...users, newUser]);
      setMessage(`User created: ${JSON.stringify(newUser)}`);
      setNewUsername('');
      setSelectedUserId(newUser._id);
    } catch (error) {
      setMessage('Error creating user');
    }
  };

  const addExercise = async () => {
    if (!selectedUserId || !exercise.description || !exercise.duration) {
      setMessage('Please fill in user, description, and duration');
      return;
    }

    const user = users.find(u => u._id === selectedUserId);
    if (!user) {
      setMessage('User not found');
      return;
    }

    const exerciseDate = exercise.date 
      ? new Date(exercise.date) 
      : new Date();

    const newExercise = {
      username: user.username,
      description: exercise.description,
      duration: parseInt(exercise.duration),
      date: exerciseDate.toDateString(),
      _id: user._id
    };

    try {
      let exercisesData = [];
      try {
        const result = await window.storage.get(`exercises:${selectedUserId}`);
        if (result) {
          exercisesData = JSON.parse(result.value);
        }
      } catch (error) {
        // No exercises yet
      }

      exercisesData.push({
        description: newExercise.description,
        duration: newExercise.duration,
        date: newExercise.date,
        timestamp: exerciseDate.getTime()
      });

      await window.storage.set(`exercises:${selectedUserId}`, JSON.stringify(exercisesData));
      
      setMessage(`Exercise added: ${JSON.stringify(newExercise)}`);
      setExercise({ description: '', duration: '', date: '' });
    } catch (error) {
      setMessage('Error adding exercise');
    }
  };

  const getUserLog = async () => {
    if (!logParams.userId) {
      setMessage('Please select a user for log');
      return;
    }

    const user = users.find(u => u._id === logParams.userId);
    if (!user) {
      setMessage('User not found');
      return;
    }

    try {
      let exercisesData = [];
      try {
        const result = await window.storage.get(`exercises:${logParams.userId}`);
        if (result) {
          exercisesData = JSON.parse(result.value);
        }
      } catch (error) {
        // No exercises
      }

      let filteredExercises = [...exercisesData];

      if (logParams.from) {
        const fromDate = new Date(logParams.from).getTime();
        filteredExercises = filteredExercises.filter(ex => ex.timestamp >= fromDate);
      }

      if (logParams.to) {
        const toDate = new Date(logParams.to).getTime();
        filteredExercises = filteredExercises.filter(ex => ex.timestamp <= toDate);
      }

      if (logParams.limit) {
        filteredExercises = filteredExercises.slice(0, parseInt(logParams.limit));
      }

      const log = filteredExercises.map(({ description, duration, date }) => ({
        description,
        duration,
        date
      }));

      const result = {
        username: user.username,
        count: log.length,
        _id: user._id,
        log
      };

      setLogResult(result);
      setMessage(`Log retrieved: ${log.length} exercises`);
    } catch (error) {
      setMessage('Error retrieving log');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-5xl font-bold text-gray-800 mb-8">Exercise Tracker</h1>
        
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div className="bg-green-400 rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">Create a New User</h2>
            <div className="bg-yellow-100 text-sm font-mono p-2 rounded mb-3">
              POST /api/users
            </div>
            <input
              type="text"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && createUser()}
              placeholder="username"
              className="w-full p-3 border-2 border-gray-300 rounded mb-3"
            />
            <button 
              onClick={createUser}
              className="w-full bg-gray-100 hover:bg-gray-200 p-3 rounded font-semibold text-gray-800 transition"
            >
              Submit
            </button>
          </div>

          <div className="bg-green-400 rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">Add exercises</h2>
            <div className="bg-yellow-100 text-sm font-mono p-2 rounded mb-3">
              POST /api/users/:_id/exercises
            </div>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full p-3 border-2 border-gray-300 rounded mb-3"
            >
              <option value="">Select User (_id)</option>
              {users.map(user => (
                <option key={user._id} value={user._id}>
                  {user.username} ({user._id})
                </option>
              ))}
            </select>
            <input
              type="text"
              value={exercise.description}
              onChange={(e) => setExercise({...exercise, description: e.target.value})}
              placeholder="description*"
              className="w-full p-3 border-2 border-gray-300 rounded mb-3"
            />
            <input
              type="number"
              value={exercise.duration}
              onChange={(e) => setExercise({...exercise, duration: e.target.value})}
              placeholder="duration* (mins.)"
              className="w-full p-3 border-2 border-gray-300 rounded mb-3"
            />
            <input
              type="date"
              value={exercise.date}
              onChange={(e) => setExercise({...exercise, date: e.target.value})}
              className="w-full p-3 border-2 border-gray-300 rounded mb-3"
            />
            <button 
              onClick={addExercise}
              className="w-full bg-gray-100 hover:bg-gray-200 p-3 rounded font-semibold text-gray-800 transition"
            >
              Submit
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4 text-gray-800">GET user's exercise log</h2>
          <div className="space-y-3">
            <div className="bg-gray-100 text-sm font-mono p-2 rounded">
              GET /api/users/:_id/logs?[from][&to][&limit]
            </div>
            <div className="text-sm text-gray-600 mb-2">
              [ ] = optional | <strong>from, to</strong> = dates (yyyy-mm-dd); <strong>limit</strong> = number
            </div>
            <select
              value={logParams.userId}
              onChange={(e) => setLogParams({...logParams, userId: e.target.value})}
              className="w-full p-3 border-2 border-gray-300 rounded"
            >
              <option value="">Select User (_id)</option>
              {users.map(user => (
                <option key={user._id} value={user._id}>
                  {user.username} ({user._id})
                </option>
              ))}
            </select>
            <div className="grid md:grid-cols-3 gap-3">
              <input
                type="date"
                value={logParams.from}
                onChange={(e) => setLogParams({...logParams, from: e.target.value})}
                placeholder="from (optional)"
                className="p-3 border-2 border-gray-300 rounded"
              />
              <input
                type="date"
                value={logParams.to}
                onChange={(e) => setLogParams({...logParams, to: e.target.value})}
                placeholder="to (optional)"
                className="p-3 border-2 border-gray-300 rounded"
              />
              <input
                type="number"
                value={logParams.limit}
                onChange={(e) => setLogParams({...logParams, limit: e.target.value})}
                placeholder="limit (optional)"
                className="p-3 border-2 border-gray-300 rounded"
              />
            </div>
            <button 
              onClick={getUserLog}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded font-semibold transition"
            >
              Get Exercise Log
            </button>
          </div>
        </div>

        {message && (
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4 rounded">
            <p className="font-mono text-sm text-gray-800 break-words">{message}</p>
          </div>
        )}

        {logResult && (
          <div className="bg-green-50 border-l-4 border-green-500 p-6 rounded-lg mb-6">
            <h3 className="text-xl font-bold mb-3 text-gray-800">Exercise Log Result:</h3>
            <pre className="bg-white p-4 rounded overflow-x-auto text-sm">
              {JSON.stringify(logResult, null, 2)}
            </pre>
          </div>
        )}

        {users.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-bold mb-3 text-gray-800">Registered Users:</h3>
            <div className="space-y-2">
              {users.map(user => (
                <div key={user._id} className="bg-gray-50 p-3 rounded">
                  <span className="font-semibold">{user.username}</span>
                  <span className="text-gray-500 text-sm ml-2">ID: {user._id}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExerciseTracker;