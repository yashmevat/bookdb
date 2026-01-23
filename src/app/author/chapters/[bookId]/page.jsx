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
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);

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
      setShowForm(false);
      fetchChapters();
      alert(editMode ? 'Chapter updated successfully!' : 'Chapter created successfully!');
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
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditMode(false);
    setEditId(null);
    setFormData({ title: '', order_num: '' });
    setShowForm(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this chapter? All pages in this chapter will also be deleted.')) return;
    
    const res = await fetch(`/api/author/chapters?id=${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      fetchChapters();
      alert('Chapter deleted successfully!');
    }
  };

  const filteredChapters = chapters.filter(chapter =>
    chapter.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-full bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Breadcrumb & Header */}
        <div className="mb-8">
          <Link 
            href="/author/books"
            className="inline-flex items-center text-indigo-600 hover:text-indigo-800 transition mb-4 group"
          >
            <svg className="w-5 h-5 mr-2 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Books
          </Link>
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Chapters</h1>
              <p className="mt-2 text-sm text-gray-600">
                Book: <span className="font-semibold text-indigo-600">{bookTitle || 'Loading...'}</span>
              </p>
            </div>
            <button
              onClick={() => {
                setShowForm(!showForm);
                if (editMode) handleCancelEdit();
              }}
              className="inline-flex items-center justify-center px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition shadow-lg hover:shadow-xl"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {showForm ? 'Cancel' : 'Add Chapter'}
            </button>
          </div>
        </div>

        {/* Add/Edit Chapter Form - Collapsible */}
        {showForm && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8 border border-gray-200 animate-slideDown">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                {editMode ? '✏️ Edit Chapter' : '📄 Add New Chapter'}
              </h2>
              <button
                onClick={handleCancelEdit}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Chapter Title *
                  </label>
                  <input
                    type="text"
                    placeholder="Enter chapter title (e.g., Introduction to Variables)"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Order Number
                  </label>
                  <input
                    type="number"
                    placeholder="0"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
                    value={formData.order_num}
                    onChange={(e) => setFormData({ ...formData, order_num: e.target.value })}
                  />
                  <p className="text-xs text-gray-500 mt-1">For sorting chapters</p>
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  type="submit" 
                  disabled={loading}
                  className="flex-1 sm:flex-none px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition shadow-lg hover:shadow-xl font-medium"
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </span>
                  ) : (
                    editMode ? 'Update Chapter' : 'Add Chapter'
                  )}
                </button>
                <button 
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Search & Stats */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="bg-teal-100 p-3 rounded-lg">
                <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{chapters.length}</p>
                <p className="text-sm text-gray-600">Total Chapters</p>
              </div>
            </div>

            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                placeholder="Search chapters..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <svg className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Chapters Table - Desktop */}
        <div className="hidden md:block bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Order</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Chapter Title</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Created</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredChapters.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-12 text-center text-gray-500">
                      <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="text-lg font-medium">No chapters found</p>
                      <p className="text-sm mt-1">Add your first chapter to get started</p>
                    </td>
                  </tr>
                ) : (
                  filteredChapters.map((chapter) => (
                    <tr key={chapter.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-teal-100 text-teal-800 font-bold">
                          {chapter.order_num}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center text-white font-bold">
                            {chapter.title.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-gray-900">{chapter.title}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(chapter.created_at).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button 
                            onClick={() => router.push(`/author/pages/${chapter.id}`)}
                            className="inline-flex items-center px-3 py-2 bg-teal-100 text-teal-700 rounded-lg hover:bg-teal-200 transition text-sm font-medium"
                            title="Manage Pages"
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                            Pages
                          </button>
                          <button 
                            onClick={() => handleEdit(chapter)}
                            className="inline-flex items-center px-3 py-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition text-sm font-medium"
                            title="Edit Chapter"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button 
                            onClick={() => handleDelete(chapter.id)}
                            className="inline-flex items-center px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition text-sm font-medium"
                            title="Delete Chapter"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Chapters Cards - Mobile */}
        <div className="md:hidden space-y-4">
          {filteredChapters.length === 0 ? (
            <div className="bg-white rounded-xl shadow-lg p-12 text-center border border-gray-200">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-lg font-medium text-gray-900">No chapters found</p>
              <p className="text-sm text-gray-600 mt-1">Add your first chapter to get started</p>
            </div>
          ) : (
            filteredChapters.map((chapter) => (
              <div key={chapter.id} className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                <div className="flex items-start gap-3 mb-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-teal-100 text-teal-800 font-bold flex items-center justify-center text-lg">
                      {chapter.order_num}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center text-white font-bold">
                        {chapter.title.charAt(0).toUpperCase()}
                      </div>
                      <h3 className="font-semibold text-gray-900 text-lg">{chapter.title}</h3>
                    </div>
                    <p className="text-sm text-gray-600">
                      Created {new Date(chapter.created_at).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button 
                    onClick={() => router.push(`/author/pages/${chapter.id}`)}
                    className="flex flex-col items-center justify-center p-3 bg-teal-50 text-teal-700 rounded-lg hover:bg-teal-100 transition"
                  >
                    <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <span className="text-xs font-medium">Pages</span>
                  </button>
                  <button 
                    onClick={() => handleEdit(chapter)}
                    className="flex flex-col items-center justify-center p-3 bg-yellow-50 text-yellow-700 rounded-lg hover:bg-yellow-100 transition"
                  >
                    <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <span className="text-xs font-medium">Edit</span>
                  </button>
                  <button 
                    onClick={() => handleDelete(chapter.id)}
                    className="flex flex-col items-center justify-center p-3 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition"
                  >
                    <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span className="text-xs font-medium">Delete</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slideDown {
          animation: slideDown 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
