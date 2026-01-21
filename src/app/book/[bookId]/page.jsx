// app/book/[bookId]/page.jsx
"use client";

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from "next/dynamic";

const HTMLFlipBook = dynamic(
  () => import("react-pageflip").then(mod => mod.default),
  { ssr: false }
);

export default function BookReaderPage() {
  const params = useParams();
  const bookId = params.bookId;
  const bookRef = useRef(null);

  const [book, setBook] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [allPages, setAllPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);

  useEffect(() => {
    if (bookId) {
      fetchAllData();
    }
  }, [bookId]);

  const fetchAllData = async () => {
    try {
      const bookRes = await fetch(`/api/books/${bookId}`);
      const bookData = await bookRes.json();
      if (bookData.success) {
        setBook(bookData.data);
      }

      const chaptersRes = await fetch(`/api/books/${bookId}/chapters`);
      const chaptersData = await chaptersRes.json();
      if (chaptersData.success) {
        setChapters(chaptersData.data);
        await fetchAllPages(chaptersData.data);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllPages = async (chaptersList) => {
    try {
      const allPagesData = [];
      const chapterPageMap = {};

      // Cover page (index 0)
      allPagesData.push({
        type: 'cover',
        content: null
      });

      // Table of contents (index 1)
      const tocIndex = allPagesData.length;
      allPagesData.push({
        type: 'toc',
        content: chaptersList,
        chapterPageMap: {}
      });

      // Chapter pages
      for (const chapter of chaptersList) {
        chapterPageMap[chapter.id] = allPagesData.length;
        
        // Chapter title page
        allPagesData.push({
          type: 'chapter-title',
          content: chapter
        });

        // Fetch chapter pages
        const pagesRes = await fetch(`/api/books/${bookId}/chapters/${chapter.id}/pages`);
        const pagesData = await pagesRes.json();
        
        if (pagesData.success && pagesData.data.length > 0) {
          pagesData.data.forEach(page => {
            allPagesData.push({
              type: 'content',
              content: page,
              chapterTitle: chapter.title
            });
          });
        }
      }

      // Back cover
      allPagesData.push({
        type: 'back-cover',
        content: null
      });

      // Update TOC
      allPagesData[tocIndex].chapterPageMap = chapterPageMap;

      setAllPages(allPagesData);
    } catch (error) {
      console.error('Error fetching pages:', error);
    }
  };

  const goToPage = (pageIndex) => {
    if (bookRef.current && bookRef.current.pageFlip) {
      let adjustedPageIndex = pageIndex;
      
      if (pageIndex % 2 === 0) {
        adjustedPageIndex = pageIndex + 1;
      }
      
      console.log(`Original: ${pageIndex}, Adjusted: ${adjustedPageIndex}`);
      bookRef.current.pageFlip().flip(adjustedPageIndex, 'top');
    }
  };

  const onFlip = (e) => {
    setCurrentPage(e.data);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-white mx-auto"></div>
          <p className="mt-4 text-white text-lg">Loading book...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-8 overflow-hidden">
      {/* Header */}
      <div className="max-w-7xl mx-auto px-4 mb-8">
        <div className="flex justify-between items-center">
          <Link 
            href="/"
            className="text-white hover:text-purple-300 font-semibold flex items-center gap-2 text-lg transition-colors"
          >
            ← Back to Library
          </Link>
          <div className="text-white text-center">
            <h1 className="text-3xl font-bold drop-shadow-lg">{book?.title}</h1>
            <p className="text-sm text-purple-200 mt-2">Page {currentPage + 1} of {allPages.length}</p>
          </div>
          <div className="w-40"></div>
        </div>
      </div>

      {/* FlipBook Container */}
      <div className="flex justify-center items-center px-4">
        <HTMLFlipBook
          ref={bookRef}
          width={670}
          height={800}
          maxShadowOpacity={0.5}
          drawShadow={true}
          showCover={true}
          size="fixed"
          className="mx-auto"
          onFlip={onFlip}
          mobileScrollSupport={false}
        >
          {allPages.map((page, index) => (
            <div key={index} className="book-page-wrapper">
              {page.type === 'cover' && <CoverPage book={book} />}
              {page.type === 'toc' && (
                <TableOfContents 
                  chapters={page.content} 
                  chapterPageMap={page.chapterPageMap}
                  onChapterClick={goToPage}
                />
              )}
              {page.type === 'chapter-title' && <ChapterTitlePage chapter={page.content} pageNumber={index + 1} />}
              {page.type === 'content' && <ContentPage page={page.content} chapterTitle={page.chapterTitle} pageNumber={index + 1} />}
              {page.type === 'back-cover' && <BackCoverPage book={book} />}
            </div>
          ))}
        </HTMLFlipBook>
      </div>

      {/* Instructions */}
      <div className="text-center mt-8">
        <p className="text-white text-sm">Click on the page edges or drag to flip pages</p>
      </div>
    </div>
  );
}

// Cover Page Component
function CoverPage({ book }) {
  return (
    <div className="page-inner bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 text-white">
      <div className="h-full flex flex-col justify-center items-center p-8">
        <div className="text-center space-y-6">
          <div className="text-8xl mb-6">📚</div>
          <h1 className="text-5xl font-bold leading-tight drop-shadow-2xl px-4">
            {book?.title}
          </h1>
          <div className="w-32 h-1 bg-white mx-auto"></div>
          <div className="space-y-2">
            <p className="text-2xl">by</p>
            <p className="text-3xl font-semibold">{book?.author_name}</p>
          </div>
          <div className="mt-8 space-y-3">
            <div className="inline-block px-6 py-3 bg-white/20 backdrop-blur-sm rounded-full text-lg font-medium">
              {book?.subject_name}
            </div>
            <br />
            <div className="inline-block px-6 py-3 bg-white/20 backdrop-blur-sm rounded-full text-lg font-medium">
              {book?.topic_name}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Table of Contents Component
function TableOfContents({ chapters, chapterPageMap, onChapterClick }) {
  return (
    <div className="page-inner bg-gradient-to-br from-white to-gray-50">
      <div className="h-full flex flex-col p-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center border-b-4 border-blue-600 pb-4">
          Table of Contents
        </h2>
        
        <div className="space-y-3 overflow-y-auto flex-1">
          {chapters.map((chapter, index) => {
            const pageIndex = chapterPageMap[chapter.id];
            return (
              <button
                key={chapter.id}
                onClick={(e) => {
                  e.stopPropagation();
                  if (pageIndex !== undefined) {
                    console.log(`Chapter ${index + 1} clicked, going to page:`, pageIndex);
                    onChapterClick(pageIndex);
                  }
                }}
                className="w-full flex items-center gap-4 p-3 hover:bg-blue-50 transition-all rounded-lg border-l-4 border-blue-600 cursor-pointer"
              >
                <div className="flex-shrink-0 w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                  {index + 1}
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-semibold text-base text-gray-800">
                    {chapter.title}
                  </h3>
                </div>
                <div className="text-sm text-gray-500">
                  Page {pageIndex + 1}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Chapter Title Page Component
function ChapterTitlePage({ chapter, pageNumber }) {
  return (
    <div className="page-inner bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
      <div className="h-full flex flex-col justify-center items-center p-8">
        <div className="text-center space-y-6">
          <div className="text-7xl mb-4">📖</div>
          <div className="space-y-4">
            <h2 className="text-4xl font-bold leading-tight px-6">
              {chapter.title}
            </h2>
            <div className="w-24 h-1 bg-white mx-auto"></div>
          </div>
        </div>
        
        <div className="absolute bottom-6 left-0 right-0 text-center">
          <span className="text-sm opacity-75">{pageNumber}</span>
        </div>
      </div>
    </div>
  );
}

// Content Page Component - UPDATED
function ContentPage({ page, chapterTitle, pageNumber }) {
  return (
    <div className="page-inner bg-gradient-to-br from-white to-gray-50">
      <div className="h-full flex flex-col p-8">
        {/* Header */}
        <div className="pb-3 border-b-2 border-gray-300 flex-shrink-0">
          <p className="text-xs text-gray-500 uppercase tracking-wide">{chapterTitle}</p>
        </div>

        {/* Content - fills available space */}
        <div className="flex-1 mt-4 flex flex-col justify-between">
          <div 
            className="book-content-text"
            style={{
              fontSize: '16px',
              lineHeight: '1.75',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              minHeight: '680px', // Minimum height to reduce gap
              display: 'flex',
              flexDirection: 'column'
            }}
            dangerouslySetInnerHTML={{ 
              __html: page.content || '<p class="text-gray-400 italic text-center mt-20">No content available</p>' 
            }}
          />
        </div>

        {/* Footer - page number */}
        <div className="pt-4 text-center flex-shrink-0 border-t border-gray-200 mt-auto">
          <span className="text-sm text-gray-400">{pageNumber}</span>
        </div>
      </div>
    </div>
  );
}



// Back Cover Page Component
function BackCoverPage({ book }) {
  return (
    <div className="page-inner bg-gradient-to-br from-gray-800 to-gray-900 text-white">
      <div className="h-full flex flex-col justify-center items-center p-8">
        <div className="text-center space-y-6">
          <div className="text-7xl mb-4">✨</div>
          <h2 className="text-3xl font-bold">Thank You for Reading!</h2>
          <div className="w-32 h-1 bg-white mx-auto"></div>
          <p className="text-2xl font-semibold">{book?.title}</p>
          <p className="text-lg text-gray-300">by {book?.author_name}</p>
          <div className="mt-8 space-y-2">
            <p className="text-sm text-gray-400">{book?.subject_name}</p>
            <p className="text-sm text-gray-400">{book?.topic_name}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
