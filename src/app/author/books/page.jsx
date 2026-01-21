// app/author/books/page.jsx
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthorBooksPage() {
  const router = useRouter();
  const [books, setBooks] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [topics, setTopics] = useState([]);
  const [formData, setFormData] = useState({ 
    title: '', 
    subject_id: '', 
    topic_id: '' 
  });
  const [editMode, setEditMode] = useState(false);
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchBooks();
    fetchSubjects();
  }, []);

  useEffect(() => {
    if (formData.subject_id) {
      fetchTopics(formData.subject_id);
    } else {
      setTopics([]);
      setFormData(prev => ({ ...prev, topic_id: '' }));
    }
  }, [formData.subject_id]);

  const fetchBooks = async () => {
    const res = await fetch('/api/author/books');
    const data = await res.json();
    if (data.success) setBooks(data.data);
  };

  const fetchSubjects = async () => {
    const res = await fetch('/api/author/subjects');
    const data = await res.json();
    if (data.success) setSubjects(data.data);
  };

  const fetchTopics = async (subjectId) => {
    const res = await fetch(`/api/author/topics?subject_id=${subjectId}`);
    const data = await res.json();
    if (data.success) setTopics(data.data);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const method = editMode ? 'PUT' : 'POST';
    const body = editMode 
      ? JSON.stringify({ ...formData, id: editId })
      : JSON.stringify(formData);

    const res = await fetch('/api/author/books', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body
    });
    
    const data = await res.json();
    if (data.success) {
      setFormData({ title: '', subject_id: '', topic_id: '' });
      setEditMode(false);
      setEditId(null);
      fetchBooks();
      alert(editMode ? 'Book updated successfully!' : 'Book created successfully!');
    } else {
      alert('Error: ' + data.error);
    }
    setLoading(false);
  };

  const handleEdit = (book) => {
    setFormData({
      title: book.title,
      subject_id: book.subject_id,
      topic_id: book.topic_id
    });
    setEditMode(true);
    setEditId(book.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditMode(false);
    setEditId(null);
    setFormData({ title: '', subject_id: '', topic_id: '' });
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this book? All chapters and pages will also be deleted.')) return;
    
    const res = await fetch(`/api/author/books?id=${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      fetchBooks();
      alert('Book deleted successfully!');
    } else {
      alert('Error: ' + data.error);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">My Books</h1>
        <p className="text-gray-600 mt-2">Create and manage your books</p>
      </div>
      
      {/* Add/Edit Book Form */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-xl font-semibold mb-4">
          {editMode ? 'Edit Book' : 'Create New Book'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Book Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Enter book title"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subject <span className="text-red-500">*</span>
              </label>
              <select
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.subject_id}
                onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })}
                required
              >
                <option value="">Select Subject</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>{subject.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Topic <span className="text-red-500">*</span>
              </label>
              <select
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.topic_id}
                onChange={(e) => setFormData({ ...formData, topic_id: e.target.value })}
                required
                disabled={!formData.subject_id}
              >
                <option value="">Select Topic</option>
                {topics.map((topic) => (
                  <option key={topic.id} value={topic.id}>{topic.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-3">
            <button 
              type="submit" 
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
            >
              {loading ? 'Saving...' : (editMode ? 'Update Book' : 'Create Book')}
            </button>
            {editMode && (
              <button 
                type="button"
                onClick={handleCancelEdit}
                className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition font-medium"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Books List */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b">
          <h3 className="text-lg font-semibold text-gray-800">All Books ({books.length})</h3>
        </div>
        
        {books.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p className="text-lg">No books yet</p>
            <p className="text-sm mt-2">Create your first book to get started</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Subject
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Topic
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {books.map((book) => (
                  <tr key={book.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{book.title}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        {book.subject_name}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        {book.topic_name}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(book.created_at).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                      <button 
                        onClick={() => router.push(`/author/chapters/${book.id}`)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium"
                      >
                        Chapters
                      </button>
                      <button 
                        onClick={() => handleEdit(book)}
                        className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition font-medium"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => handleDelete(book.id)}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
