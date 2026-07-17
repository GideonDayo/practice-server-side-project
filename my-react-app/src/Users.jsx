import { useState, useEffect } from 'react'

function Users({ activeUser, setActiveUser }) {
  const [users, setUsers] = useState([])
  const [name, setName] = useState('')
  const [favoriteGenre, setFavoriteGenre] = useState('')
  const [editingUser, setEditingUser] = useState(null)
  const [editName, setEditName] = useState('')
  const [editGenre, setEditGenre] = useState('')

  // fetch all users on mount
  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const res = await fetch('http://localhost:3000/users')
      const data = await res.json()
      setUsers(data)
    } catch (err) {
      console.error('Failed to fetch users:', err)
    }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!name.trim()) return

    try {
      const res = await fetch('http://localhost:3000/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, favoriteGenre }),
      })
      if (res.ok) {
        setName('')
        setFavoriteGenre('')
        fetchUsers()
      }
    } catch (err) {
      console.error('Failed to create user:', err)
    }
  }

  const handleDelete = async (id) => {
    try {
      await fetch(`http://localhost:3000/users/${id}`, { method: 'DELETE' })
      // if the deleted user was active, clear active user
      if (activeUser && activeUser.id === id) {
        setActiveUser(null)
      }
      fetchUsers()
    } catch (err) {
      console.error('Failed to delete user:', err)
    }
  }

  const startEdit = (user) => {
    setEditingUser(user.id)
    setEditName(user.name)
    setEditGenre(user.favoriteGenre || '')
  }

  const handleUpdate = async (e) => {
    e.preventDefault()
    try {
      const res = await fetch(`http://localhost:3000/users/${editingUser}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName, favoriteGenre: editGenre }),
      })
      if (res.ok) {
        setEditingUser(null)
        fetchUsers()
        // update active user if we just edited them
        if (activeUser && activeUser.id === editingUser) {
          const updated = await res.json()
          setActiveUser(updated)
        }
      }
    } catch (err) {
      console.error('Failed to update user:', err)
    }
  }

  return (
    <div className="users-panel">
      <h2>Users</h2>

      <form onSubmit={handleCreate} className="user-form">
        <input
          type="text"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          type="text"
          placeholder="Favorite genre"
          value={favoriteGenre}
          onChange={(e) => setFavoriteGenre(e.target.value)}
        />
        <button type="submit">Create User</button>
      </form>

      <ul className="user-list">
        {users.map((user) => (
          <li key={user.id} className={`user-item ${activeUser && activeUser.id === user.id ? 'active' : ''}`}>
            {editingUser === user.id ? (
              <form onSubmit={handleUpdate} className="edit-form">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
                <input
                  type="text"
                  value={editGenre}
                  onChange={(e) => setEditGenre(e.target.value)}
                  placeholder="Favorite genre"
                />
                <button type="submit">Save</button>
                <button type="button" onClick={() => setEditingUser(null)}>Cancel</button>
              </form>
            ) : (
              <div className="user-info">
                <span className="user-name">{user.name}</span>
                {user.favoriteGenre && <span className="user-genre">{user.favoriteGenre}</span>}
                <div className="user-actions">
                  <button onClick={() => setActiveUser(user)}>
                    {activeUser && activeUser.id === user.id ? 'Active' : 'Set Active'}
                  </button>
                  <button onClick={() => startEdit(user)}>Edit</button>
                  <button onClick={() => handleDelete(user.id)} className="delete-btn">Delete</button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default Users
