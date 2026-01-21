// app/dashboard/mappings/page.jsx
'use client';
import { useState, useEffect } from 'react';

export default function MappingsPage() {
  const [mappings, setMappings] = useState([]);
  const [authors, setAuthors] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [formData, setFormData] = useState({ author_id: '', subject_id: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchMappings();
    fetchAuthors();
    fetchSubjects();
  }, []);

  const fetchMappings = async () => {
    const res = await fetch('/api/mappings/author-subjects');
    const data = await res.json();
    if (data.success) setMappings(data.data);
  };

  const fetchAuthors = async () => {
    const res = await fetch('/api/authors');
    const data = await res.json();
    if (data.success) setAuthors(data.data);
  };

  const fetchSubjects = async () => {
    const res = await fetch('/api/subjects');
    const data = await res.json();
    if (data.success) setSubjects(data.data);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const res = await fetch('/api/mappings/author-subjects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    
    const data = await res.json();
    if (data.success) {
      setFormData({ author_id: '', subject_id: '' });
      fetchMappings();
      alert('Mapping created successfully!');
    } else {
      alert('Error: ' + (data.error || 'Mapping might already exist'));
    }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Remove this mapping?')) return;
    
    const res = await fetch(`/api/mappings/author-subjects?id=${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) fetchMappings();
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">Author-Subject Mapping</h1>
      
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-xl font-semibold mb-4">Assign Subject to Author</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Select Author</label>
            <select
              className="w-full px-4 py-2 border rounded"
              value={formData.author_id}
              onChange={(e) => setFormData({ ...formData, author_id: e.target.value })}
              required
            >
              <option value="">Choose an author</option>
              {authors.map((author) => (
                <option key={author.id} value={author.id}>
                  {author.username} ({author.email})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Select Subject</label>
            <select
              className="w-full px-4 py-2 border rounded"
              value={formData.subject_id}
              onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })}
              required
            >
              <option value="">Choose a subject</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>{subject.name}</option>
              ))}
            </select>
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? 'Mapping...' : 'Create Mapping'}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-6 py-3 text-left">ID</th>
              <th className="px-6 py-3 text-left">Author</th>
              <th className="px-6 py-3 text-left">Subject</th>
              <th className="px-6 py-3 text-left">Assigned At</th>
              <th className="px-6 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {mappings.map((mapping) => (
              <tr key={mapping.id} className="border-t hover:bg-gray-50">
                <td className="px-6 py-4">{mapping.id}</td>
                <td className="px-6 py-4">
                  <span className="font-medium">{mapping.author_name}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                    {mapping.subject_name}
                  </span>
                </td>
                <td className="px-6 py-4">{new Date(mapping.assigned_at).toLocaleDateString()}</td>
                <td className="px-6 py-4">
                  <button 
                    onClick={() => handleDelete(mapping.id)}
                    className="px-4 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    Remove
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
