import { useState, useEffect } from 'react'
import Users from './Users'
import './App.css'

function App() {
  // state for search input, movie data, loading/error states
  const [searchInput, setSearchInput] = useState('')
  const [movie, setMovie] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // active user state, persisted in localStorage
  const [activeUser, setActiveUser] = useState(() => {
    const saved = localStorage.getItem('activeUser')
    return saved ? JSON.parse(saved) : null
  })

  // favorites for the active user
  const [favorites, setFavorites] = useState([])

  // sync active user to localStorage
  useEffect(() => {
    if (activeUser) {
      localStorage.setItem('activeUser', JSON.stringify(activeUser))
      fetchFavorites(activeUser.id)
    } else {
      localStorage.removeItem('activeUser')
      setFavorites([])
    }
  }, [activeUser])

  const fetchFavorites = async (userId) => {
    try {
      const res = await fetch(`http://localhost:3000/users/${userId}/favorites`)
      if (res.ok) {
        const data = await res.json()
        setFavorites(data)
      }
    } catch (err) {
      console.error('Failed to fetch favorites:', err)
    }
  }

  // handle search form submission
  const handleSearch = async (e) => {
    e.preventDefault()

    // make sure they actually typed something
    if (!searchInput.trim()) {
      setError('Please enter a movie title')
      return
    }

    setLoading(true)
    setError(null)
    setMovie(null)

    try {
      // call our backend which calls omdb
      const response = await fetch(`http://localhost:3000/?title=${searchInput}`)
      const data = await response.json()

      // omdb returns Response: 'False' if movie not found
      if (data.Response === 'False') {
        setError(data.Error || 'Movie not found')
      } else {
        setMovie(data)
      }
    } catch (err) {
      setError('Could not fetch movie information')
    } finally {
      setLoading(false)
    }
  }

  // fetch a random movie from the backend
  const handleRandomMovie = async () => {
    setLoading(true)
    setError(null)
    setMovie(null)

    try {
      // call the random endpoint which picks one for us
      const response = await fetch('http://localhost:3000/random')
      const data = await response.json()

      if (data.Response === 'False') {
        setError(data.Error || 'Movie not found')
      } else {
        setMovie(data)
      }
    } catch (err) {
      setError('Could not fetch movie')
    } finally {
      setLoading(false)
    }
  }

  // save the current movie as a favorite
  const handleSaveFavorite = async () => {
    if (!activeUser || !movie) return

    try {
      const res = await fetch(`http://localhost:3000/users/${activeUser.id}/favorites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: movie.Title }),
      })
      if (res.ok) {
        fetchFavorites(activeUser.id)
      }
    } catch (err) {
      console.error('Failed to save favorite:', err)
    }
  }

  // remove a movie from favorites
  const handleRemoveFavorite = async (title) => {
    if (!activeUser) return

    try {
      await fetch(`http://localhost:3000/users/${activeUser.id}/favorites`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      })
      fetchFavorites(activeUser.id)
    } catch (err) {
      console.error('Failed to remove favorite:', err)
    }
  }

  return (
    <div className="App">
      {/* active user bar */}
      <div className="active-user-bar">
        {activeUser ? (
          <span>Active user: <strong>{activeUser.name}</strong></span>
        ) : (
          <span>No active user selected</span>
        )}
      </div>

      <div className="main-layout">
        {/* sidebar: user management */}
        <aside className="sidebar">
          <Users activeUser={activeUser} setActiveUser={setActiveUser} />

          {/* favorites section */}
          {activeUser && (
            <div className="favorites-section">
              <h3>{activeUser.name}'s Favorites</h3>
              {favorites.length === 0 ? (
                <p className="no-favorites">No favorites yet</p>
              ) : (
                <ul className="favorites-list">
                  {favorites.map((title) => (
                    <li key={title}>
                      <span>{title}</span>
                      <button onClick={() => handleRemoveFavorite(title)} className="remove-btn">Remove</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </aside>

        {/* main content: movie search */}
        <main className="content">
          <h1>Movie Search</h1>
          {/* search form */}
          <form onSubmit={handleSearch}>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Enter movie title"
            />
            <button type="submit">Search</button>
          </form>
          {/* button to get a random movie */}
          <button type="button" onClick={handleRandomMovie}>
            Random Movie
          </button>

          {/* show loading spinner */}
          {loading && <p>Loading...</p>}
          {/* show error message if something went wrong */}
          {error && <p style={{ color: 'red' }}>{error}</p>}
          {/* display movie info if we got a result */}
          {movie && (
            <div className="movie-result">
              <h2>{movie.Title}</h2>
              <p>{movie.Plot}</p>
              {/* only show poster if it exists */}
              {movie.Poster && movie.Poster !== 'N/A' && (
                <img src={movie.Poster} alt={movie.Title} />
              )}
              {/* save to favorites button, only when a user is active */}
              {activeUser && (
                <button onClick={handleSaveFavorite} className="save-favorite-btn">
                  Save to Favorites
                </button>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default App
