"use client";

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function BookReaderPage() {
  const params = useParams();
  const bookId = params.bookId;

  const [book, setBook] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [allPages, setAllPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentSpreadIndex, setCurrentSpreadIndex] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipDirection, setFlipDirection] = useState(null);
  const [bookOpened, setBookOpened] = useState(false);
  
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragCurrentX, setDragCurrentX] = useState(0);
  const [canDrag, setCanDrag] = useState(false);
  const bookContainerRef = useRef(null);

  // Speech synthesis states
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const speechRef = useRef(null);
  const utteranceRef = useRef(null);

  useEffect(() => {
    if (bookId) {
      fetchAllData();
    }
  }, [bookId]);

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (!bookOpened) return;
      
      if (e.key === 'ArrowRight') {
        nextPage();
      } else if (e.key === 'ArrowLeft') {
        prevPage();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentSpreadIndex, allPages.length, bookOpened]);

  // Cleanup speech on unmount or page change
  useEffect(() => {
    return () => {
      if (speechRef.current) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Stop speech when page changes
  useEffect(() => {
    if (isSpeaking) {
      stopSpeaking();
    }
  }, [currentSpreadIndex]);

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

      allPagesData.push({ type: 'cover', content: null });
      
      const tocIndex = allPagesData.length;
      allPagesData.push({ type: 'toc', content: chaptersList, chapterPageMap: {} });

      for (const chapter of chaptersList) {
        chapterPageMap[chapter.id] = allPagesData.length;
        
        allPagesData.push({ type: 'chapter-title', content: chapter });

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

      allPagesData.push({ type: 'back-cover', content: null });
      allPagesData[tocIndex].chapterPageMap = chapterPageMap;

      setAllPages(allPagesData);
    } catch (error) {
      console.error('Error fetching pages:', error);
    }
  };

  // Speech functions
// Speech functions ko update karo - DONO pages ka text padhega
const getPageText = () => {
  const leftPageIndex = currentSpreadIndex * 2;
  const rightPageIndex = leftPageIndex + 1;
  const leftPage = allPages[leftPageIndex];
  const rightPage = allPages[rightPageIndex];

  let combinedText = '';

  // Left page ka text extract karo
  if (leftPage) {
    if (leftPage.type === 'content' && leftPage.content?.content) {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = leftPage.content.content;
      const leftText = tempDiv.textContent || tempDiv.innerText || '';
      if (leftText.trim()) {
        combinedText += leftText + '\n\n';
      }
    } else if (leftPage.type === 'chapter-title') {
      combinedText += leftPage.content.title + '\n\n';
    }
  }

  // Right page ka text extract karo
  if (rightPage) {
    if (rightPage.type === 'content' && rightPage.content?.content) {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = rightPage.content.content;
      const rightText = tempDiv.textContent || tempDiv.innerText || '';
      if (rightText.trim()) {
        combinedText += rightText;
      }
    } else if (rightPage.type === 'chapter-title') {
      combinedText += rightPage.content.title;
    }
  }

  return combinedText.trim();
};


  const startSpeaking = () => {
    if (!window.speechSynthesis) {
      alert('Speech synthesis not supported in your browser');
      return;
    }

    const text = getPageText();
    if (!text.trim()) {
      alert('No text content available on this page');
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US'; // Change to 'hi-IN' for Hindi
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    utterance.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
      
      // Auto flip to next page when speech ends
      if (currentSpreadIndex < Math.ceil(allPages.length / 2) - 1) {
        setTimeout(() => {
          nextPage();
        }, 500);
      }
    };

    utterance.onerror = (event) => {
      console.log('Speech error:', event);
      setIsSpeaking(false);
      setIsPaused(false);
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
    setIsPaused(false);
  };

  const pauseSpeaking = () => {
    if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
      window.speechSynthesis.pause();
      setIsPaused(true);
    }
  };

  const resumeSpeaking = () => {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
    }
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
  };

  const openBook = () => {
    setBookOpened(true);
  };

  const closeBook = () => {
    stopSpeaking();
    setBookOpened(false);
    setCurrentSpreadIndex(0);
  };

  const goToPage = (pageIndex) => {
    if (pageIndex >= 0 && pageIndex < allPages.length) {
      const spreadIndex = Math.floor(pageIndex / 2);
      setCurrentSpreadIndex(spreadIndex);
    }
  };

  const nextPage = () => {
    if (currentSpreadIndex < Math.ceil(allPages.length / 2) - 1) {
      setIsFlipping(true);
      setFlipDirection('next');
      setTimeout(() => {
        setCurrentSpreadIndex(currentSpreadIndex + 1);
        setIsFlipping(false);
        setFlipDirection(null);
      }, 600);
    }
  };

  const prevPage = () => {
    if (currentSpreadIndex > 0) {
      setIsFlipping(true);
      setFlipDirection('prev');
      setTimeout(() => {
        setCurrentSpreadIndex(currentSpreadIndex - 1);
        setIsFlipping(false);
        setFlipDirection(null);
      }, 600);
    }
  };

  const handleMouseDown = (e) => {
    if (!bookOpened) return;
    
    const clickedElement = e.target;
    const isTextContent = clickedElement.closest('.select-text, button, a, input, textarea');
    
    if (isTextContent) {
      setCanDrag(false);
      return;
    }

    setCanDrag(true);
    setIsDragging(true);
    setDragStartX(e.clientX);
    setDragCurrentX(e.clientX);
    e.preventDefault();
  };

  const handleMouseMove = (e) => {
    if (isDragging && canDrag) {
      setDragCurrentX(e.clientX);
    }
  };

  const handleMouseUp = (e) => {
    if (isDragging && canDrag) {
      const dragDistance = dragCurrentX - dragStartX;
      const threshold = 50;

      if (dragDistance > threshold) {
        prevPage();
      } else if (dragDistance < -threshold) {
        nextPage();
      }
    }

    setIsDragging(false);
    setCanDrag(false);
    setDragStartX(0);
    setDragCurrentX(0);
  };

  const handleTouchStart = (e) => {
    if (!bookOpened) return;
    
    const touchedElement = e.target;
    const isTextContent = touchedElement.closest('.select-text, button, a');
    
    if (isTextContent) {
      setCanDrag(false);
      return;
    }

    setCanDrag(true);
    setIsDragging(true);
    setDragStartX(e.touches[0].clientX);
    setDragCurrentX(e.touches[0].clientX);
  };

  const handleTouchMove = (e) => {
    if (isDragging && canDrag) {
      setDragCurrentX(e.touches[0].clientX);
    }
  };

  const handleTouchEnd = (e) => {
    handleMouseUp(e);
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

  const leftPageIndex = currentSpreadIndex * 2;
  const rightPageIndex = leftPageIndex + 1;
  const leftPage = allPages[leftPageIndex];
  const rightPage = allPages[rightPageIndex];

  const nextLeftPage = allPages[(currentSpreadIndex + 1) * 2];
  const nextRightPage = allPages[(currentSpreadIndex + 1) * 2 + 1];
  const prevLeftPage = allPages[(currentSpreadIndex - 1) * 2];
  const prevRightPage = allPages[(currentSpreadIndex - 1) * 2 + 1];

  const dragOffset = isDragging && canDrag ? dragCurrentX - dragStartX : 0;

  return (
    <>
      <style jsx global>{`
        .book-page {
          background: white;
          border-radius: 4px;
          box-shadow: 
            0 20px 60px rgba(0, 0, 0, 0.3),
            inset 0 0 0 1px rgba(0, 0, 0, 0.1);
          position: relative;
          overflow: hidden;
        }

        .book-spread-container {
          position: relative;
          perspective: 2000px;
        }

        .book-spread {
          display: flex;
          gap: 0;
          position: relative;
          z-index: 2;
        }

        .book-spread-background {
          display: flex;
          gap: 0;
          position: absolute;
          top: 0;
          left: 0;
          z-index: 1;
        }

        .page-flip-animation {
          transition: transform 0.6s cubic-bezier(0.645, 0.045, 0.355, 1);
          transform-style: preserve-3d;
          position: relative;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
        }

        .page-left {
          transform-origin: right center;
        }

        .page-right {
          transform-origin: left center;
        }

        .flipping-next .page-right {
          animation: flipNextSimple 0.6s ease-in-out forwards;
        }

        .flipping-prev .page-left {
          animation: flipPrevSimple 0.6s ease-in-out forwards;
        }

        @keyframes flipNextSimple {
          0% {
            transform: rotateY(0deg);
            opacity: 1;
            z-index: 10;
          }
          50% {
            transform: rotateY(-90deg);
            opacity: 0;
          }
          51% {
            opacity: 0;
            z-index: 0;
          }
          100% {
            transform: rotateY(-180deg);
            opacity: 0;
            z-index: 0;
          }
        }

        @keyframes flipPrevSimple {
          0% {
            transform: rotateY(0deg);
            opacity: 1;
            z-index: 10;
          }
          50% {
            transform: rotateY(90deg);
            opacity: 0;
          }
          51% {
            opacity: 0;
            z-index: 0;
          }
          100% {
            transform: rotateY(180deg);
            opacity: 0;
            z-index: 0;
          }
        }

        .page-inner {
          width: 100%;
          height: 100%;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
        }

        .select-text, .select-text * {
          user-select: text !important;
          -webkit-user-select: text !important;
          -moz-user-select: text !important;
          -ms-user-select: text !important;
          cursor: text !important;
        }

        .drag-area {
          cursor: grab;
          user-select: none;
        }

        .drag-area:active {
          cursor: grabbing;
        }

        .book-closed {
          cursor: pointer;
          transition: transform 0.3s ease;
        }

        .book-closed:hover {
          transform: scale(1.05);
        }

        .speech-controls {
          position: fixed;
          bottom: 30px;
          right: 30px;
          z-index: 50;
          display: flex;
          gap: 12px;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(10px);
          padding: 12px;
          border-radius: 50px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }

        .speech-btn {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
          font-size: 20px;
        }

        .speech-btn:hover {
          transform: scale(1.1);
        }

        .speech-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .speak-btn {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }

        .pause-btn {
          background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
          color: white;
        }

        .stop-btn {
          background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
          color: white;
        }

        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
        }

        .speaking-animation {
          animation: pulse 1.5s ease-in-out infinite;
        }
      `}</style>

      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-8">
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
              {bookOpened && (
                <p className="text-sm text-purple-200 mt-2">
                  Page {leftPageIndex + 1}-{rightPageIndex + 1} of {allPages.length}
                </p>
              )}
            </div>
            <div className="w-40 flex justify-end">
              {bookOpened && (
                <button
                  onClick={closeBook}
                  className="text-white hover:text-purple-300 font-semibold text-sm transition-colors"
                >
                  Close Book ✕
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-center items-center px-4 relative">
          {!bookOpened ? (
            <div 
              className="book-closed"
              onClick={openBook}
            >
              <div className="book-page" style={{ width: '670px', height: '800px' }}>
                <CoverPage book={book} />
              </div>
              <p className="text-white text-center mt-6 text-lg animate-pulse">
                📖 Click to open book
              </p>
            </div>
          ) : (
            <>
              <button
                onClick={prevPage}
                disabled={currentSpreadIndex === 0 || isFlipping}
                className="absolute left-4 z-10 bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed text-white p-4 rounded-full backdrop-blur-sm transition-all"
                style={{ top: '50%', transform: 'translateY(-50%)' }}
              >
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <div 
                ref={bookContainerRef}
                className="book-spread-container"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                <div className="book-spread-background">
                  {isFlipping && flipDirection === 'next' && nextLeftPage && (
                    <>
                      <div className="book-page" style={{ width: '670px', height: '800px' }}>
                        <PageContent 
                          page={nextLeftPage} 
                          pageNumber={(currentSpreadIndex + 1) * 2 + 1} 
                          onChapterClick={goToPage}
                          book={book}
                        />
                      </div>
                      {nextRightPage && (
                        <div className="book-page" style={{ width: '670px', height: '800px' }}>
                          <PageContent 
                            page={nextRightPage} 
                            pageNumber={(currentSpreadIndex + 1) * 2 + 2} 
                            onChapterClick={goToPage}
                            book={book}
                          />
                        </div>
                      )}
                    </>
                  )}

                  {isFlipping && flipDirection === 'prev' && prevLeftPage && (
                    <>
                      <div className="book-page" style={{ width: '670px', height: '800px' }}>
                        <PageContent 
                          page={prevLeftPage} 
                          pageNumber={(currentSpreadIndex - 1) * 2 + 1} 
                          onChapterClick={goToPage}
                          book={book}
                        />
                      </div>
                      {prevRightPage && (
                        <div className="book-page" style={{ width: '670px', height: '800px' }}>
                          <PageContent 
                            page={prevRightPage} 
                            pageNumber={(currentSpreadIndex - 1) * 2 + 2} 
                            onChapterClick={goToPage}
                            book={book}
                          />
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div className={`book-spread ${isFlipping ? `flipping-${flipDirection}` : ''}`}>
                  {leftPage && (
                    <div 
                      className="book-page page-left page-flip-animation"
                      style={{
                        width: '670px',
                        height: '800px',
                        transform: isDragging && canDrag && dragOffset > 0 
                          ? `rotateY(${Math.min(dragOffset / 5, 30)}deg)` 
                          : 'rotateY(0deg)'
                      }}
                    >
                      <PageContent 
                        page={leftPage} 
                        pageNumber={leftPageIndex + 1} 
                        onChapterClick={goToPage}
                        book={book}
                      />
                    </div>
                  )}

                  {rightPage && (
                    <div 
                      className="book-page page-right page-flip-animation"
                      style={{
                        width: '670px',
                        height: '800px',
                        transform: isDragging && canDrag && dragOffset < 0 
                          ? `rotateY(${Math.max(dragOffset / 5, -30)}deg)` 
                          : 'rotateY(0deg)'
                      }}
                    >
                      <PageContent 
                        page={rightPage} 
                        pageNumber={rightPageIndex + 1} 
                        onChapterClick={goToPage}
                        book={book}
                      />
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={nextPage}
                disabled={currentSpreadIndex >= Math.ceil(allPages.length / 2) - 1 || isFlipping}
                className="absolute right-4 z-10 bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed text-white p-4 rounded-full backdrop-blur-sm transition-all"
                style={{ top: '50%', transform: 'translateY(-50%)' }}
              >
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>

              {/* Speech Controls */}
              <div className="speech-controls">
                {!isSpeaking ? (
                  <button
                    onClick={startSpeaking}
                    className="speech-btn speak-btn"
                    title="Read page aloud"
                  >
                    🔊
                  </button>
                ) : (
                  <>
                    {!isPaused ? (
                      <button
                        onClick={pauseSpeaking}
                        className="speech-btn pause-btn speaking-animation"
                        title="Pause reading"
                      >
                        ⏸️
                      </button>
                    ) : (
                      <button
                        onClick={resumeSpeaking}
                        className="speech-btn speak-btn"
                        title="Resume reading"
                      >
                        ▶️
                      </button>
                    )}
                    <button
                      onClick={stopSpeaking}
                      className="speech-btn stop-btn"
                      title="Stop reading"
                    >
                      ⏹️
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>

        {bookOpened && (
          <div className="text-center mt-8">
            <p className="text-white text-sm">
              🖱️ Drag page edges to flip • Use arrow buttons • Press ← → keys
            </p>
            <p className="text-white text-xs mt-2 opacity-75">
              💡 Click on text to select and copy • 🔊 Use speech controls to read aloud
            </p>
          </div>
        )}
      </div>
    </>
  );
}

// Keep all other component functions the same (PageContent, CoverPage, etc.)
function PageContent({ page, pageNumber, onChapterClick, book }) {
  if (page.type === 'cover') {
    return <CoverPage book={book} />;
  }
  if (page.type === 'toc') {
    return (
      <TableOfContents 
        chapters={page.content} 
        chapterPageMap={page.chapterPageMap}
        onChapterClick={onChapterClick}
      />
    );
  }
  if (page.type === 'chapter-title') {
    return <ChapterTitlePage chapter={page.content} pageNumber={pageNumber} />;
  }
  if (page.type === 'content') {
    return <ContentPage page={page.content} chapterTitle={page.chapterTitle} pageNumber={pageNumber} />;
  }
  if (page.type === 'back-cover') {
    return <BackCoverPage book={book} />;
  }
  return null;
}

// ... (rest of the component functions remain the same)


function CoverPage({ book }) {
  return (
    <div className="page-inner bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 text-white">
      <div className="h-full flex flex-col justify-center items-center p-8">
        <div className="text-center space-y-6">
          <div className="text-8xl mb-6">📚</div>
          <h1 className="text-5xl font-bold leading-tight drop-shadow-2xl px-4 select-text">
            {book?.title || 'Untitled Book'}
          </h1>
          <div className="w-32 h-1 bg-white mx-auto"></div>
          <div className="space-y-2">
            <p className="text-2xl">by</p>
            <p className="text-3xl font-semibold select-text">{book?.author_name || 'Unknown Author'}</p>
          </div>
          <div className="mt-8 space-y-3">
            <div className="inline-block px-6 py-3 bg-white/20 backdrop-blur-sm rounded-full text-lg font-medium select-text">
              {book?.subject_name || 'Subject'}
            </div>
            <br />
            <div className="inline-block px-6 py-3 bg-white/20 backdrop-blur-sm rounded-full text-lg font-medium select-text">
              {book?.topic_name || 'Topic'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TableOfContents({ chapters, chapterPageMap, onChapterClick }) {
  return (
    <div className="page-inner bg-gradient-to-br from-white to-gray-50">
      <div className="h-full flex flex-col p-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center border-b-4 border-blue-600 pb-4 select-text">
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
                    onChapterClick(pageIndex);
                  }
                }}
                className="w-full flex items-center gap-4 p-3 hover:bg-blue-50 transition-all rounded-lg border-l-4 border-blue-600 cursor-pointer"
              >
                <div className="flex-shrink-0 w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                  {index + 1}
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-semibold text-base text-gray-800 select-text">
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

function ChapterTitlePage({ chapter, pageNumber }) {
  return (
    <div className="page-inner bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
      <div className="h-full flex flex-col justify-center items-center p-8 relative">
        <div className="text-center space-y-6">
          <div className="text-7xl mb-4">📖</div>
          <div className="space-y-4">
            <h2 className="text-4xl font-bold leading-tight px-6 select-text">
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

function ContentPage({ page, chapterTitle, pageNumber }) {
  return (
    <div className="page-inner bg-gradient-to-br from-white to-gray-50">
      <div className="h-full flex flex-col p-8">
        <div className="pb-3 border-b-2 border-gray-300 flex-shrink-0">
          <p className="text-xs text-gray-500 uppercase tracking-wide select-text">{chapterTitle}</p>
        </div>

        <div className="flex-1 mt-4 overflow-y-auto">
          <div 
            className="book-content-text select-text"
            style={{
              fontSize: '16px',
              lineHeight: '1.75',
              fontFamily: 'system-ui, -apple-system, sans-serif'
            }}
            dangerouslySetInnerHTML={{ 
              __html: page.content || '<p class="text-gray-400 italic text-center mt-20">No content available</p>' 
            }}
          />
        </div>

        <div className="pt-4 text-center flex-shrink-0 border-t border-gray-200 mt-auto">
          <span className="text-sm text-gray-400">{pageNumber}</span>
        </div>
      </div>
    </div>
  );
}

function BackCoverPage({ book }) {
  return (
    <div className="page-inner bg-gradient-to-br from-gray-800 to-gray-900 text-white">
      <div className="h-full flex flex-col justify-center items-center p-8">
        <div className="text-center space-y-6">
          <div className="text-7xl mb-4">✨</div>
          <h2 className="text-3xl font-bold">Thank You for Reading!</h2>
          <div className="w-32 h-1 bg-white mx-auto"></div>
          <p className="text-2xl font-semibold select-text">{book?.title}</p>
          <p className="text-lg text-gray-300 select-text">by {book?.author_name}</p>
          <div className="mt-8 space-y-2">
            <p className="text-sm text-gray-400 select-text">{book?.subject_name}</p>
            <p className="text-sm text-gray-400 select-text">{book?.topic_name}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
