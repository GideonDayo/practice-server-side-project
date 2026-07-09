const express = require('express');
const cors = require('cors');
require('dotenv').config();
const app = express();

// parse json requests and enable cors so react can call this from a different port
app.use(express.json());
app.use(cors());

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

app.listen(3000, () => {
    console.log('Server on http://localhost:3000');
});
