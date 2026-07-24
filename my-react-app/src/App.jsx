import { useEffect, useState } from 'react'
import { usePostHog } from '@posthog/react'
import './App.css'

const API = 'http://localhost:3000'

export default function App() {
  const posthog = usePostHog()

  // users
  const [users, setUsers] = useState([])
  const [activeUser, setActiveUser] = useState(null)
  const [form, setForm] = useState({ name: '', favoriteGenre: '' })
  const [editingId, setEditingId] = useState(null)

  // movie search
  const [searchInput, setSearchInput] = useState('')
  const [movie, setMovie] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [favorites, setFavorites] = useState([])

  async function loadUsers() {
    try {
      const res = await fetch(`${API}/users`)
      const data = await res.json()
      setUsers(data)
    } catch (err) {
      setError('Could not load users')
    }
  }

  async function loadActive() {
    try {
      const res = await fetch(`${API}/users/active`)
      const data = await res.json()
      setActiveUser(data)
      if (data) {
        fetchFavorites(data.id)
        posthog?.identify(String(data.id), { name: data.name, favorite_genre: data.favoriteGenre })
      }
    } catch (err) {
      setError('Could not load active user')
    }
  }

  useEffect(() => {
    loadUsers()
    loadActive()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const url = editingId ? `${API}/users/${editingId}` : `${API}/users`
      const method = editingId ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Request failed')
      posthog?.capture(editingId ? 'user_updated' : 'user_created', { favorite_genre: form.favoriteGenre })
      setForm({ name: '', favoriteGenre: '' })
      setEditingId(null)
      await loadUsers()
      await loadActive()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function startEdit(user) {
    setEditingId(user.id)
    setForm({ name: user.name || '', favoriteGenre: user.favoriteGenre || '' })
  }

  async function setActive(userId) {
    try {
      const res = await fetch(`${API}/users/active`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Could not set active')
      }
      const selectedUser = users.find((u) => u.id === userId)
      if (activeUser && activeUser.id !== userId) {
        posthog?.reset()
      }
      posthog?.capture('active_user_set')
      if (selectedUser) {
        posthog?.identify(String(selectedUser.id), { name: selectedUser.name, favorite_genre: selectedUser.favoriteGenre })
      }
      await loadUsers()
      await loadActive()
    } catch (err) {
      setError(err.message)
    }
  }

  async function removeUser(id) {
    try {
      const res = await fetch(`${API}/users/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      posthog?.capture('user_deleted')
      if (activeUser && activeUser.id === id) {
        posthog?.reset()
      }
      await loadUsers()
      await loadActive()
    } catch (err) {
      setError(err.message)
    }
  }

  async function fetchFavorites(userId) {
    if (!userId) return setFavorites([])
    try {
      const res = await fetch(`${API}/users/${userId}/favorites`)
      const data = await res.json()
      setFavorites(data || [])
    } catch (err) {
      setError('Could not load favorites')
    }
  }

  async function handleSaveFavorite() {
    if (!activeUser || !movie) return
    try {
      await fetch(`${API}/users/${activeUser.id}/favorites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: movie.Title })
      })
      posthog?.capture('favorite_saved', { genre: movie.Genre, year: movie.Year })
      fetchFavorites(activeUser.id)
    } catch (err) {
      setError('Failed to save favorite')
    }
  }

  async function handleRemoveFavorite(title) {
    if (!activeUser) return
    try {
      await fetch(`${API}/users/${activeUser.id}/favorites`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title })
      })
      posthog?.capture('favorite_removed')
      fetchFavorites(activeUser.id)
    } catch (err) {
      setError('Failed to remove favorite')
    }
  }

  async function handleSearch(e) {
    e && e.preventDefault()
    if (!searchInput.trim()) return setError('Enter a title')
    setLoading(true)
    setError('')
    setMovie(null)
    try {
      const res = await fetch(`${API}/?title=${encodeURIComponent(searchInput)}`)
      const data = await res.json()
      if (data.Response === 'False') {
        setError(data.Error || 'Movie not found')
        posthog?.capture('movie_searched', { found: false })
      } else {
        setMovie(data)
        posthog?.capture('movie_searched', { found: true, genre: data.Genre, year: data.Year })
      }
    } catch (err) {
      setError('Could not fetch movie')
    } finally {
      setLoading(false)
    }
  }

  async function handleRandomMovie() {
    setLoading(true)
    setError('')
    setMovie(null)
    try {
      const res = await fetch(`${API}/random`)
      const data = await res.json()
      if (data.Response === 'False') {
        setError(data.Error || 'Movie not found')
        posthog?.capture('random_movie_requested', { found: false })
      } else {
        setMovie(data)
        posthog?.capture('random_movie_requested', { found: true, genre: data.Genre, year: data.Year })
      }
    } catch (err) {
      setError('Could not fetch movie')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app" style={{ maxWidth: 980, margin: '0 auto', padding: 20 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Movie Favorites</h1>
        <div>{activeUser ? `Active: ${activeUser.name}` : 'No active user'}</div>
      </header>

      {error && <p style={{ color: 'crimson' }}>{error}</p>}

      <div style={{ display: 'flex', gap: 24, marginTop: 16 }}>
        <aside style={{ width: 320 }}>
          <form onSubmit={handleSubmit} style={{ marginBottom: 16 }}>
            <h3>{editingId ? 'Edit user' : 'Create user'}</h3>
            <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input placeholder="Favorite genre" value={form.favoriteGenre} onChange={(e) => setForm({ ...form, favoriteGenre: e.target.value })} />
            <div style={{ marginTop: 8 }}>
              <button type="submit">{loading ? 'Saving...' : editingId ? 'Save' : 'Create'}</button>
              {editingId && <button type="button" onClick={() => { setEditingId(null); setForm({ name: '', favoriteGenre: '' }) }}>Cancel</button>}
            </div>
          </form>

          <div>
            <h3>Users</h3>
            {users.length === 0 && <div>No users yet</div>}
            {users.map((u) => (
              <div key={u.id} style={{ border: '1px solid #ddd', padding: 8, marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <strong>{u.name}</strong>
                    <div style={{ fontSize: 12 }}>{u.favoriteGenre}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {u.active && <span style={{ color: 'green' }}>Active</span>}
                    <button onClick={() => startEdit(u)}>Edit</button>
                    <button onClick={() => setActive(u.id)}>Make active</button>
                    <button onClick={() => removeUser(u.id)}>Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </aside>

        <main style={{ flex: 1 }}>
          <section style={{ marginBottom: 16 }}>
            <h2>Movie Search</h2>
            <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8 }}>
              <input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Enter movie title" />
              <button type="submit">Search</button>
              <button type="button" onClick={handleRandomMovie}>Random</button>
            </form>
            {loading && <p>Loading...</p>}
            {movie && (
              <div style={{ marginTop: 12 }}>
                <h3>{movie.Title}</h3>
                <p>{movie.Plot}</p>
                {movie.Poster && movie.Poster !== 'N/A' && <img src={movie.Poster} alt={movie.Title} style={{ maxWidth: 200 }} />}
                {activeUser && <div><button onClick={handleSaveFavorite}>Save to {activeUser.name}'s Favorites</button></div>}
              </div>
            )}
          </section>

          <section>
            <h2>Favorites</h2>
            {activeUser ? (
              favorites.length === 0 ? <div>No favorites</div> : (
                <ul>
                  {favorites.map((f) => (
                    <li key={f} style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>{f}</span>
                      <button onClick={() => handleRemoveFavorite(f)}>Remove</button>
                    </li>
                  ))}
                </ul>
              )
            ) : (
              <div>Select an active user to view favorites</div>
            )}
          </section>
        </main>
      </div>
    </div>
  )
}
