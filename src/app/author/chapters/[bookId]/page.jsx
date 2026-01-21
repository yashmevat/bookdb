// app/author/chapters/[bookId]/page.jsx
'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

export default function ChaptersPage() {
  const params = useParams();
  const router = useRouter();
  const bookId = params.bookId;

  const [chapters, setChapters] = useState([]);
  const [bookTitle, setBookTitle] = useState('');
  const [formData, setFormData] = useState({ title: '', order_num: '' });
  const [editMode, setEditMode] = useState(false);
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchChapters();
    fetchBookDetails();
  }, [bookId]);

  const fetchBookDetails = async () => {
    const res = await fetch('/api/author/books');
    const data = await res.json();
    if (data.success) {
      const book = data.data.find(b => b.id == bookId);
      if (book) setBookTitle(book.title);
    }
  };

  const fetchChapters = async () => {
    const res = await fetch(`/api/author/chapters?book_id=${bookId}`);
    const data = await res.json();
    if (data.success) {
      setChapters(data.data);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const method = editMode ? 'PUT' : 'POST';
    const body = editMode 
      ? JSON.stringify({ ...formData, id: editId })
      : JSON.stringify({ ...formData, book_id: bookId });

    const res = await fetch('/api/author/chapters', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body
    });
    
    const data = await res.json();
    if (data.success) {
      setFormData({ title: '', order_num: '' });
      setEditMode(false);
      setEditId(null);
      fetchChapters();
      alert(editMode ? 'Chapter updated!' : 'Chapter created!');
    } else {
      alert('Error: ' + data.error);
    }
    setLoading(false);
  };

  const handleEdit = (chapter) => {
    setFormData({
      title: chapter.title,
      order_num: chapter.order_num
    });
    setEditMode(true);
    setEditId(chapter.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditMode(false);
    setEditId(null);
    setFormData({ title: '', order_num: '' });
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this chapter? All pages in this chapter will also be deleted.')) return;
    
    const res = await fetch(`/api/author/chapters?id=${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      fetchChapters();
      alert('Chapter deleted!');
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header with Back Button */}
      <div className="mb-8">
        <Link 
          href="/author/books"
          className="text-blue-600 hover:text-blue-800 flex items-center gap-2 mb-4"
        >
          ← Back to Books
        </Link>
        <h1 className="text-3xl font-bold text-gray-800">Chapters</h1>
        <p className="text-gray-600 mt-2">Book: <span className="font-semibold">{bookTitle}</span></p>
      </div>
      
      {/* Add/Edit Chapter Form */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-xl font-semibold mb-4">
          {editMode ? 'Edit Chapter' : 'Add New Chapter'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Chapter Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Enter chapter title"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Order Number (optional)
            </label>
            <input
              type="number"
              placeholder="0"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.order_num}
              onChange={(e) => setFormData({ ...formData, order_num: e.target.value })}
            />
            <p className="text-sm text-gray-500 mt-1">Used to sort chapters in order</p>
          </div>

          <div className="flex gap-3">
            <button 
              type="submit" 
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400 font-medium"
            >
              {loading ? 'Saving...' : (editMode ? 'Update Chapter' : 'Add Chapter')}
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

      {/* Chapters List */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b">
          <h3 className="text-lg font-semibold text-gray-800">All Chapters ({chapters.length})</h3>
        </div>
        
        {chapters.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p className="text-lg">No chapters yet</p>
            <p className="text-sm mt-2">Add your first chapter to get started</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Order
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Chapter Title
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
                {chapters.map((chapter) => (
                  <tr key={chapter.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-200 text-gray-800">
                        {chapter.order_num}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{chapter.title}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(chapter.created_at).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                      <button 
                        onClick={() => router.push(`/author/pages/${chapter.id}`)}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-medium"
                      >
                        Pages
                      </button>
                      <button 
                        onClick={() => handleEdit(chapter)}
                        className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition font-medium"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => handleDelete(chapter.id)}
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
