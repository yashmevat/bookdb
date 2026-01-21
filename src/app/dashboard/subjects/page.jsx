// app/dashboard/subjects/page.jsx
'use client';
import { useState, useEffect } from 'react';

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState([]);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    const res = await fetch('/api/subjects');
    const data = await res.json();
    if (data.success) setSubjects(data.data);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const res = await fetch('/api/subjects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    
    const data = await res.json();
    if (data.success) {
      setFormData({ name: '', description: '' });
      fetchSubjects();
      alert('Subject created successfully!');
    } else {
      alert('Error: ' + data.error);
    }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this subject?')) return;
    
    const res = await fetch(`/api/subjects?id=${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) fetchSubjects();
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">Manage Subjects</h1>
      
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-xl font-semibold mb-4">Add New Subject</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Subject Name</label>
            <input
              type="text"
              placeholder="e.g., Mathematics, Physics"
              className="w-full px-4 py-2 border rounded"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              placeholder="Enter subject description"
              className="w-full px-4 py-2 border rounded"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows="3"
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? 'Adding...' : 'Add Subject'}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-6 py-3 text-left">ID</th>
              <th className="px-6 py-3 text-left">Name</th>
              <th className="px-6 py-3 text-left">Description</th>
              <th className="px-6 py-3 text-left">Created By</th>
              <th className="px-6 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {subjects.map((subject) => (
              <tr key={subject.id} className="border-t hover:bg-gray-50">
                <td className="px-6 py-4">{subject.id}</td>
                <td className="px-6 py-4 font-medium">{subject.name}</td>
                <td className="px-6 py-4">{subject.description || '-'}</td>
                <td className="px-6 py-4">{subject.created_by_name}</td>
                <td className="px-6 py-4">
                  <button 
                    onClick={() => handleDelete(subject.id)}
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
