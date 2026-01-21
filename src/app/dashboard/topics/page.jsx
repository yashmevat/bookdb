// app/dashboard/topics/page.jsx
'use client';
import { useState, useEffect } from 'react';

export default function TopicsPage() {
  const [topics, setTopics] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [formData, setFormData] = useState({ name: '', description: '', subject_id: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTopics();
    fetchSubjects();
  }, []);

  const fetchTopics = async () => {
    const res = await fetch('/api/topics');
    const data = await res.json();
    if (data.success) setTopics(data.data);
  };

  const fetchSubjects = async () => {
    const res = await fetch('/api/subjects');
    const data = await res.json();
    if (data.success) setSubjects(data.data);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const res = await fetch('/api/topics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    
    const data = await res.json();
    if (data.success) {
      setFormData({ name: '', description: '', subject_id: '' });
      fetchTopics();
      alert('Topic created successfully!');
    } else {
      alert('Error: ' + data.error);
    }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this topic?')) return;
    
    const res = await fetch(`/api/topics?id=${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) fetchTopics();
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">Manage Topics</h1>
      
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-xl font-semibold mb-4">Add New Topic</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Topic Name</label>
            <input
              type="text"
              placeholder="e.g., Algebra, Thermodynamics"
              className="w-full px-4 py-2 border rounded"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              placeholder="Enter topic description"
              className="w-full px-4 py-2 border rounded"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows="3"
            />
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
            {loading ? 'Adding...' : 'Add Topic'}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-6 py-3 text-left">ID</th>
              <th className="px-6 py-3 text-left">Topic Name</th>
              <th className="px-6 py-3 text-left">Subject</th>
              <th className="px-6 py-3 text-left">Description</th>
              <th className="px-6 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {topics.map((topic) => (
              <tr key={topic.id} className="border-t hover:bg-gray-50">
                <td className="px-6 py-4">{topic.id}</td>
                <td className="px-6 py-4 font-medium">{topic.name}</td>
                <td className="px-6 py-4">
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                    {topic.subject_name}
                  </span>
                </td>
                <td className="px-6 py-4">{topic.description || '-'}</td>
                <td className="px-6 py-4">
                  <button 
                    onClick={() => handleDelete(topic.id)}
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
