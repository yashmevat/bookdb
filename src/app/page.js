// app/page.jsx
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchAllBooks();
  }, []);

  const fetchAllBooks = async () => {
    try {
      const res = await fetch('/api/books');
      const data = await res.json();
      if (data.success) {
        setBooks(data.data);
      }
    } catch (error) {
      console.error('Error fetching books:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBookClick = (bookId) => {
    router.push(`/book/${bookId}`);
  };

  const filteredBooks = books.filter(book =>
    book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    book.author_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    book.subject_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Soft gradient colors for book cards
  const gradients = [
    'from-blue-400 to-cyan-300',
    'from-purple-400 to-pink-300',
    'from-green-400 to-teal-300',
    'from-orange-400 to-yellow-300',
    'from-rose-400 to-pink-300',
    'from-indigo-400 to-blue-300',
  ];

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-400 border-t-transparent mx-auto"></div>
          <p className="mt-6 text-lg text-gray-700 font-medium">Loading amazing books...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
                  📚 Digital Library
                </h1>
                <p className="text-gray-600 text-sm sm:text-base mt-1">Explore our collection</p>
              </div>
              <button
                onClick={() => router.push('/login')}
                className="sm:hidden px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition font-medium text-sm shadow-sm"
              >
                Login
              </button>
            </div>
            <button
              onClick={() => router.push('/login')}
              className="hidden sm:block px-6 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition font-medium shadow-md hover:shadow-lg transform hover:scale-105"
            >
              Login / Sign Up
            </button>
          </div>
        </div>
      </header>

      {/* Search & Stats Section */}
      <div className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 sm:p-6 text-center transform hover:scale-105 transition shadow-lg">
              <div className="text-3xl sm:text-4xl font-bold text-blue-600">{books.length}</div>
              <div className="text-sm sm:text-base text-gray-600 mt-1">Total Books</div>
            </div>
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 sm:p-6 text-center transform hover:scale-105 transition shadow-lg">
              <div className="text-3xl sm:text-4xl font-bold text-purple-600">{new Set(books.map(b => b.author_name)).size}</div>
              <div className="text-sm sm:text-base text-gray-600 mt-1">Authors</div>
            </div>
            <div className="col-span-2 sm:col-span-1 bg-white/90 backdrop-blur-sm rounded-2xl p-4 sm:p-6 text-center transform hover:scale-105 transition shadow-lg">
              <div className="text-3xl sm:text-4xl font-bold text-pink-600">{new Set(books.map(b => b.subject_name)).size}</div>
              <div className="text-sm sm:text-base text-gray-600 mt-1">Subjects</div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <input
                type="text"
                placeholder="Search by title, author, or subject..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-5 sm:px-6 py-3 sm:py-4 rounded-full text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-white/50 shadow-lg text-sm sm:text-base bg-white"
              />
              <div className="absolute right-3 sm:right-4 top-1/2 transform -translate-y-1/2 text-2xl">
                🔍
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Books Grid */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {filteredBooks.length === 0 ? (
          <div className="text-center py-12 sm:py-16">
            <div className="text-6xl sm:text-8xl mb-4">📖</div>
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-700 mb-2">
              {searchQuery ? 'No Books Found' : 'No Books Available'}
            </h2>
            <p className="text-sm sm:text-base text-gray-500">
              {searchQuery ? 'Try a different search term' : 'Check back later for new additions'}
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="mt-4 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
              >
                Clear Search
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="mb-6 sm:mb-8">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">
                {searchQuery ? 'Search Results' : 'All Books'}
              </h2>
              <p className="text-sm sm:text-base text-gray-600">
                {filteredBooks.length} book{filteredBooks.length !== 1 ? 's' : ''} available
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              {filteredBooks.map((book, index) => (
                <div
                  key={book.id}
                  onClick={() => handleBookClick(book.id)}
                  className="bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:-translate-y-2 overflow-hidden group border border-gray-100"
                >
                  {/* Book Cover */}
                  <div className={`h-48 sm:h-56 bg-gradient-to-br ${gradients[index % gradients.length]} flex items-center justify-center relative overflow-hidden`}>
                    {/* Subtle overlay */}
                    <div className="absolute inset-0 bg-white/5 group-hover:bg-white/10 transition-all"></div>
                    
                    <div className="text-white text-center p-4 sm:p-6 relative z-10">
                      <div className="text-5xl sm:text-6xl mb-3 sm:mb-4 transform group-hover:scale-110 transition-transform drop-shadow-md">
                        📖
                      </div>
                      <h3 className="text-base sm:text-lg font-bold line-clamp-2 drop-shadow-md">
                        {book.title}
                      </h3>
                    </div>
                    
                    {/* Subject Badge */}
                    <div className="absolute top-2 sm:top-3 right-2 sm:right-3 bg-white/95 backdrop-blur-sm px-2 sm:px-3 py-1 rounded-full text-gray-700 text-xs font-semibold shadow-md">
                      {book.subject_name}
                    </div>

                    {/* Decorative Elements */}
                    <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-white/20 rounded-full blur-2xl"></div>
                    <div className="absolute -top-6 -left-6 w-20 h-20 bg-white/20 rounded-full blur-xl"></div>
                  </div>

                  {/* Book Info */}
                  <div className="p-4">
                    <h3 className="font-bold text-base sm:text-lg text-gray-800 mb-2 line-clamp-1 group-hover:text-blue-600 transition-colors">
                      {book.title}
                    </h3>
                    
                    <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600 mb-3">
                      <span className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-lg">
                        <span className="text-base">👤</span>
                        <span className="line-clamp-1">{book.author_name}</span>
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      <span className="px-2 sm:px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-medium">
                        {book.topic_name}
                      </span>
                    </div>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleBookClick(book.id);
                      }}
                      className="w-full py-2 sm:py-2.5 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl hover:from-blue-600 hover:to-purple-600 transition-all font-medium text-sm sm:text-base shadow-sm hover:shadow-md transform hover:scale-[1.02] flex items-center justify-center gap-2"
                    >
                      <span>Read Book</span>
                      <span className="text-lg">→</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 mt-12 sm:mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="text-center text-xs sm:text-sm text-gray-600">
            <p className="font-medium">© 2026 Digital Library. All rights reserved.</p>
            <p className="mt-2 text-gray-500">Discover, Read, and Enjoy</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
