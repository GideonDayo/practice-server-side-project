import { useState } from 'react'
import './App.css'

function App() {
  // state for search input, movie data, loading/error states
  const [count, setCount] = useState(0)
  const [searchInput, setSearchInput] = useState('')
  const [movie, setMovie] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // handle search form submission
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
        setError(data.error)
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

  return (
    <div className="App">
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
        <div>
          <h2>{movie.Title}</h2>
          <p>{movie.Plot}</p>
          {/* only show poster if it exists */}
          {movie.Poster && movie.Poster !== 'N/A' && (
            <img src={movie.Poster} alt={movie.Title} />
          )}
        </div>
      )}
    </div>
  )

}

export default App