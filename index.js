const express = require('express');
const cors = require('cors');
const { createClient } = require('redis');
require('dotenv').config();
const app = express();

// parse json requests and enable cors so react can call this from a different port
app.use(express.json());
app.use(cors());

// redis client setup
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const redis = createClient({ url: redisUrl });
redis.on('error', (err) => console.error('Redis error:', err.message || err));
redis.connect()
  .then(() => console.log('Connected to Redis'))
  .catch((err) => console.error('Redis connection failed:', err.message || err));

// search endpoint - takes a movie title and fetches from omdb
app.get("/", async (req, res) => {
    const title = req.query.title;

    try {
        // call omdb api with the title from query params
        const response = await fetch(`http://www.omdbapi.com/?apikey=${process.env.API_KEY}&t=${title}`);
        const data = await response.json();
        // send whatever omdb gives us back to the frontend
        res.json(data);
    } catch (err) {
        console.error("Error:", err.message);
        // if something breaks on our end, tell the frontend
        res.status(500).json({ error: 'Could not fetch movie information' });
    }

});

// random movie endpoint - picks a random movie from our list and fetches it
app.get("/random", async (req, res) => {
  const movies = ['Inception', 'The Matrix', 'Interstellar', 'Tenet', 'Oppenheimer']
  // grab a random movie from the array
  const randomTitle = movies[Math.floor(Math.random() * movies.length)]

  // fetch it from omdb like normal
  const response = await fetch(`http://www.omdbapi.com/?apikey=${process.env.API_KEY}&t=${randomTitle}`)
  const data = await response.json()
  res.json(data)
})

// --- User endpoints ---

// create a new user
app.post('/users', async (req, res) => {
  try {
    const { name, favoriteGenre } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    const id = Date.now().toString(36);
    const user = { id, name, favoriteGenre: favoriteGenre || '', createdAt: new Date().toISOString() };

    await redis.sAdd('users', id);
    await redis.hSet(`user:${id}`, user);

    res.status(201).json(user);
  } catch (err) {
    console.error('Error creating user:', err.message);
    res.status(500).json({ error: 'Could not create user' });
  }
});

// list all users
app.get('/users', async (req, res) => {
  try {
    const ids = await redis.sMembers('users');
    const users = await Promise.all(
      ids.map((id) => redis.hGetAll(`user:${id}`))
    );
    // filter out any empty results (deleted keys)
    res.json(users.filter((u) => u && u.id));
  } catch (err) {
    console.error('Error listing users:', err.message);
    res.status(500).json({ error: 'Could not list users' });
  }
});

// get/set active user (placed before /users/:id to avoid route conflicts)
app.get('/users/active', async (req, res) => {
  try {
    const id = await redis.get('activeUser');
    if (!id) return res.json(null);
    const user = await redis.hGetAll(`user:${id}`);
    if (!user || !user.id) return res.json(null);
    res.json(user);
  } catch (err) {
    console.error('Error getting active user:', err.message);
    res.status(500).json({ error: 'Could not get active user' });
  }
});

app.post('/users/active', async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await redis.hGetAll(`user:${userId}`);
    if (!user || !user.id) return res.status(404).json({ error: 'User not found' });
    await redis.set('activeUser', userId);
    res.json({ userId, message: 'Active user updated' });
  } catch (err) {
    console.error('Error setting active user:', err.message);
    res.status(500).json({ error: 'Could not set active user' });
  }
});

// get one user
app.get('/users/:id', async (req, res) => {
  try {
    const user = await redis.hGetAll(`user:${req.params.id}`);
    if (!user || !user.id) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    console.error('Error getting user:', err.message);
    res.status(500).json({ error: 'Could not get user' });
  }
});

// update a user
app.put('/users/:id', async (req, res) => {
  try {
    const existing = await redis.hGetAll(`user:${req.params.id}`);
    if (!existing || !existing.id) return res.status(404).json({ error: 'User not found' });

    const { name, favoriteGenre } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (favoriteGenre !== undefined) updates.favoriteGenre = favoriteGenre;

    if (Object.keys(updates).length > 0) {
      await redis.hSet(`user:${req.params.id}`, updates);
    }

    const updated = await redis.hGetAll(`user:${req.params.id}`);
    res.json(updated);
  } catch (err) {
    console.error('Error updating user:', err.message);
    res.status(500).json({ error: 'Could not update user' });
  }
});

// delete a user
app.delete('/users/:id', async (req, res) => {
  try {
    await redis.sRem('users', req.params.id);
    await redis.del(`user:${req.params.id}`);
    await redis.del(`user:${req.params.id}:favorites`);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting user:', err.message);
    res.status(500).json({ error: 'Could not delete user' });
  }
});

// get/set active user
app.get('/users/active', async (req, res) => {
  try {
    const id = await redis.get('activeUser');
    if (!id) return res.json(null);
    const user = await redis.hGetAll(`user:${id}`);
    if (!user || !user.id) return res.json(null);
    res.json(user);
  } catch (err) {
    console.error('Error getting active user:', err.message);
    res.status(500).json({ error: 'Could not get active user' });
  }
});

app.post('/users/active', async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await redis.hGetAll(`user:${userId}`);
    if (!user || !user.id) return res.status(404).json({ error: 'User not found' });
    await redis.set('activeUser', userId);
    res.json({ userId, message: 'Active user updated' });
  } catch (err) {
    console.error('Error setting active user:', err.message);
    res.status(500).json({ error: 'Could not set active user' });
  }
});

// --- Favorites endpoints ---

// add a favorite movie
app.post('/users/:id/favorites', async (req, res) => {
  try {
    const { title } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });

    const user = await redis.hGetAll(`user:${req.params.id}`);
    if (!user || !user.id) return res.status(404).json({ error: 'User not found' });

    await redis.sAdd(`user:${req.params.id}:favorites`, title);
    res.status(201).json({ success: true, title });
  } catch (err) {
    console.error('Error adding favorite:', err.message);
    res.status(500).json({ error: 'Could not add favorite' });
  }
});

// get favorites for a user
app.get('/users/:id/favorites', async (req, res) => {
  try {
    const user = await redis.hGetAll(`user:${req.params.id}`);
    if (!user || !user.id) return res.status(404).json({ error: 'User not found' });

    const favorites = await redis.sMembers(`user:${req.params.id}:favorites`);
    res.json(favorites);
  } catch (err) {
    console.error('Error getting favorites:', err.message);
    res.status(500).json({ error: 'Could not get favorites' });
  }
});

// remove a favorite movie
app.delete('/users/:id/favorites', async (req, res) => {
  try {
    const { title } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });

    await redis.sRem(`user:${req.params.id}:favorites`, title);
    res.json({ success: true });
  } catch (err) {
    console.error('Error removing favorite:', err.message);
    res.status(500).json({ error: 'Could not remove favorite' });
  }
});

app.listen(3000, () => {
    console.log('Server on http://localhost:3000');
});
