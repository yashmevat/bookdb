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



  // A4 EXACT dimensions at 96 DPI

  const A4_WIDTH = 794;

  const A4_HEIGHT = 1123;

  const HEADER_HEIGHT = 60;

  const FOOTER_HEIGHT = 60;

  const CONTENT_HEIGHT = 1003;



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



  useEffect(() => {

    return () => {

      if (speechRef.current) {

        window.speechSynthesis.cancel();

      }

    };

  }, []);



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



  const getPageText = () => {

    const leftPageIndex = currentSpreadIndex * 2;

    const rightPageIndex = leftPageIndex + 1;

    const leftPage = allPages[leftPageIndex];

    const rightPage = allPages[rightPageIndex];



    let combinedText = '';



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



    window.speechSynthesis.cancel();



    const utterance = new SpeechSynthesisUtterance(text);

    utterance.lang = 'en-US';

    utterance.rate = 1.0;

    utterance.pitch = 1.0;

    utterance.volume = 1.0;



    utterance.onend = () => {

      setIsSpeaking(false);

      setIsPaused(false);

     

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

          display: flex;

          flex-direction: column;

        }



        .select-text, .select-text * {

          user-select: text !important;

          -webkit-user-select: text !important;

          -moz-user-select: text !important;

          -ms-user-select: text !important;

          cursor: text !important;

        }



        .book-closed {

          cursor: pointer;

          transition: transform 0.3s ease;

        }



        .book-closed:hover {

          transform: scale(1.05);

        }



        /* Navbar Controls Styling */

        .navbar-controls {

          display: flex;

          align-items: center;

          gap: 12px;

        }



        .control-btn {

          background: rgba(255, 255, 255, 0.1);

          backdrop-filter: blur(10px);

          border: 1px solid rgba(255, 255, 255, 0.2);

          color: white;

          padding: 8px 16px;

          border-radius: 8px;

          cursor: pointer;

          transition: all 0.3s ease;

          font-size: 14px;

          font-weight: 500;

          display: flex;

          align-items: center;

          gap: 6px;

        }



        .control-btn:hover:not(:disabled) {

          background: rgba(255, 255, 255, 0.2);

          transform: translateY(-2px);

        }



        .control-btn:disabled {

          opacity: 0.4;

          cursor: not-allowed;

        }



        .control-btn.active {

          background: rgba(99, 102, 241, 0.3);

          border-color: rgba(99, 102, 241, 0.5);

        }



        @keyframes pulse-border {

          0%, 100% {

            border-color: rgba(99, 102, 241, 0.5);

          }

          50% {

            border-color: rgba(99, 102, 241, 1);

          }

        }



        .control-btn.speaking {

          animation: pulse-border 1.5s ease-in-out infinite;

        }



        /* A4 Print Support */

        @media print {

          @page {

            size: A4;

            margin: 0;

          }

        }

      `}</style>



      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">

        {/* Top Navbar */}

        <div className="sticky top-0 z-50 bg-black/30 backdrop-blur-md border-b border-white/10">

          <div className="max-w-7xl mx-auto px-4 py-3">

            <div className="flex justify-between items-center">

              {/* Left: Back Button */}

              <Link

                href="/"

                className="control-btn"

              >

                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">

                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />

                </svg>

                Back

              </Link>



              {/* Center: Book Title & Page Info */}

              <div className="text-white text-center flex-1 mx-8">

                <h1 className="text-xl font-bold drop-shadow-lg truncate">{book?.title}</h1>

                {bookOpened && (

                  <p className="text-xs text-purple-200 mt-1">

                    Page {leftPageIndex + 1}-{rightPageIndex + 1} of {allPages.length}

                  </p>

                )}

              </div>



              {/* Right: Navigation & Audio Controls */}

              <div className="navbar-controls">

                {bookOpened && (

                  <>

                    {/* Previous Page */}

                    <button

                      onClick={prevPage}

                      disabled={currentSpreadIndex === 0 || isFlipping}

                      className="control-btn"

                      title="Previous Page (←)"

                    >

                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">

                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />

                      </svg>

                    </button>



                    {/* Next Page */}

                    <button

                      onClick={nextPage}

                      disabled={currentSpreadIndex >= Math.ceil(allPages.length / 2) - 1 || isFlipping}

                      className="control-btn"

                      title="Next Page (→)"

                    >

                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">

                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />

                      </svg>

                    </button>



                    {/* Divider */}

                    <div className="h-8 w-px bg-white/20"></div>



                    {/* Audio Controls */}

                    {!isSpeaking ? (

                      <button

                        onClick={startSpeaking}

                        className="control-btn"

                        title="Read Aloud"

                      >

                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">

                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />

                        </svg>

                        Play

                      </button>

                    ) : (

                      <>

                        {!isPaused ? (

                          <button

                            onClick={pauseSpeaking}

                            className="control-btn active speaking"

                            title="Pause"

                          >

                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">

                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />

                            </svg>

                            Pause

                          </button>

                        ) : (

                          <button

                            onClick={resumeSpeaking}

                            className="control-btn active"

                            title="Resume"

                          >

                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">

                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />

                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />

                            </svg>

                            Resume

                          </button>

                        )}

                        <button

                          onClick={stopSpeaking}

                          className="control-btn"

                          title="Stop"

                        >

                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">

                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />

                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />

                          </svg>

                        </button>

                      </>

                    )}



                    {/* Divider */}

                    <div className="h-8 w-px bg-white/20"></div>



                    {/* Close Book */}

                    <button

                      onClick={closeBook}

                      className="control-btn"

                      title="Close Book"

                    >

                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">

                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />

                      </svg>

                      Close

                    </button>

                  </>

                )}

              </div>

            </div>

          </div>

        </div>



        {/* Book Content Area */}

        <div className="flex justify-center items-center px-4 py-8">

          {!bookOpened ? (

            <div

              className="book-closed"

              onClick={openBook}

            >

              <div className="book-page" style={{ width: `${A4_WIDTH}px`, height: `${A4_HEIGHT}px` }}>

                <CoverPage book={book} />

              </div>

              <p className="text-white text-center mt-6 text-lg animate-pulse">

                📖 Click to open book • A4 Size (210×297mm)

              </p>

            </div>

          ) : (

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

                    <div className="book-page" style={{ width: `${A4_WIDTH}px`, height: `${A4_HEIGHT}px` }}>

                      <PageContent

                        page={nextLeftPage}

                        pageNumber={(currentSpreadIndex + 1) * 2 + 1}

                        onChapterClick={goToPage}

                        book={book}

                      />

                    </div>

                    {nextRightPage && (

                      <div className="book-page" style={{ width: `${A4_WIDTH}px`, height: `${A4_HEIGHT}px` }}>

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

                    <div className="book-page" style={{ width: `${A4_WIDTH}px`, height: `${A4_HEIGHT}px` }}>

                      <PageContent

                        page={prevLeftPage}

                        pageNumber={(currentSpreadIndex - 1) * 2 + 1}

                        onChapterClick={goToPage}

                        book={book}

                      />

                    </div>

                    {prevRightPage && (

                      <div className="book-page" style={{ width: `${A4_WIDTH}px`, height: `${A4_HEIGHT}px` }}>

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

                      width: `${A4_WIDTH}px`,

                      height: `${A4_HEIGHT}px`,

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

                      width: `${A4_WIDTH}px`,

                      height: `${A4_HEIGHT}px`,

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

          )}

        </div>



        {/* Bottom Instructions */}

        {bookOpened && (

          <div className="text-center pb-8 px-4">

            <p className="text-white text-sm">

              💡 Drag pages to flip • Use arrow keys (← →) • Click text to select

            </p>

            <p className="text-white text-xs mt-2 opacity-75">

              📄 A4 Format (794×1123px at 96 DPI)

            </p>

          </div>

        )}

      </div>

    </>

  );

}



// Page Content Component (same as before)

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



function CoverPage({ book }) {

  return (

    <div className="page-inner bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 text-white">

      <div className="flex-1 flex flex-col justify-center items-center p-12">

        <div className="text-center space-y-8">

          <div className="text-8xl mb-8">📚</div>

          <h1 className="text-5xl font-bold leading-tight drop-shadow-2xl px-6 select-text">

            {book?.title || 'Untitled Book'}

          </h1>

          <div className="w-32 h-1 bg-white mx-auto"></div>

          <div className="space-y-3">

            <p className="text-2xl">by</p>

            <p className="text-3xl font-semibold select-text">{book?.author_name || 'Unknown Author'}</p>

          </div>

          <div className="mt-10 space-y-4">

            <div className="inline-block px-8 py-3 bg-white/20 backdrop-blur-sm rounded-full text-lg font-medium select-text">

              {book?.subject_name || 'Subject'}

            </div>

            <br />

            <div className="inline-block px-8 py-3 bg-white/20 backdrop-blur-sm rounded-full text-lg font-medium select-text">

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

      <div className="flex-1 flex flex-col p-10">

        <h2 className="text-4xl font-bold text-gray-800 mb-8 text-center border-b-4 border-blue-600 pb-4 select-text">

          Table of Contents

        </h2>

       

        <div className="flex-1 space-y-4 overflow-y-auto">

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

                className="w-full flex items-center gap-4 p-4 hover:bg-blue-50 transition-all rounded-lg border-l-4 border-blue-600 cursor-pointer shadow-sm hover:shadow-md"

              >

                <div className="flex-shrink-0 w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-lg">

                  {index + 1}

                </div>

                <div className="flex-1 text-left">

                  <h3 className="font-semibold text-lg text-gray-800 select-text">

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

      <div className="flex-1 flex flex-col justify-center items-center p-12 relative">

        <div className="text-center space-y-8">

          <div className="text-8xl mb-6">📖</div>

          <div className="space-y-6">

            <h2 className="text-5xl font-bold leading-tight px-8 select-text">

              {chapter.title}

            </h2>

            <div className="w-32 h-1 bg-white mx-auto"></div>

          </div>

        </div>

       

        <div className="absolute bottom-8 left-0 right-0 text-center">

          <span className="text-sm opacity-75">{pageNumber}</span>

        </div>

      </div>

    </div>

  );

}



function ContentPage({ page, chapterTitle, pageNumber }) {

  return (

    <div className="page-inner bg-gradient-to-br from-white to-gray-50">

      <div

        className="flex-shrink-0 pb-4 border-b-2 border-gray-300 px-10 pt-4"

        style={{ height: '60px' }}

      >

        <p className="text-xs text-gray-500 uppercase tracking-wide select-text truncate">

          {chapterTitle}

        </p>

      </div>



      <div

        className="flex-1 px-10 py-8 overflow-y-auto"

        style={{

          fontSize: '16px',

          lineHeight: '1.75',

          fontFamily: 'Georgia, "Times New Roman", serif'

        }}

      >

        <div

          className="book-content-text select-text"

          dangerouslySetInnerHTML={{

            __html: page.content || '<p class="text-gray-400 italic text-center mt-20">No content available</p>'

          }}

        />

      </div>



      <div

        className="flex-shrink-0 pt-4 text-center border-t border-gray-200 pb-4"

        style={{ height: '60px' }}

      >

        <span className="text-sm text-gray-400">{pageNumber}</span>

      </div>

    </div>

  );

}



function BackCoverPage({ book }) {

  return (

    <div className="page-inner bg-gradient-to-br from-gray-800 to-gray-900 text-white">

      <div className="flex-1 flex flex-col justify-center items-center p-12">

        <div className="text-center space-y-8">

          <div className="text-8xl mb-6">✨</div>

          <h2 className="text-4xl font-bold">Thank You for Reading!</h2>

          <div className="w-32 h-1 bg-white mx-auto"></div>

          <p className="text-3xl font-semibold select-text px-8">{book?.title}</p>

          <p className="text-xl text-gray-300 select-text">by {book?.author_name}</p>

          <div className="mt-10 space-y-3">

            <p className="text-base text-gray-400 select-text">{book?.subject_name}</p>

            <p className="text-base text-gray-400 select-text">{book?.topic_name}</p>

          </div>

        </div>

      </div>

    </div>

  );

}






















'use client';
import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function PagesPage() {
  const params = useParams();
  const chapterId = params.chapterId;

  const [pages, setPages] = useState([]);
  const [chapterTitle, setChapterTitle] = useState('');
  const [bookId, setBookId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [quillLoaded, setQuillLoaded] = useState(false);
  
  const [livePages, setLivePages] = useState([
    { id: 'page-1', content: '', existingPageId: null }
  ]);
  const [selectedPageIndex, setSelectedPageIndex] = useState(0);
  const [editingPageId, setEditingPageId] = useState(null);
  const quillRefs = useRef({});

  // A4 EXACT DIMENSIONS (96 DPI standard)
  // A4 = 210mm × 297mm = 794px × 1123px at 96 DPI
  const PAGE_WIDTH = 794;
  const PAGE_HEIGHT = 1123;
  const HEADER_HEIGHT = 60;
  const FOOTER_HEIGHT = 50;
  const CONTENT_PADDING = 40; // More padding for A4
  const CONTENT_HEIGHT = PAGE_HEIGHT - HEADER_HEIGHT - FOOTER_HEIGHT; // 1013px
  const CONTENT_WIDTH = PAGE_WIDTH - (CONTENT_PADDING * 2); // 714px

  useEffect(() => {
    const loadQuill = async () => {
      const link = document.createElement('link');
      link.href = 'https://cdn.quilljs.com/1.3.6/quill.snow.css';
      link.rel = 'stylesheet';
      document.head.appendChild(link);

      const script = document.createElement('script');
      script.src = 'https://cdn.quilljs.com/1.3.6/quill.js';
      script.onload = () => setQuillLoaded(true);
      document.body.appendChild(script);
    };

    loadQuill();
    fetchPages();
    fetchChapterDetails();

    return () => {
      Object.values(quillRefs.current).forEach(quill => {
        if (quill) {
          const container = quill.container;
          if (container && container.parentNode) {
            container.parentNode.innerHTML = '';
          }
        }
      });
    };
  }, [chapterId]);

  const fetchChapterDetails = async () => {
    const res = await fetch(`/api/author/chapters?chapter_id=${chapterId}`);
    const data = await res.json();
    if (data.success && data.data.length > 0) {
      setChapterTitle(data.data[0].title);
      setBookId(data.data[0].book_id);
    }
  };

  const fetchPages = async () => {
    const res = await fetch(`/api/author/pages?chapter_id=${chapterId}`);
    const data = await res.json();
    if (data.success) {
      setPages(data.data);
    }
  };

  const splitContentIntoPages = (htmlContent) => {
    const tempDiv = document.createElement('div');
    tempDiv.style.cssText = `
      position: absolute;
      visibility: hidden;
      width: ${CONTENT_WIDTH}px;
      padding: 0;
      font-size: 16px;
      line-height: 1.6;
      font-family: 'Georgia', 'Times New Roman', serif;
      word-wrap: break-word;
      overflow-wrap: break-word;
    `;
    document.body.appendChild(tempDiv);

    const pages = [];
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div>${htmlContent}</div>`, 'text/html');
    const blocks = Array.from(doc.body.querySelector('div').children);

    let currentPageHTML = '';
    let currentHeight = 0;

    for (let blockIdx = 0; blockIdx < blocks.length; blockIdx++) {
      const block = blocks[blockIdx];
      const tagName = block.tagName.toLowerCase();
      let blockAttrs = '';
      
      for (let attr of block.attributes) {
        blockAttrs += ` ${attr.name}="${attr.value}"`;
      }

      // Test if block fits
      const blockHTML = `<${tagName}${blockAttrs}>${block.innerHTML}</${tagName}>`;
      const testHTML = currentPageHTML + blockHTML;
      tempDiv.innerHTML = testHTML;
      const testHeight = tempDiv.scrollHeight;

      if (testHeight > CONTENT_HEIGHT) {
        // Block doesn't fit, need to split
        if (currentPageHTML.trim()) {
          pages.push(currentPageHTML.trim());
          currentPageHTML = '';
        }

        // Try to split block by sentences
        const sentences = block.innerHTML.split(/(?<=[.!?])\s+/);
        let sentenceBuffer = '';

        for (let sentence of sentences) {
          if (!sentence.trim()) continue;

          const testSentence = sentenceBuffer 
            ? `${sentenceBuffer} ${sentence}` 
            : sentence;
          
          const testHTML = `<${tagName}${blockAttrs}>${testSentence}</${tagName}>`;
          tempDiv.innerHTML = currentPageHTML + testHTML;

          if (tempDiv.scrollHeight > CONTENT_HEIGHT) {
            // Sentence doesn't fit
            if (sentenceBuffer) {
              const sentenceHTML = `<${tagName}${blockAttrs}>${sentenceBuffer}</${tagName}>`;
              const pageToSave = (currentPageHTML + sentenceHTML).trim();
              
              if (pageToSave) {
                pages.push(pageToSave);
              }
              currentPageHTML = '';
              sentenceBuffer = sentence;
            } else {
              // Even single sentence is too big, split by words
              const words = sentence.split(/\s+/);
              let wordBuffer = '';

              for (let word of words) {
                const testWord = wordBuffer ? `${wordBuffer} ${word}` : word;
                const testHTML = `<${tagName}${blockAttrs}>${testWord}</${tagName}>`;
                tempDiv.innerHTML = currentPageHTML + testHTML;

                if (tempDiv.scrollHeight > CONTENT_HEIGHT && wordBuffer) {
                  const wordHTML = `<${tagName}${blockAttrs}>${wordBuffer}</${tagName}>`;
                  pages.push((currentPageHTML + wordHTML).trim());
                  currentPageHTML = '';
                  wordBuffer = word;
                } else {
                  wordBuffer = testWord;
                }
              }

              if (wordBuffer) {
                sentenceBuffer = wordBuffer;
              }
            }
          } else {
            sentenceBuffer = testSentence;
          }
        }

        if (sentenceBuffer) {
          const finalHTML = `<${tagName}${blockAttrs}>${sentenceBuffer}</${tagName}>`;
          currentPageHTML += finalHTML;
        }
      } else {
        currentPageHTML = testHTML;
      }
    }

    // Add remaining content
    if (currentPageHTML.trim() && currentPageHTML !== '<p><br></p>') {
      pages.push(currentPageHTML.trim());
    }

    document.body.removeChild(tempDiv);
    return pages.length > 0 ? pages : [htmlContent];
  };

  const initQuill = (index) => {
    if (!window.Quill) return;

    const editorId = `editor-${index}`;
    const container = document.getElementById(editorId);
    
    if (!container) return;

    if (quillRefs.current[index]) {
      container.innerHTML = '';
    }

    const quill = new window.Quill(`#${editorId}`, {
      theme: 'snow',
      modules: {
        toolbar: [
          [{ 'header': [1, 2, 3, false] }],
          ['bold', 'italic', 'underline', 'strike'],
          [{ 'color': [] }, { 'background': [] }],
          [{ 'list': 'ordered'}, { 'list': 'bullet' }],
          [{ 'align': [] }],
          ['link', 'image'],
          ['clean']
        ],
        clipboard: {
          matchVisual: false
        }
      },
      placeholder: 'Start typing or paste content...'
    });

    if (livePages[index]?.content) {
      quill.root.innerHTML = livePages[index].content;
    }

    quill.clipboard.addMatcher(Node.ELEMENT_NODE, (node, delta) => {
      setTimeout(() => {
        const currentContent = quill.root.innerHTML;
        const currentHeight = quill.root.scrollHeight;

        if (currentHeight > CONTENT_HEIGHT) {
          const splitPages = splitContentIntoPages(currentContent);

          if (splitPages.length > 1) {
            quill.root.innerHTML = splitPages[0];
            updatePageContent(index, splitPages[0]);

            const newPages = [...livePages];
            for (let i = 1; i < splitPages.length; i++) {
              newPages.splice(index + i, 0, {
                id: `page-${Date.now()}-${i}`,
                content: splitPages[i],
                existingPageId: null
              });
            }

            setLivePages(newPages);

            setTimeout(() => {
              alert(`✅ Content split into ${splitPages.length} A4 pages!`);
            }, 200);
          }
        }
      }, 100);

      return delta;
    });

    quill.on('text-change', () => {
      const content = quill.root.innerHTML;
      updatePageContent(index, content);

      const editorHeight = quill.root.scrollHeight;
      const fillPercentage = Math.round((editorHeight / CONTENT_HEIGHT) * 100);
      
      const pageHeader = document.querySelector(`#editor-${index}`)?.closest('.page-editor-container')?.querySelector('.page-header');
      const pageStatus = pageHeader?.querySelector('.page-status');
      
      if (pageHeader && pageStatus) {
        if (editorHeight > CONTENT_HEIGHT) {
          pageHeader.style.background = '#fee2e2';
          pageStatus.textContent = '⚠️ Exceeds A4 page!';
          pageStatus.className = 'page-status ml-3 text-xs font-semibold text-red-600';
        } else if (fillPercentage >= 95) {
          pageHeader.style.background = '#fef3c7';
          pageStatus.textContent = `${fillPercentage}% filled`;
          pageStatus.className = 'page-status ml-3 text-xs font-semibold text-yellow-700';
        } else {
          pageHeader.style.background = '#f9fafb';
          pageStatus.textContent = `${fillPercentage}% filled`;
          pageStatus.className = 'page-status ml-3 text-xs font-semibold text-gray-600';
        }
      }
    });

    quillRefs.current[index] = quill;
  };

  useEffect(() => {
    if (quillLoaded) {
      livePages.forEach((_, index) => {
        setTimeout(() => initQuill(index), 100 * index);
      });
    }
  }, [quillLoaded, livePages.length]);

  const updatePageContent = (index, content) => {
    setLivePages(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], content };
      return updated;
    });
  };

  const addNewPage = () => {
    const newPage = { id: `page-${Date.now()}`, content: '', existingPageId: null };
    setLivePages(prev => [...prev, newPage]);
    setEditingPageId(null);
    setTimeout(() => {
      initQuill(livePages.length);
      setSelectedPageIndex(livePages.length);
    }, 200);
  };

  const deletePage = (index) => {
    if (livePages.length === 1) {
      alert('Cannot delete the last page!');
      return;
    }

    if (quillRefs.current[index]) {
      delete quillRefs.current[index];
    }

    const newPages = livePages.filter((_, i) => i !== index);
    setLivePages(newPages);

    if (selectedPageIndex >= newPages.length) {
      setSelectedPageIndex(newPages.length - 1);
    }
  };

  const saveAllPages = async () => {
    setLoading(true);

    const pagesToSave = livePages
      .map(page => ({
        content: page.content,
        existingPageId: page.existingPageId
      }))
      .filter(page => page.content && page.content.trim() !== '' && page.content !== '<p><br></p>');

    if (pagesToSave.length === 0) {
      alert('No content to save!');
      setLoading(false);
      return;
    }

    let savedCount = 0;
    let updatedCount = 0;
    let failedCount = 0;

    for (let page of pagesToSave) {
      try {
        if (page.existingPageId) {
          const res = await fetch('/api/author/pages', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: page.existingPageId,
              content: page.content.trim()
            })
          });

          const data = await res.json();
          if (data.success) {
            updatedCount++;
          } else {
            failedCount++;
          }
        } else {
          const pageData = {
            chapter_id: chapterId,
            content: page.content.trim()
          };

          const res = await fetch('/api/author/pages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pageData)
          });

          const data = await res.json();
          if (data.success) {
            savedCount++;
          } else {
            failedCount++;
          }
        }
      } catch (error) {
        failedCount++;
      }
    }

    if (savedCount > 0 || updatedCount > 0) {
      let message = '✅ Success!\n';
      if (savedCount > 0) message += `📄 Created ${savedCount} new page(s)\n`;
      if (updatedCount > 0) message += `✏️ Updated ${updatedCount} page(s)\n`;
      if (failedCount > 0) message += `❌ Failed ${failedCount} page(s)`;
      
      alert(message);
      
      Object.values(quillRefs.current).forEach((quill, index) => {
        if (quill) {
          const container = document.getElementById(`editor-${index}`);
          if (container) container.innerHTML = '';
        }
      });
      
      quillRefs.current = {};
      setLivePages([{ id: `page-${Date.now()}`, content: '', existingPageId: null }]);
      setSelectedPageIndex(0);
      setEditingPageId(null);
      fetchPages();
      
      setTimeout(() => initQuill(0), 300);
    } else {
      alert('❌ Failed to save pages');
    }

    setLoading(false);
  };

  const countWords = (html) => {
    if (typeof window === 'undefined') return 0;
    const temp = document.createElement('div');
    temp.innerHTML = html;
    const text = temp.textContent || temp.innerText || '';
    return text.trim().split(/\s+/).filter(w => w.length > 0).length;
  };

  const updatePageStatus = (quill, container) => {
    if (!quill || !container) return;
    
    const editorHeight = quill.root.scrollHeight;
    const fillPercentage = Math.round((editorHeight / CONTENT_HEIGHT) * 100);
    
    const pageHeader = container.closest('.page-editor-container')?.querySelector('.page-header');
    const pageStatus = pageHeader?.querySelector('.page-status');
    
    if (pageHeader && pageStatus) {
      if (editorHeight > CONTENT_HEIGHT) {
        pageHeader.style.background = '#fee2e2';
        pageStatus.textContent = '⚠️ Exceeds A4 page!';
        pageStatus.className = 'page-status ml-3 text-xs font-semibold text-red-600';
      } else if (fillPercentage >= 95) {
        pageHeader.style.background = '#fef3c7';
        pageStatus.textContent = `${fillPercentage}% filled`;
        pageStatus.className = 'page-status ml-3 text-xs font-semibold text-yellow-700';
      } else {
        pageHeader.style.background = '#f9fafb';
        pageStatus.textContent = `${fillPercentage}% filled`;
        pageStatus.className = 'page-status ml-3 text-xs font-semibold text-gray-600';
      }
    }
  };

  const handleEditExistingPage = (page) => {
    if (!page || !page.content) {
      alert('Invalid page data');
      return;
    }

    Object.keys(quillRefs.current).forEach(key => {
      const quill = quillRefs.current[key];
      if (quill && quill.container) {
        const parent = quill.container.parentNode;
        if (parent) {
          parent.innerHTML = '';
        }
      }
    });
    quillRefs.current = {};

    setEditingPageId(page.id);
    setSelectedPageIndex(0);
    
    const newPage = {
      id: `edit-${Date.now()}`,
      content: page.content,
      existingPageId: page.id
    };
    
    setLivePages([newPage]);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    setTimeout(() => {
      const container = document.getElementById('editor-0');
      
      if (!container || !window.Quill) return;

      container.innerHTML = '';
      
      const quill = new window.Quill('#editor-0', {
        theme: 'snow',
        modules: {
          toolbar: [
            [{ 'header': [1, 2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'color': [] }, { 'background': [] }],
            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
            [{ 'align': [] }],
            ['link', 'image'],
            ['clean']
          ]
        },
        placeholder: 'Edit your content...'
      });

      quill.root.innerHTML = page.content;

      quill.on('text-change', () => {
        const content = quill.root.innerHTML;
        setLivePages(prev => {
          const updated = [...prev];
          updated[0] = { ...updated[0], content };
          return updated;
        });

        updatePageStatus(quill, container);
      });

      quillRefs.current[0] = quill;
      
      setTimeout(() => {
        updatePageStatus(quill, container);
      }, 100);
    }, 600);
  };

  const cancelEdit = () => {
    if (confirm('Cancel editing? Unsaved changes will be lost.')) {
      Object.values(quillRefs.current).forEach((quill, index) => {
        if (quill) {
          const container = document.getElementById(`editor-${index}`);
          if (container) container.innerHTML = '';
        }
      });
      
      quillRefs.current = {};
      setLivePages([{ id: `page-${Date.now()}`, content: '', existingPageId: null }]);
      setSelectedPageIndex(0);
      setEditingPageId(null);
      
      setTimeout(() => initQuill(0), 300);
    }
  };

  const handleDeleteExistingPage = async (id) => {
    if (!confirm('Delete this page permanently?')) return;

    const res = await fetch(`/api/author/pages?id=${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      fetchPages();
      alert('✅ Page deleted successfully!');
    } else {
      alert('❌ Failed to delete page');
    }
  };

  return (
    <>
      <style jsx global>{`
        /* A4 Paper styles */
        .page-editor-container {
          width: ${PAGE_WIDTH}px;
          height: ${PAGE_HEIGHT}px;
          background: white;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          margin: 20px auto;
          border-radius: 0;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .page-header {
          height: ${HEADER_HEIGHT}px;
          padding: 12px ${CONTENT_PADDING}px;
          background: #f9fafb;
          border-bottom: 2px solid #e5e7eb;
          display: flex;
          justify-content: space-between;
          align-items: center;
          transition: background 0.3s;
          flex-shrink: 0;
        }

        .ql-toolbar {
          flex-shrink: 0;
          border-bottom: 1px solid #e5e7eb !important;
          border-left: none !important;
          border-right: none !important;
          border-top: none !important;
        }

        .ql-container {
          font-size: 16px !important;
          line-height: 1.6 !important;
          font-family: 'Georgia', 'Times New Roman', serif !important;
          height: ${CONTENT_HEIGHT}px !important;
          flex: none !important;
          border: none !important;
          overflow: hidden !important;
        }

        .ql-editor {
          padding: ${CONTENT_PADDING}px !important;
          overflow-y: auto !important;
          height: 100% !important;
          box-sizing: border-box !important;
        }

        .page-footer {
          height: ${FOOTER_HEIGHT}px;
          padding: 12px 0;
          background: #f9fafb;
          border-top: 1px solid #e5e7eb;
          text-align: center;
          font-size: 12px;
          color: #6b7280;
          flex-shrink: 0;
        }

        .ql-editor p {
          margin-bottom: 0.8em;
          margin-top: 0;
        }

        .ql-editor h1,
        .ql-editor h2,
        .ql-editor h3 {
          margin-bottom: 0.6em;
          margin-top: 0.6em;
        }

        .ql-editor ul, .ql-editor ol {
          margin-bottom: 0.8em;
        }

        .editing-indicator {
          background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
          color: white;
          padding: 8px 16px;
          border-radius: 8px;
          font-weight: bold;
          animation: pulse 2s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }

        /* Print styles for exact A4 */
        @media print {
          .page-editor-container {
            width: 210mm;
            height: 297mm;
            page-break-after: always;
            box-shadow: none;
            margin: 0;
          }
        }
      `}</style>

      <div className="p-8 max-w-8xl mx-auto bg-gray-100 min-h-screen">
        <div className="mb-8">
          <Link 
            href={bookId ? `/author/chapters/${bookId}` : '/author/books'}
            className="text-blue-600 hover:text-blue-800 flex items-center gap-2 mb-4"
          >
            ← Back to Chapters
          </Link>
          <h1 className="text-3xl font-bold text-gray-800">A4 Page Editor</h1>
          <p className="text-gray-600 mt-2">Chapter: <span className="font-semibold">{chapterTitle}</span></p>
          <p className="text-sm text-gray-500 mt-1">📄 A4 Size: 210mm × 297mm (794px × 1123px)</p>
          {editingPageId && (
            <div className="mt-3 inline-block editing-indicator">
              ✏️ Editing Mode - Page ID: {editingPageId}
            </div>
          )}
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-6 rounded-lg shadow-lg mb-8">
          <div className="flex items-start gap-4 mb-4">
            <div className="text-4xl">📝</div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                {editingPageId ? '✏️ Edit Mode' : '📝 Create Mode'}
              </h2>
              <p className="text-gray-600 mb-4">
                {editingPageId 
                  ? '✨ Editing existing page - Perfect A4 format' 
                  : '✨ Create pages with A4 auto-split - No gaps at bottom'}
              </p>
              
              <div className="flex gap-3 flex-wrap">
                <button 
                  onClick={addNewPage}
                  disabled={!quillLoaded}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium disabled:bg-gray-400"
                >
                  ➕ Add New Page
                </button>
                <button 
                  onClick={saveAllPages}
                  disabled={loading || !quillLoaded}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400 font-medium"
                >
                  {loading ? '⏳ Saving...' : editingPageId ? '💾 Update Page' : '💾 Save All Pages'}
                </button>
                {editingPageId && (
                  <button 
                    onClick={cancelEdit}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition font-medium"
                  >
                    ❌ Cancel Edit
                  </button>
                )}
                <div className="px-4 py-2 bg-white rounded-lg border border-gray-300 font-semibold text-gray-700">
                  📄 {livePages.length} Page(s) • {livePages.reduce((sum, p) => sum + countWords(p.content), 0)} Words
                </div>
              </div>
            </div>
          </div>
        </div>

        {!quillLoaded ? (
          <div className="flex items-center justify-center p-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading editor...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {livePages.map((page, index) => (
              <div key={page.id} className="page-editor-container">
                <div className="page-header">
                  <div>
                    <span className="text-xs text-gray-500 uppercase tracking-wide">
                      {editingPageId ? `✏️ Editing Page (ID: ${editingPageId})` : `A4 Page ${index + 1}`}
                    </span>
                    <span className="page-status ml-3 text-xs font-semibold text-gray-600">0% filled</span>
                  </div>
                  {livePages.length > 1 && (
                    <button
                      onClick={() => deletePage(index)}
                      className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition"
                    >
                      🗑️
                    </button>
                  )}
                </div>
                
                <div id={`editor-${index}`} className="quill-editor"></div>
                
                <div className="page-footer">
                  {editingPageId ? 'Editing Mode' : `Page ${index + 1}`}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-16">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">📚 Saved A4 Pages ({pages.length})</h2>
          
          {pages.length === 0 ? (
            <div className="bg-white p-8 rounded-lg shadow text-center text-gray-500">
              <p className="text-lg">No saved pages yet</p>
            </div>
          ) : (
            <div className="grid gap-6">
              {pages.map((page, index) => (
                <div 
                  key={page.id} 
                  className={`bg-white p-6 rounded-lg shadow-md transition-all ${
                    editingPageId === page.id ? 'ring-4 ring-yellow-400' : ''
                  }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-semibold rounded-full">
                        A4 Page {index + 1}
                      </span>
                      <span className="text-xs text-gray-500 ml-2">
                        ({countWords(page.content || '')} words)
                      </span>
                      {editingPageId === page.id && (
                        <span className="ml-2 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded">
                          Currently Editing
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleEditExistingPage(page)}
                        disabled={editingPageId === page.id}
                        className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 text-sm disabled:bg-gray-400 disabled:cursor-not-allowed"
                      >
                        {editingPageId === page.id ? '✏️ Editing...' : '✏️ Edit'}
                      </button>
                      <button 
                        onClick={() => handleDeleteExistingPage(page.id)}
                        disabled={editingPageId === page.id}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm disabled:bg-gray-400 disabled:cursor-not-allowed"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg border max-h-96 overflow-y-auto">
                    <div dangerouslySetInnerHTML={{ __html: page.content }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}



































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

  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  const [isFlipping, setIsFlipping] = useState(false);

  const [flipDirection, setFlipDirection] = useState(null);

  const [bookOpened, setBookOpened] = useState(false);

  const [isMobile, setIsMobile] = useState(false);

 

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



  // A4 EXACT dimensions at 96 DPI

  const A4_WIDTH = 820;

  const A4_HEIGHT = 1300;



  // Check if mobile/tablet

  useEffect(() => {

    const checkMobile = () => {

      setIsMobile(window.innerWidth < 1024);

    };

   

    checkMobile();

    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);

  }, []);



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

  }, [currentPageIndex, allPages.length, bookOpened, isMobile]);



  useEffect(() => {

    return () => {

      if (speechRef.current) {

        window.speechSynthesis.cancel();

      }

    };

  }, []);



  useEffect(() => {

    if (isSpeaking) {

      stopSpeaking();

    }

  }, [currentPageIndex]);



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



  const getPageText = () => {

    let text = '';

   

    if (isMobile) {

      // Mobile: single page

      const page = allPages[currentPageIndex];

      if (page) {

        if (page.type === 'content' && page.content?.content) {

          const tempDiv = document.createElement('div');

          tempDiv.innerHTML = page.content.content;

          text = tempDiv.textContent || tempDiv.innerText || '';

        } else if (page.type === 'chapter-title') {

          text = page.content.title;

        }

      }

    } else {

      // Desktop: spread view (use currentPageIndex as spread index * 2)

      const leftPageIndex = currentPageIndex;

      const rightPageIndex = currentPageIndex + 1;

      const leftPage = allPages[leftPageIndex];

      const rightPage = allPages[rightPageIndex];



      if (leftPage) {

        if (leftPage.type === 'content' && leftPage.content?.content) {

          const tempDiv = document.createElement('div');

          tempDiv.innerHTML = leftPage.content.content;

          const leftText = tempDiv.textContent || tempDiv.innerText || '';

          if (leftText.trim()) {

            text += leftText + '\n\n';

          }

        } else if (leftPage.type === 'chapter-title') {

          text += leftPage.content.title + '\n\n';

        }

      }



      if (rightPage) {

        if (rightPage.type === 'content' && rightPage.content?.content) {

          const tempDiv = document.createElement('div');

          tempDiv.innerHTML = rightPage.content.content;

          const rightText = tempDiv.textContent || tempDiv.innerText || '';

          if (rightText.trim()) {

            text += rightText;

          }

        } else if (rightPage.type === 'chapter-title') {

          text += rightPage.content.title;

        }

      }

    }



    return text.trim();

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



    window.speechSynthesis.cancel();



    const utterance = new SpeechSynthesisUtterance(text);

    utterance.lang = 'en-US';

    utterance.rate = 1.0;

    utterance.pitch = 1.0;

    utterance.volume = 1.0;



    utterance.onend = () => {

      setIsSpeaking(false);

      setIsPaused(false);

     

      const maxIndex = isMobile ? allPages.length - 1 : allPages.length - 2;

      if (currentPageIndex < maxIndex) {

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

    setCurrentPageIndex(0);

  };



  const goToPage = (pageIndex) => {

    if (pageIndex >= 0 && pageIndex < allPages.length) {

      setCurrentPageIndex(pageIndex);

    }

  };



  const nextPage = () => {

    const maxIndex = isMobile ? allPages.length - 1 : allPages.length - 2;

   

    if (currentPageIndex < maxIndex) {

      setIsFlipping(true);

      setFlipDirection('next');

      setTimeout(() => {

        setCurrentPageIndex(prev => isMobile ? prev + 1 : prev + 2);

        setIsFlipping(false);

        setFlipDirection(null);

      }, 600);

    }

  };



  const prevPage = () => {

    if (currentPageIndex > 0) {

      setIsFlipping(true);

      setFlipDirection('prev');

      setTimeout(() => {

        setCurrentPageIndex(prev => isMobile ? prev - 1 : Math.max(0, prev - 2));

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

     

      const diff = e.touches[0].clientX - dragStartX;

      if (Math.abs(diff) > 10) {

        e.preventDefault();

      }

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



  const leftPageIndex = currentPageIndex;

  const rightPageIndex = currentPageIndex + 1;

  const leftPage = allPages[leftPageIndex];

  const rightPage = !isMobile ? allPages[rightPageIndex] : null;



  const nextLeftPage = isMobile ? allPages[currentPageIndex + 1] : allPages[currentPageIndex + 2];

  const nextRightPage = !isMobile ? allPages[currentPageIndex + 3] : null;

  const prevLeftPage = isMobile ? allPages[currentPageIndex - 1] : allPages[currentPageIndex - 2];

  const prevRightPage = !isMobile ? allPages[currentPageIndex - 1] : null;



  const dragOffset = isDragging && canDrag ? dragCurrentX - dragStartX : 0;



  return (

    <>

      <style jsx global>{`

        * {

          box-sizing: border-box;

        }



        body {

          margin: 0;

          padding: 0;

          overflow-x: hidden;

        }



        /* Book Container with Responsive Scaling */

        .book-spread-container {

          position: relative;

          perspective: 2000px;

          transform-style: preserve-3d;

        }



        .book-page {

          background: white;

          border-radius: 4px;

          box-shadow:

            0 20px 60px rgba(0, 0, 0, 0.3),

            inset 0 0 0 1px rgba(0, 0, 0, 0.1);

          position: relative;

          overflow: hidden;

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



        /* EXACT SAME FLIP ANIMATIONS AS YOUR ORIGINAL CODE */

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



        /* Mobile single page */

        @media (max-width: 1023px) {

          .book-spread {

            display: block;

          }

         

          .page-right {

            display: none;

          }

        }



        .page-inner {

          width: 100%;

          height: 100%;

          backface-visibility: hidden;

          -webkit-backface-visibility: hidden;

          display: flex;

          flex-direction: column;

        }



        .select-text, .select-text * {

          user-select: text !important;

          -webkit-user-select: text !important;

          -moz-user-select: text !important;

          -ms-user-select: text !important;

          cursor: text !important;

        }



        .book-closed {

          cursor: pointer;

          transition: transform 0.3s ease;

        }



        .book-closed:hover {

          transform: scale(1.05);

        }



        /* Navbar Controls Styling */

        .navbar-controls {

          display: flex;

          align-items: center;

          gap: 12px;

        }



        .control-btn {

          background: rgba(255, 255, 255, 0.1);

          backdrop-filter: blur(10px);

          border: 1px solid rgba(255, 255, 255, 0.2);

          color: white;

          padding: 8px 16px;

          border-radius: 8px;

          cursor: pointer;

          transition: all 0.3s ease;

          font-size: 14px;

          font-weight: 500;

          display: flex;

          align-items: center;

          gap: 6px;

          white-space: nowrap;

        }



        .control-btn:hover:not(:disabled) {

          background: rgba(255, 255, 255, 0.2);

          transform: translateY(-2px);

        }



        .control-btn:disabled {

          opacity: 0.4;

          cursor: not-allowed;

        }



        .control-btn.active {

          background: rgba(99, 102, 241, 0.3);

          border-color: rgba(99, 102, 241, 0.5);

        }



        @keyframes pulse-border {

          0%, 100% {

            border-color: rgba(99, 102, 241, 0.5);

          }

          50% {

            border-color: rgba(99, 102, 241, 1);

          }

        }



        .control-btn.speaking {

          animation: pulse-border 1.5s ease-in-out infinite;

        }



        /* Responsive Viewport Scaling */

        @media (max-width: 1700px) {

          .book-spread-container {

            transform: scale(0.85);

          }

        }



        @media (max-width: 1400px) {

          .book-spread-container {

            transform: scale(0.7);

          }

        }



        @media (max-width: 1024px) {

          .book-spread-container {

            transform: scale(0.9);

          }

        }



        @media (max-width: 850px) {

          .book-spread-container {

            transform: scale(0.75);

          }

        }



        @media (max-width: 768px) {

          .book-spread-container {

            transform: scale(0.65);

          }

         

          .navbar-controls {

            gap: 6px;

          }

         

          .control-btn {

            padding: 6px 10px;

            font-size: 12px;

            gap: 4px;

          }

         

          .control-btn svg {

            width: 14px;

            height: 14px;

          }

        }



        @media (max-width: 600px) {

          .book-spread-container {

            transform: scale(0.55);

          }

        }



        @media (max-width: 480px) {

          .book-spread-container {

            transform: scale(0.48);

          }

         

          .control-btn span {

            display: none;

          }

         

          .control-btn {

            padding: 6px;

          }

        }



        @media (max-width: 400px) {

          .book-spread-container {

            transform: scale(0.42);

          }

        }



        /* Navbar Responsive */

        .navbar-container {

          display: flex;

          justify-content: space-between;

          align-items: center;

          gap: 8px;

          flex-wrap: wrap;

        }



        .navbar-left {

          flex-shrink: 0;

        }



        .navbar-center {

          flex: 1;

          min-width: 0;

          text-align: center;

        }



        .navbar-right {

          display: flex;

          align-items: center;

          gap: 6px;

          flex-shrink: 0;

          flex-wrap: wrap;

        }



        .navbar-title {

          font-size: 20px;

          font-weight: bold;

        }



        @media (max-width: 768px) {

          .navbar-container {

            gap: 4px;

          }



          .navbar-title {

            font-size: 14px !important;

          }



          .navbar-page-info {

            font-size: 10px !important;

          }

         

          .navbar-right .divider {

            display: none !important;

          }

        }



        @media (max-width: 480px) {

          .navbar-title {

            font-size: 12px !important;

          }

        }



        /* A4 Print Support */

        @media print {

          @page {

            size: A4;

            margin: 0;

          }

        }

         

      `}</style>



      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">

        {/* Top Navbar - Fully Responsive */}

        <div className="sticky top-0 z-50 bg-black/30 backdrop-blur-md border-b border-white/10">

          <div className="max-w-full mx-auto px-2 sm:px-4 py-2">

            <div className="navbar-container">

              {/* Left: Back Button */}

              <div className="navbar-left">

                <Link href="/" className="control-btn">

                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">

                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />

                  </svg>

                  <span>Back</span>

                </Link>

              </div>



              {/* Center: Book Title & Page Info */}

              <div className="navbar-center">

                <h1 className="navbar-title text-white drop-shadow-lg truncate px-2">

                  {book?.title}

                </h1>

                {bookOpened && (

                  <p className="navbar-page-info text-xs text-purple-200 mt-0.5">

                    {isMobile

                      ? `Page ${leftPageIndex + 1}/${allPages.length}`

                      : `Page ${leftPageIndex + 1}-${rightPageIndex + 1}/${allPages.length}`

                    }

                  </p>

                )}

              </div>



              {/* Right: Controls */}

              <div className="navbar-right">

                {bookOpened && (

                  <>

                    {/* Navigation */}

                    <button

                      onClick={prevPage}

                      disabled={currentPageIndex === 0 || isFlipping}

                      className="control-btn"

                      title="Previous Page (←)"

                    >

                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">

                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />

                      </svg>

                      <span>Prev</span>

                    </button>



                    <button

                      onClick={nextPage}

                      disabled={currentPageIndex >= (isMobile ? allPages.length - 1 : allPages.length - 2) || isFlipping}

                      className="control-btn"

                      title="Next Page (→)"

                    >

                      <span>Next</span>

                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">

                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />

                      </svg>

                    </button>



                    {/* Divider - Hidden on mobile */}

                    <div className="h-8 w-px bg-white/20 divider"></div>



                    {/* Audio Controls */}

                    {!isSpeaking ? (

                      <button onClick={startSpeaking} className="control-btn" title="Read Aloud">

                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">

                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />

                        </svg>

                        <span>Play</span>

                      </button>

                    ) : (

                      <>

                        {!isPaused ? (

                          <button onClick={pauseSpeaking} className="control-btn active speaking" title="Pause">

                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">

                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />

                            </svg>

                            <span>Pause</span>

                          </button>

                        ) : (

                          <button onClick={resumeSpeaking} className="control-btn active" title="Resume">

                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">

                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />

                            </svg>

                            <span>Resume</span>

                          </button>

                        )}

                        <button onClick={stopSpeaking} className="control-btn" title="Stop">

                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">

                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />

                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />

                          </svg>

                          <span>Stop</span>

                        </button>

                      </>

                    )}



                    <div className="h-8 w-px bg-white/20 divider"></div>



                    <button onClick={closeBook} className="control-btn" title="Close Book">

                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">

                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />

                      </svg>

                      <span>Close</span>

                    </button>

                  </>

                )}

              </div>

            </div>

          </div>

        </div>



        {/* Book Content Area */}

        <div className="flex justify-center items-center px-4 py-8">

          {!bookOpened ? (

            <div className="book-closed" onClick={openBook}>

              <div className="book-page" style={{ width: `${A4_WIDTH}px`, height: `${A4_HEIGHT}px` }}>

                <CoverPage book={book} />

              </div>

              <p className="text-white text-center mt-6 text-lg animate-pulse">

                📖 Click to open book • A4 Size (210×297mm)

              </p>

            </div>

          ) : (

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

                    <div className="book-page" style={{ width: `${A4_WIDTH}px`, height: `${A4_HEIGHT}px` }}>

                      <PageContent

                        page={nextLeftPage}

                        pageNumber={currentPageIndex + (isMobile ? 2 : 3)}

                        onChapterClick={goToPage}

                        book={book}

                      />

                    </div>

                    {nextRightPage && !isMobile && (

                      <div className="book-page" style={{ width: `${A4_WIDTH}px`, height: `${A4_HEIGHT}px` }}>

                        <PageContent

                          page={nextRightPage}

                          pageNumber={currentPageIndex + 4}

                          onChapterClick={goToPage}

                          book={book}

                        />

                      </div>

                    )}

                  </>

                )}



                {isFlipping && flipDirection === 'prev' && prevLeftPage && (

                  <>

                    <div className="book-page" style={{ width: `${A4_WIDTH}px`, height: `${A4_HEIGHT}px` }}>

                      <PageContent

                        page={prevLeftPage}

                        pageNumber={currentPageIndex - (isMobile ? 0 : 1)}

                        onChapterClick={goToPage}

                        book={book}

                      />

                    </div>

                    {prevRightPage && !isMobile && (

                      <div className="book-page" style={{ width: `${A4_WIDTH}px`, height: `${A4_HEIGHT}px` }}>

                        <PageContent

                          page={prevRightPage}

                          pageNumber={currentPageIndex}

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

                      width: `${A4_WIDTH}px`,

                      height: `${A4_HEIGHT}px`,

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



                {rightPage && !isMobile && (

                  <div

                    className="book-page page-right page-flip-animation"

                    style={{

                      width: `${A4_WIDTH}px`,

                      height: `${A4_HEIGHT}px`,

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

          )}

        </div>



        {/* Bottom Instructions */}

        {bookOpened && (

          <div className="text-center pb-8 px-4">

            <p className="text-white text-sm">

              💡 Drag pages to flip • Use arrow keys (← →) • Click text to select

            </p>

            <p className="text-white text-xs mt-2 opacity-75">

              📄 A4 Format (794×1123px at 96 DPI)

            </p>

          </div>

        )}

      </div>

    </>

  );

}



// Page Content Component (EXACT SAME AS YOUR ORIGINAL)

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



function CoverPage({ book }) {

  return (

    <div className="page-inner bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 text-white">

      <div className="flex-1 flex flex-col justify-center items-center p-12">

        <div className="text-center space-y-8">

          <div className="text-8xl mb-8">📚</div>

          <h1 className="text-5xl font-bold leading-tight drop-shadow-2xl px-6 select-text">

            {book?.title || 'Untitled Book'}

          </h1>

          <div className="w-32 h-1 bg-white mx-auto"></div>

          <div className="space-y-3">

            <p className="text-2xl">by</p>

            <p className="text-3xl font-semibold select-text">{book?.author_name || 'Unknown Author'}</p>

          </div>

          <div className="mt-10 space-y-4">

            <div className="inline-block px-8 py-3 bg-white/20 backdrop-blur-sm rounded-full text-lg font-medium select-text">

              {book?.subject_name || 'Subject'}

            </div>

            <br />

            <div className="inline-block px-8 py-3 bg-white/20 backdrop-blur-sm rounded-full text-lg font-medium select-text">

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

      <div className="flex-1 flex flex-col p-10">

        <h2 className="text-4xl font-bold text-gray-800 mb-8 text-center border-b-4 border-blue-600 pb-4 select-text">

          Table of Contents

        </h2>

       

        <div className="flex-1 space-y-4 overflow-y-auto">

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

                className="w-full flex items-center gap-4 p-4 hover:bg-blue-50 transition-all rounded-lg border-l-4 border-blue-600 cursor-pointer shadow-sm hover:shadow-md"

              >

                <div className="flex-shrink-0 w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-lg">

                  {index + 1}

                </div>

                <div className="flex-1 text-left">

                  <h3 className="font-semibold text-lg text-gray-800 select-text">

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

      <div className="flex-1 flex flex-col justify-center items-center p-12 relative">

        <div className="text-center space-y-8">

          <div className="text-8xl mb-6">📖</div>

          <div className="space-y-6">

            <h2 className="text-5xl font-bold leading-tight px-8 select-text">

              {chapter.title}

            </h2>

            <div className="w-32 h-1 bg-white mx-auto"></div>

          </div>

        </div>

       

        <div className="absolute bottom-8 left-0 right-0 text-center">

          <span className="text-sm opacity-75">{pageNumber}</span>

        </div>

      </div>

    </div>

  );

}



function ContentPage({ page, chapterTitle, pageNumber }) {

  // A4 dimensions

  const HEADER_HEIGHT = 60;

  const FOOTER_HEIGHT = 50;

  const A4_HEIGHT = 1300;

  const CONTENT_HEIGHT = A4_HEIGHT - HEADER_HEIGHT - FOOTER_HEIGHT; // 1003px



  return (

    <div className="page-inner bg-gradient-to-br from-white to-gray-50">

      {/* Header - Fixed 60px */}

      <div

        className="flex-shrink-0 pb-4 border-b-2 border-gray-300 px-10 pt-4"

        style={{ height: `${HEADER_HEIGHT}px` }}

      >

        <p className="text-xs text-gray-500 uppercase tracking-wide select-text truncate">

          {chapterTitle}

        </p>

      </div>



      {/* Content Area - Calculated exact height */}

      <div

        className="px-10 py-8 overflow-y-auto"

        style={{

          height: `${CONTENT_HEIGHT}px`, // Exact height instead of flex-1

         

        }}

      >

        <div

          className="book-content-text select-text"

          dangerouslySetInnerHTML={{

            __html: page.content || '<p class="text-gray-400 italic text-center mt-20">No content available</p>'

          }}

        />

      </div>



      {/* Footer - Fixed 60px */}

      <div

        className="flex-shrink-0 pt-4 text-center border-t border-gray-200 pb-4"

        style={{ height: `${FOOTER_HEIGHT}px` }}

      >

        <span className="text-sm text-gray-400">{pageNumber}</span>

      </div>

    </div>

  );

}





function BackCoverPage({ book }) {

  return (

    <div className="page-inner bg-gradient-to-br from-gray-800 to-gray-900 text-white">

      <div className="flex-1 flex flex-col justify-center items-center p-12">

        <div className="text-center space-y-8">

          <div className="text-8xl mb-6">✨</div>

          <h2 className="text-4xl font-bold">Thank You for Reading!</h2>

          <div className="w-32 h-1 bg-white mx-auto"></div>

          <p className="text-3xl font-semibold select-text px-8">{book?.title}</p>

          <p className="text-xl text-gray-300 select-text">by {book?.author_name}</p>

          <div className="mt-10 space-y-3">

            <p className="text-base text-gray-400 select-text">{book?.subject_name}</p>

            <p className="text-base text-gray-400 select-text">{book?.topic_name}</p>

          </div>

        </div>

      </div>

    </div>

  );

}

