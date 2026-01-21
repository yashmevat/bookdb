// app/dashboard/authors/page.jsx
'use client';
import { useState, useEffect } from 'react';

export default function AuthorsPage() {
  const [authors, setAuthors] = useState([]);
  const [formData, setFormData] = useState({ username: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAuthors();
  }, []);

  const fetchAuthors = async () => {
    const res = await fetch('/api/authors');
    const data = await res.json();
    if (data.success) setAuthors(data.data);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const res = await fetch('/api/authors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    
    const data = await res.json();
    if (data.success) {
      setFormData({ username: '', email: '', password: '' });
      fetchAuthors();
      alert('Author created successfully!');
    } else {
      alert('Error: ' + data.error);
    }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this author?')) return;
    
    const res = await fetch(`/api/authors?id=${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) fetchAuthors();
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">Manage Authors</h1>
      
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-xl font-semibold mb-4">Add New Author</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Username</label>
            <input
              type="text"
              placeholder="Enter username"
              className="w-full px-4 py-2 border rounded"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <input
              type="email"
              placeholder="Enter email"
              className="w-full px-4 py-2 border rounded"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Password</label>
            <input
              type="password"
              placeholder="Enter password"
              className="w-full px-4 py-2 border rounded"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? 'Adding...' : 'Add Author'}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-6 py-3 text-left">ID</th>
              <th className="px-6 py-3 text-left">Username</th>
              <th className="px-6 py-3 text-left">Email</th>
              <th className="px-6 py-3 text-left">Created At</th>
              <th className="px-6 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {authors.map((author) => (
              <tr key={author.id} className="border-t hover:bg-gray-50">
                <td className="px-6 py-4">{author.id}</td>
                <td className="px-6 py-4">{author.username}</td>
                <td className="px-6 py-4">{author.email}</td>
                <td className="px-6 py-4">{new Date(author.created_at).toLocaleDateString()}</td>
                <td className="px-6 py-4">
                  <button 
                    onClick={() => handleDelete(author.id)}
                    className="px-4 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
