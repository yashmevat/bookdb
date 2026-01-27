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
  const [wasPlayingBeforeFlip, setWasPlayingBeforeFlip] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragCurrentX, setDragCurrentX] = useState(0);
  const [canDrag, setCanDrag] = useState(false);
  const [bookScale, setBookScale] = useState(0.7);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1920);
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
      setWindowWidth(window.innerWidth);
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

  // Replace your existing useEffect for currentPageIndex
useEffect(() => {
  // If audio was playing before page flip, auto-resume on new page
  if (wasPlayingBeforeFlip && !isFlipping) {
    // Small delay to let page render completely
    const timer = setTimeout(() => {
      startSpeaking();
      setWasPlayingBeforeFlip(false); // Reset flag
    }, 700); // 700ms = 600ms flip animation + 100ms buffer
    
    return () => clearTimeout(timer);
  }
}, [currentPageIndex, isFlipping, wasPlayingBeforeFlip]);


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
    setWasPlayingBeforeFlip(false); // Reset if no content
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
      // Mark that we want to continue playing on next page
      setWasPlayingBeforeFlip(true);
      
      setTimeout(() => {
        nextPage();
      }, 500);
    } else {
      // Last page - stop completely
      setWasPlayingBeforeFlip(false);
    }
  };

  utterance.onerror = (event) => {
    console.log('Speech error:', event);
    setIsSpeaking(false);
    setIsPaused(false);
    setWasPlayingBeforeFlip(false); // Reset on error
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

 const stopSpeaking = (shouldResume = false) => {
  window.speechSynthesis.cancel();
  setIsSpeaking(false);
  setIsPaused(false);
  
  // Track if we should auto-resume after page flip
  if (shouldResume) {
    setWasPlayingBeforeFlip(true);
  } else {
    setWasPlayingBeforeFlip(false);
  }
};


  const openBook = () => {
    setBookOpened(true);
  };
const closeBook = () => {
  stopSpeaking(false); // Don't auto-resume when closing book
  setBookOpened(false);
  setCurrentPageIndex(0);
  setWasPlayingBeforeFlip(false); // Reset flag
};


  const goToPage = (pageIndex) => {
    if (pageIndex >= 0 && pageIndex < allPages.length) {
      setCurrentPageIndex(pageIndex);
    }
  };

const nextPage = () => {
  const maxIndex = isMobile ? allPages.length - 1 : allPages.length - 2;
  
  if (currentPageIndex < maxIndex) {
    // Check if audio is currently playing
    const wasPlaying = isSpeaking && !isPaused;
    
    // Stop current audio but mark for resume
    if (wasPlaying) {
      stopSpeaking(true); // Pass true to indicate we want auto-resume
    }
    
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
    // Check if audio is currently playing
    const wasPlaying = isSpeaking && !isPaused;
    
    // Stop current audio but mark for resume
    if (wasPlaying) {
      stopSpeaking(true); // Pass true to indicate we want auto-resume
    }
    
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

  // Calculate responsive base scale based on window width
  const getResponsiveScale = () => {
    if (windowWidth <= 400) return 0.42;
    if (windowWidth <= 480) return 0.48;
    if (windowWidth <= 600) return 0.55;
    if (windowWidth <= 768) return 0.65;
    if (windowWidth <= 850) return 0.75;
    if (windowWidth <= 1024) return 0.9;
    if (windowWidth <= 1400) return 0.7;
    if (windowWidth <= 1700) return 0.85;
    return 1; // Default scale for larger screens
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
  transform: scale(0.7); /* scale property ke bajaye transform use karo */
  transform-origin: center top; /* Gap ko remove karne ke liye */
}


        .book-page {
          background: ${isDarkMode ? '#1A1A1A' : 'white'};
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
            opacity: 0;
            z-index: 10;
          }
          25% {
            transform: rotateY(-45deg);
            opacity: 1;
          }
          50% {
            transform: rotateY(-90deg);
            opacity: 1;
            z-index: 0;
          }
            
          75% {
            transform: rotateY(-135deg);
            opacity: 1;
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
            opacity: 0;
            z-index: 10;
          }
          25% {
            transform: rotateY(45deg);
            opacity: 1;
          }
          50% { 
          
            transform: rotateY(90deg);
            opacity: 1;
            z-index: 0;
          }
            
          75% { 
          
            transform: rotateY(135deg);
            opacity: 1;
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
              transform: scale(0.7);
    transform-origin: center top;
        }

        

        /* Navbar Controls Styling */
        .navbar-controls {
          display: flex;
          align-items: center;
          gap: 12px;
        }

       .control-btn {
  background: rgba(0, 0, 0, 0.05);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(0, 0, 0, 0.1);
  color: #1f2937;
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
  background: rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.control-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.control-btn.active {
  background: rgba(99, 102, 241, 0.15);
  border-color: rgba(99, 102, 241, 0.3);
  color: #4f46e5;
}

@keyframes pulse-border {
  0%, 100% {
    border-color: rgba(99, 102, 241, 0.3);
  }
  50% {
    border-color: rgba(99, 102, 241, 0.6);
  }
}

.control-btn.speaking {
  animation: pulse-border 1.5s ease-in-out infinite;
}

        /* Responsive Viewport Scaling */
      @media (max-width: 1700px) {
  .book-closed {
    transform: scale(0.85);
    transform-origin: center top;
  }
}

@media (max-width: 1400px) {
  .book-closed {
    transform: scale(0.7);
    transform-origin: center top;
  }
}

@media (max-width: 1024px) {
  .book-closed {
    transform: scale(0.9);
    transform-origin: center top;
  }
}

@media (max-width: 850px) {
  .book-closed {
    transform: scale(0.75);
    transform-origin: center top;
  }
}

@media (max-width: 768px) {
  .book-closed {
    transform: scale(0.65);
    transform-origin: center top;
  }
}

@media (max-width: 600px) {
  .book-closed {
    transform: scale(0.55);
    transform-origin: center top;
  }
}

@media (max-width: 480px) {
  .book-closed {
    transform: scale(0.48);
    transform-origin: center top;
  }
}

@media (max-width: 400px) {
  .book-closed {
    transform: scale(0.42);
    transform-origin: center top;
  }
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
          
          .scale-slider-container {
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

      <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? 'bg-[#2A2A2A]' : 'bg-[#F4F1EA]'}`}>
        {/* Top Navbar - Fully Responsive */}
        <div className={`sticky top-0 z-50 transition-colors duration-300 shadow-sm ${isDarkMode ? 'bg-[#2A2A2A] border-b border-gray-700' : 'bg-white border-b border-gray-200'}`}>
  <div className="max-w-full mx-auto px-2 sm:px-4 md:px-6 py-2 md:py-3">
    <div className="flex items-center justify-between gap-2 sm:gap-4">
      
      {/* Left: Close Button */}
      <div className="flex items-center gap-1 sm:gap-2">
        <button 
          onClick={closeBook} 
          className={`p-1.5 sm:p-2 rounded-full transition-colors ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
          title="Close"
        >
          <svg className={`w-4 h-4 sm:w-5 sm:h-5 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Navigation Arrows */}
        {bookOpened && (
          <>
            <button
              onClick={prevPage}
              disabled={currentPageIndex === 0 || isFlipping}
              className={`p-1.5 sm:p-2 rounded-full transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
              title="Previous Page"
            >
              <svg className={`w-4 h-4 sm:w-5 sm:h-5 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <button
              onClick={nextPage}
              disabled={currentPageIndex >= (isMobile ? allPages.length - 1 : allPages.length - 2) || isFlipping}
              className={`p-1.5 sm:p-2 rounded-full transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
              title="Next Page"
            >
              <svg className={`w-4 h-4 sm:w-5 sm:h-5 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}
      </div>

      {/* Center: Page Number */}
      {bookOpened && (
        <div className="flex-1 flex justify-center">
          <span className={`text-xs sm:text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            {isMobile 
              ? `${leftPageIndex + 1}/${allPages.length}`
              : `${leftPageIndex + 1}/${allPages.length}`
            }
          </span>
        </div>
      )}

      {/* Right: Controls */}
      <div className="flex items-center gap-1 sm:gap-3">
        {bookOpened && (
          <>
            {/* Scale Range Input */}
            <div className="scale-slider-container flex items-center gap-2 mr-2">
              <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Scale:</span>
              <input
                type="range"
                min="0.5"
                max="1.5"
                step="0.1"
                value={bookScale}
                onChange={(e) => setBookScale(parseFloat(e.target.value))}
                className="w-32 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #3B82F6 0%, #3B82F6 ${((bookScale - 0.5) / 1) * 100}%, #E5E7EB ${((bookScale - 0.5) / 1) * 100}%, #E5E7EB 100%)`
                }}
              />
              <span className={`text-xs w-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{Math.round(bookScale * 100)}%</span>
            </div>
            
            <div className={`h-6 w-px ${isDarkMode ? 'bg-gray-600' : 'bg-gray-300'}`}></div>
            {/* Bookmark Icon */}
            <button 
              className={`p-1.5 sm:p-2 rounded-full transition-colors ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
              title="Bookmark"
            >
              <svg className={`w-4 h-4 sm:w-5 sm:h-5 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            </button>

            {/* Dark Mode Toggle */}
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`p-1.5 sm:p-2 rounded-full transition-colors ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
              title={isDarkMode ? 'Light Mode' : 'Dark Mode'}
            >
              {isDarkMode ? (
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>

            {/* Audio/Speaker Icon */}
            {!isSpeaking ? (
              <button 
                onClick={startSpeaking} 
                className={`p-1.5 sm:p-2 rounded-full transition-colors ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                title="Read Aloud"
              >
                <svg className={`w-4 h-4 sm:w-5 sm:h-5 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
              </button>
            ) : (
              <>
                {!isPaused ? (
                  <button 
                    onClick={pauseSpeaking} 
                    className={`p-1.5 sm:p-2 rounded-full transition-colors ${isDarkMode ? 'bg-blue-900/30' : 'bg-blue-50'}`}
                    title="Pause"
                  >
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6" />
                    </svg>
                  </button>
                ) : (
                  <button 
                    onClick={resumeSpeaking} 
                    className={`p-1.5 sm:p-2 rounded-full transition-colors ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                    title="Resume"
                  >
                    <svg className={`w-4 h-4 sm:w-5 sm:h-5 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`} fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </button>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  </div>
</div>



        {/* Book Content Area */}
        <div className="flex justify-center items-center px-2 sm:px-4 py-4 sm:py-8 min-h-[calc(100vh-60px)]">
          {!bookOpened ? (
            <div className="book-closed" onClick={openBook}>
              <div className="book-page" style={{ width: `${A4_WIDTH}px`, height: `${A4_HEIGHT}px` }}>
                <CoverPage book={book} />
              </div>
              <p className="text-white text-center mt-6 text-lg animate-pulse">
                Click to open book • A4 Size (210×297mm)
              </p>
            </div>
          ) : (
            <div
              ref={bookContainerRef}
              className="book-spread-container"
              style={{ transform: `scale(${getResponsiveScale() * bookScale})`, transformOrigin: 'center top' }}
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
                        isDarkMode={isDarkMode}
                        setIsDarkMode={setIsDarkMode}
                      />
                    </div>
                    {nextRightPage && !isMobile && (
                      <div className="book-page" style={{ width: `${A4_WIDTH}px`, height: `${A4_HEIGHT}px` }}>
                        <PageContent
                          page={nextRightPage}
                          pageNumber={currentPageIndex + 4}
                          onChapterClick={goToPage}
                          book={book}
                          isDarkMode={isDarkMode}
                          setIsDarkMode={setIsDarkMode}
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
                        
                        isDarkMode={isDarkMode}
                        setIsDarkMode={setIsDarkMode}
                      />
                    </div>
                    {prevRightPage && !isMobile && (
                      <div className="book-page" style={{ width: `${A4_WIDTH}px`, height: `${A4_HEIGHT}px` }}>
                        <PageContent
                          page={prevRightPage}
                          pageNumber={currentPageIndex}
                          onChapterClick={goToPage}
                          book={book}
                          
                        isDarkMode={isDarkMode}
                        setIsDarkMode={setIsDarkMode}
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
                      
                        isDarkMode={isDarkMode}
                        setIsDarkMode={setIsDarkMode}
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
                      
                        isDarkMode={isDarkMode}
                        setIsDarkMode={setIsDarkMode}
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
              Drag pages to flip • Use arrow keys (← →) • Click text to select
            </p>
          </div>
        )}
      </div>
    </>
  );
}

// Page Content Component (EXACT SAME AS YOUR ORIGINAL)
function PageContent({ page, pageNumber, onChapterClick, book ,isDarkMode, setIsDarkMode}) {
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
    return <ChapterTitlePage chapter={page.content} pageNumber={pageNumber} isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode}/>;
  }
  if (page.type === 'content') {
    return <ContentPage page={page.content} chapterTitle={page.chapterTitle} pageNumber={pageNumber} isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} />;
  }
  if (page.type === 'back-cover') {
    return <BackCoverPage book={book} />;
  }
  return null;
}

function CoverPage({ book }) {
  return (
    <div className="page-inner bg-gradient-to-br from-blue-800 via-blue-700 to-blue-900 text-white relative overflow-hidden">
      {/* Top Logo */}
      <div className="absolute top-8 left-0 right-0 flex justify-center">
        <div className="text-2xl font-bold">
          <span className="text-green-400">PLAB</span>
          <span className="text-blue-400">MEDI</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center items-center p-12">
        <div className="text-center space-y-6">
          {/* Book Icon */}
          <div className="mb-8">
            <svg className="w-24 h-24 mx-auto text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>

          {/* Title */}
          <h1 className="text-5xl font-bold leading-tight px-6 select-text">
            {book?.title || 'Smart Notes'}
          </h1>

          {/* Author */}
          <div className="space-y-2 pt-2">
            <p className="text-lg text-blue-200">by {book?.author_name || 'Dr. Karam Singh'}</p>
          </div>

          {/* Divider Line */}
          <div className="w-48 h-px bg-blue-300/50 mx-auto my-6"></div>

          {/* Edition/Subject */}
          <div className="space-y-3 pt-2">
            <p className="text-base text-blue-100 select-text">
              {book?.subject_name || 'Clinical Practice Edition'}
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Text */}
      <div className="absolute bottom-8 left-0 right-0 text-center space-y-2">
        <p className="text-sm text-blue-200">Tap to open</p>
        <p className="text-xs text-blue-300">{book?.topic_name || '2025 Edition'}</p>
      </div>
    </div>
  );
}


function TableOfContents({ chapters, chapterPageMap, onChapterClick }) {
  return (
    <div className="page-inner bg-white">
      <div className="flex-1 flex flex-col p-10">
        <h2 className="text-3xl font-bold text-gray-900 mb-6 select-text">
          Course Contents
        </h2>
        
        <div className="flex-1 space-y-0 overflow-y-auto">
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
                className="w-full text-left p-6 hover:bg-gray-50 transition-all cursor-pointer border-b border-gray-200 last:border-b-0"
              >
                <div className="space-y-2">
                  <h3 className="font-semibold text-base text-gray-900 select-text">
                    Chapter {index + 1}: {chapter.title}
                  </h3>
                  {chapter.description && (
                    <p className="text-sm text-gray-600 select-text">
                      {chapter.description}
                    </p>
                  )}
                  <div className="text-sm text-blue-600 font-medium">
                    Page {pageIndex + 1}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}


function ChapterTitlePage({ chapter, pageNumber, chapterIndex, isDarkMode }) {
  return (
    <div
      className={`page-inner relative ${
        isDarkMode ? 'bg-[#2A2A2A]' : 'bg-white'
      }`}
    >
      <div className="flex flex-col justify-center items-center p-12 h-full">
        <div className="text-center space-y-6 max-w-2xl">
          {/* Chapter Number */}
          <p
            className={`text-sm uppercase tracking-wide select-text ${
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            }`}
          >
            CHAPTER {chapterIndex || 1}
          </p>

          {/* Chapter Title */}
          <h2
            className={`text-4xl font-bold leading-tight select-text ${
              isDarkMode ? 'text-gray-100' : 'text-gray-900'
            }`}
          >
            {chapter.title}
          </h2>

          {/* Underline */}
          <div
            className={`w-16 h-1 mx-auto ${
              isDarkMode ? 'bg-blue-400' : 'bg-blue-600'
            }`}
          ></div>

          {/* Description */}
          <p
            className={`text-base leading-relaxed px-8 select-text mt-8 ${
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            }`}
          >
            This chapter covers essential endocrinology concepts including diabetes mellitus,
            thyroid disorders, adrenal pathology, and metabolic syndromes. Key topics include
            pathophysiology, clinical manifestations, diagnostic approaches, and evidence-based
            management strategies.
          </p>
        </div>

        {/* Page Number */}
        <div className="absolute bottom-8 left-0 right-0 text-center">
          <span
            className={`text-sm ${
              isDarkMode ? 'text-gray-500' : 'text-gray-500'
            }`}
          >
            {pageNumber}
          </span>
        </div>
      </div>
    </div>
  );
}



function ContentPage({ page, chapterTitle, pageNumber, isDarkMode }) {
  // A4 dimensions
  const HEADER_HEIGHT = 60;
  const FOOTER_HEIGHT = 50;
  const A4_HEIGHT = 1300;
  const CONTENT_HEIGHT = A4_HEIGHT - HEADER_HEIGHT - FOOTER_HEIGHT;

  return (
    <div
      className={`page-inner bg-gradient-to-br ${
        isDarkMode ? 'bg-[#2A2A2A] text-gray-200' : 'bg-[#F4F1EA] text-gray-800'
      }`}
    >
      {/* Header */}
      <div
        className={`flex-shrink-0 px-10 pt-4 pb-4 border-b ${
          isDarkMode
            ? 'bg-[#2A2A2A] border-gray-700'
            : 'bg-white border-gray-300'
        }`}
        style={{ height: `${HEADER_HEIGHT}px` }}
      >
        <p
          className={`text-xs uppercase tracking-wide truncate select-text ${
            isDarkMode ? 'text-gray-400' : 'text-gray-500'
          }`}
        >
          {chapterTitle}
        </p>
      </div>

      {/* Content Area */}
      <div
        className={`px-10 py-8 overflow-y-auto ${
          isDarkMode ? 'bg-[#2A2A2A]' : 'bg-white'
        }`}
        style={{ height: `${CONTENT_HEIGHT}px` }}
      >
      <div
  className={`book-content-text select-text ${
    isDarkMode ? 'dark-book-content' : ''
  }`}
  dangerouslySetInnerHTML={{
    __html:
      page.content ||
      `<p class="${
        isDarkMode ? 'text-gray-500' : 'text-gray-400'
      } italic text-center mt-20">No content available</p>`,
  }}
/>

      </div>

      {/* Footer */}
      <div
        className={`flex-shrink-0 pt-4 pb-4 text-center border-t ${
          isDarkMode
            ? 'bg-[#2A2A2A] border-gray-700'
            : 'bg-white border-gray-200'
        }`}
        style={{ height: `${FOOTER_HEIGHT}px` }}
      >
        <span
          className={`text-sm ${
            isDarkMode ? 'text-gray-500' : 'text-gray-400'
          }`}
        >
          {pageNumber}
        </span>
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
  const [wasPlayingBeforeFlip, setWasPlayingBeforeFlip] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragCurrentX, setDragCurrentX] = useState(0);
  const [canDrag, setCanDrag] = useState(false);
  const [fontSize, setFontSize] = useState(100);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1920);
  const bookContainerRef = useRef(null);

  // Highlight states
  const [highlights, setHighlights] = useState([]);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [selectedColor, setSelectedColor] = useState('#FFFF00');
  const [highlightTitle, setHighlightTitle] = useState('');
  const [colorPickerPosition, setColorPickerPosition] = useState({ x: 0, y: 0 });

  // Bookmark states
  const [bookmarks, setBookmarks] = useState([]);
  const [showBookmarkModal, setShowBookmarkModal] = useState(false);

  // Speech synthesis states
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const speechRef = useRef(null);
  const utteranceRef = useRef(null);

  // A4 EXACT dimensions at 96 DPI
  const A4_WIDTH = 820;
  const A4_HEIGHT = 1300;
  const [maxPageHeight, setMaxPageHeight] = useState(A4_HEIGHT);

  // Update CSS custom property for font scaling
  useEffect(() => {
    document.documentElement.style.setProperty('--font-scale', fontSize / 100);
  }, [fontSize]);

  // Synchronize page heights - calculate max height and apply to all pages
  useEffect(() => {
    if (!bookOpened) return;

    const syncPageHeights = () => {
      // Wait for render
      requestAnimationFrame(() => {
        const allPageElements = document.querySelectorAll('.book-page');

        if (allPageElements.length === 0) return;

        // First pass: set all to auto to get natural heights
        allPageElements.forEach(pageEl => {
          pageEl.style.height = 'auto';
        });

        // Force reflow
        void document.body.offsetHeight;

        let maxHeight = A4_HEIGHT;

        // Second pass: measure all natural heights
        allPageElements.forEach(pageEl => {
          const pageHeight = pageEl.scrollHeight;
          if (pageHeight > maxHeight) {
            maxHeight = pageHeight;
          }
        });

        // Round up to avoid fractional pixels
        maxHeight = Math.ceil(maxHeight);

        // Update state
        setMaxPageHeight(maxHeight);

        // Third pass: apply the max height to all pages immediately
        allPageElements.forEach(pageEl => {
          pageEl.style.height = `${maxHeight}px`;
        });
      });
    };

    // Run sync multiple times to ensure it catches everything
    syncPageHeights();
    const timer1 = setTimeout(syncPageHeights, 100);
    const timer2 = setTimeout(syncPageHeights, 300);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [fontSize, currentPageIndex, bookOpened]);

  // Check if mobile/tablet
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
      setWindowWidth(window.innerWidth);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (bookId) {
      fetchAllData();
      fetchHighlights();
      fetchBookmarks();
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

  // Replace your existing useEffect for currentPageIndex
  useEffect(() => {
    // If audio was playing before page flip, auto-resume on new page
    if (wasPlayingBeforeFlip && !isFlipping) {
      // Small delay to let page render completely
      const timer = setTimeout(() => {
        startSpeaking();
        setWasPlayingBeforeFlip(false); // Reset flag
      }, 700); // 700ms = 600ms flip animation + 100ms buffer

      return () => clearTimeout(timer);
    }
  }, [currentPageIndex, isFlipping, wasPlayingBeforeFlip]);


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

  const fetchHighlights = async () => {
    try {
      const response = await fetch(`/api/books/${bookId}/highlights`);
      const data = await response.json();
      if (data.success) {
        setHighlights(data.data);
      } else if (data.message === 'Unauthorized') {
        // User not logged in - that's okay, highlights just won't show
        console.log('User not logged in - highlights disabled');
      }
    } catch (error) {
      console.error('Error fetching highlights:', error);
    }
  };

  const handleTextSelection = () => {
    // Small delay to ensure selection is complete
    setTimeout(() => {
      const selection = window.getSelection();
      const text = selection.toString().trim();

      if (text.length > 0) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        // Detect which page the selection is on
        const selectedElement = range.commonAncestorContainer;
        const pageElement = selectedElement.nodeType === 3
          ? selectedElement.parentElement.closest('.book-page')
          : selectedElement.closest('.book-page');

        // Check if it's the right page (second page in spread)
        const isRightPage = pageElement?.classList.contains('page-right');
        const actualPageIndex = isMobile ? currentPageIndex : (isRightPage ? currentPageIndex + 1 : currentPageIndex);

        setSelectedText(text);
        setColorPickerPosition({
          x: rect.left + rect.width / 2,
          y: rect.top - 10,
          pageIndex: actualPageIndex
        });
        setShowColorPicker(true);
      }
    }, 100);
  };

  const saveHighlight = async () => {
    if (!highlightTitle.trim() || !selectedText) {
      alert('Please enter a title for the highlight');
      return;
    }

    try {
      const response = await fetch(`/api/books/${bookId}/highlights`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: highlightTitle,
          page_index: colorPickerPosition.pageIndex || currentPageIndex,
          selected_text: selectedText,
          color: selectedColor
        })
      });

      const data = await response.json();

      if (data.success) {
        setHighlights([...highlights, data.data]);
        setShowColorPicker(false);
        setSelectedText('');
        setHighlightTitle('');
        setSelectedColor('#FFFF00');
        window.getSelection().removeAllRanges();

        // Apply highlight visually
        setTimeout(() => {
          applyHighlightsToPage();
        }, 100);
      } else if (data.message === 'Unauthorized') {
        alert('Please login to save highlights');
        setShowColorPicker(false);
        setSelectedText('');
        setHighlightTitle('');
        window.getSelection().removeAllRanges();
      } else {
        alert(data.message || 'Failed to save highlight');
      }
    } catch (error) {
      console.error('Error saving highlight:', error);
      alert('Failed to save highlight');
    }
  };

  const deleteHighlight = async (highlightId) => {
    if (!confirm('Are you sure you want to delete this highlight?')) {
      return;
    }

    try {
      const response = await fetch(`/api/books/${bookId}/highlights?id=${highlightId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        setHighlights(highlights.filter(h => h.id !== highlightId));
      } else {
        alert(data.message || 'Failed to delete highlight');
      }
    } catch (error) {
      console.error('Error deleting highlight:', error);
      alert('Failed to delete highlight');
    }
  };

  const goToHighlight = (pageIndex) => {
    if (isMobile) {
      // Mobile: direct navigation
      setCurrentPageIndex(pageIndex);
    } else {
      // Desktop: Adjust for 2-page spread
      // currentPageIndex = LEFT page, currentPageIndex + 1 = RIGHT page
      // If page is odd (1, 3, 5...), show it on right by going to previous page
      // If page is even (0, 2, 4...), show it on left
      if (pageIndex % 2 === 1) {
        // Odd page → show on RIGHT side
        setCurrentPageIndex(pageIndex - 1);
      } else {
        // Even page → show on LEFT side
        setCurrentPageIndex(pageIndex);
      }
    }
  };

  // Bookmark Functions
  const fetchBookmarks = async () => {
    try {
      const response = await fetch(`/api/books/${bookId}/bookmarks`);
      const data = await response.json();
      if (data.success) {
        setBookmarks(data.data);
      } else if (data.message === 'Unauthorized') {
        console.log('User not logged in - bookmarks disabled');
      }
    } catch (error) {
      console.error('Error fetching bookmarks:', error);
    }
  };

  const handleBookmarkClick = () => {
    if (isMobile) {
      // Mobile: directly bookmark current page
      toggleBookmark(currentPageIndex);
    } else {
      // Desktop: show modal to choose left or right page
      setShowBookmarkModal(true);
    }
  };

  const toggleBookmark = async (pageIndex) => {
    try {
      const response = await fetch(`/api/books/${bookId}/bookmarks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          page_index: pageIndex
        })
      });

      const data = await response.json();
      
      if (data.success) {
        if (data.action === 'added') {
          setBookmarks([...bookmarks, data.data]);
        } else if (data.action === 'removed') {
          setBookmarks(bookmarks.filter(b => b.page_index !== pageIndex));
        }
        setShowBookmarkModal(false);
      } else if (data.message === 'Unauthorized') {
        alert('Please login to add bookmarks');
        setShowBookmarkModal(false);
      } else {
        alert(data.message || 'Failed to toggle bookmark');
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      alert('Failed to toggle bookmark');
    }
  };

  const deleteBookmark = async (bookmarkId) => {
    if (!confirm('Are you sure you want to remove this bookmark?')) {
      return;
    }

    try {
      const response = await fetch(`/api/books/${bookId}/bookmarks?id=${bookmarkId}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      
      if (data.success) {
        setBookmarks(bookmarks.filter(b => b.id !== bookmarkId));
      } else {
        alert(data.message || 'Failed to delete bookmark');
      }
    } catch (error) {
      console.error('Error deleting bookmark:', error);
      alert('Failed to delete bookmark');
    }
  };

  const goToBookmark = (pageIndex) => {
    if (isMobile) {
      setCurrentPageIndex(pageIndex);
    } else {
      if (pageIndex % 2 === 1) {
        setCurrentPageIndex(pageIndex - 1);
      } else {
        setCurrentPageIndex(pageIndex);
      }
    }
  };

  const isPageBookmarked = (pageIndex) => {
    return bookmarks.some(b => b.page_index === pageIndex);
  };

  useEffect(() => {
    const handleMouseUp = () => {
      setTimeout(handleTextSelection, 10);
    };

    const handleTouchEnd = () => {
      setTimeout(handleTextSelection, 200);
    };

    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [currentPageIndex]);

  // Apply highlights to current page
  useEffect(() => {
    if (highlights.length > 0 && bookOpened) {
      setTimeout(() => {
        applyHighlightsToPage();
      }, 100);
    }
  }, [currentPageIndex, highlights, bookOpened]);

  const applyHighlightsToPage = () => {
    const currentPageHighlights = highlights.filter(h => {
      if (isMobile) {
        return h.page_index === currentPageIndex;
      } else {
        return h.page_index === currentPageIndex || h.page_index === currentPageIndex + 1;
      }
    });

    currentPageHighlights.forEach(highlight => {
      const contentElements = document.querySelectorAll('.book-content-text');
      contentElements.forEach(element => {
        const htmlContent = element.innerHTML;
        const textToHighlight = highlight.selected_text;

        // Create a regex to find the text (case sensitive)
        const escapedText = textToHighlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(?![^<]*>)(${escapedText})`, 'gi');

        // Replace with highlighted version
        const highlightedContent = htmlContent.replace(regex, (match) => {
          return `<mark style="background-color: ${highlight.color}; padding: 2px 0;" data-highlight-id="${highlight.id}">${match}</mark>`;
        });

        if (highlightedContent !== htmlContent) {
          element.innerHTML = highlightedContent;
        }
      });
    });
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
      setWasPlayingBeforeFlip(false); // Reset if no content
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
        // Mark that we want to continue playing on next page
        setWasPlayingBeforeFlip(true);

        setTimeout(() => {
          nextPage();
        }, 500);
      } else {
        // Last page - stop completely
        setWasPlayingBeforeFlip(false);
      }
    };

    utterance.onerror = (event) => {
      console.log('Speech error:', event);
      setIsSpeaking(false);
      setIsPaused(false);
      setWasPlayingBeforeFlip(false); // Reset on error
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

  const stopSpeaking = (shouldResume = false) => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsPaused(false);

    // Track if we should auto-resume after page flip
    if (shouldResume) {
      setWasPlayingBeforeFlip(true);
    } else {
      setWasPlayingBeforeFlip(false);
    }
  };


  const openBook = () => {
    setBookOpened(true);
  };
  const closeBook = () => {
    stopSpeaking(false); // Don't auto-resume when closing book
    setBookOpened(false);
    setCurrentPageIndex(0);
    setWasPlayingBeforeFlip(false); // Reset flag
  };


  const goToPage = (pageIndex) => {
    if (pageIndex >= 0 && pageIndex < allPages.length) {
      if (isMobile) {
        // Mobile: direct navigation
        setCurrentPageIndex(pageIndex);
      } else {
        // Desktop: Adjust for 2-page spread
        // If page is odd (1, 3, 5...), show it on right by going to previous page
        // If page is even (0, 2, 4...), show it on left
        if (pageIndex % 2 === 1) {
          // Odd page → show on RIGHT side
          setCurrentPageIndex(pageIndex - 1);
        } else {
          // Even page → show on LEFT side
          setCurrentPageIndex(pageIndex);
        }
      }
    }
  };

  const nextPage = () => {
    const maxIndex = isMobile ? allPages.length - 1 : allPages.length - 2;

    if (currentPageIndex < maxIndex) {
      // Check if audio is currently playing
      const wasPlaying = isSpeaking && !isPaused;

      // Stop current audio but mark for resume
      if (wasPlaying) {
        stopSpeaking(true); // Pass true to indicate we want auto-resume
      }

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
      // Check if audio is currently playing
      const wasPlaying = isSpeaking && !isPaused;

      // Stop current audio but mark for resume
      if (wasPlaying) {
        stopSpeaking(true); // Pass true to indicate we want auto-resume
      }

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

        /* Prevent blur on scaled book elements */
        .book-spread-container,
        .book-closed,
        .book-page {
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          transform: translateZ(0);
          will-change: transform;
        }

        .book-page * {
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        /* Book Container with Responsive Scaling */
        .book-spread-container {
          position: relative;
          perspective: 2000px;
          transform-style: preserve-3d;
          margin: 0 auto;
          image-rendering: -webkit-optimize-contrast;
          image-rendering: crisp-edges;
        }

        /* Desktop - Two page spread with scaling */
        @media (min-width: 1024px) {
          .book-spread-container {
            transform: scale(0.7);
            transform-origin: center top;
            max-width: 100%;
            margin-bottom: -20%;
          }
        }

        /* Tablet - Single page centered */
        @media (min-width: 768px) and (max-width: 1023px) {
          .book-spread-container {
            transform: scale(0.8);
            transform-origin: center top;
            max-width: ${A4_WIDTH}px;
            padding: 0 20px;
            margin-bottom: -20%;
          }
        }

        /* Mobile - Single page smaller scale */
        @media (max-width: 767px) {
          .book-spread-container {
            transform: scale(0.6);
            transform-origin: center top;
            max-width: ${A4_WIDTH}px;
            padding: 0 10px;
            margin-bottom: -50%;
          }
        }


        .book-page {
          background: ${isDarkMode ? '#1A1A1A' : 'white'};
          border-radius: 4px;
          box-shadow:
            0 20px 60px rgba(0, 0, 0, 0.3),
            inset 0 0 0 1px rgba(0, 0, 0, 0.1);
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .page-inner {
          width: 100%;
          height: 100%;
          min-height: 100%;
          display: flex;
          flex-direction: column;
        }

        .book-spread {
          display: flex;
          gap: 0;
          position: relative;
          z-index: 2;
          align-items: stretch;
        }

        .book-spread-background {
          display: flex;
          gap: 0;
          position: absolute;
          top: 0;
          left: 0;
          z-index: 1;
          align-items: stretch;
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

        /* Mobile/Tablet animations - animate left page */
        @media (max-width: 1023px) {
          .flipping-next .page-left {
            animation: flipNextMobile 0.6s ease-in-out forwards;
          }
        }

        @keyframes flipNextSimple {
          0% {
            transform: rotateY(0deg);
            opacity: 0;
            z-index: 10;
          }
          25% {
            transform: rotateY(-45deg);
            opacity: 1;
          }
          50% {
            transform: rotateY(-90deg);
            opacity: 1;
            z-index: 0;
          }
            
          75% {
            transform: rotateY(-135deg);
            opacity: 1;
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
            opacity: 0;
            z-index: 10;
          }
          25% {
            transform: rotateY(45deg);
            opacity: 1;
          }
          50% { 
          
            transform: rotateY(90deg);
            opacity: 1;
            z-index: 0;
          }
            
          75% { 
          
            transform: rotateY(135deg);
            opacity: 1;
            z-index: 0;
          }
          100% {
            transform: rotateY(180deg);
            opacity: 0;
            z-index: 0;
          }
        }

        @keyframes flipNextMobile {
          0% {
            transform: rotateY(0deg);
            opacity: 1;
            z-index: 10;
          }
          25% {
            transform: rotateY(-45deg);
            opacity: 1;
          }
          50% {
            transform: rotateY(-90deg);
            opacity: 1;
            z-index: 0;
          }
            
          75% {
            transform: rotateY(-135deg);
            opacity: 0.5;
            z-index: 0;
          }
          100% {
            transform: rotateY(-180deg);
            opacity: 0;
            z-index: 0;
          }
        }

        /* Mobile single page - Hide right page on mobile/tablet */
        @media (max-width: 1023px) {
          .book-spread {
            display: block;
            margin: 0 auto;
            max-width: ${A4_WIDTH}px;
          }
          
          .page-right {
            display: none !important;
          }

          .book-spread-background {
            max-width: ${A4_WIDTH}px;
            margin: 0 auto;
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
          transform: scale(0.7);
          transform-origin: center top;
          -webkit-font-smoothing: antialiased;
        }

        

        /* Navbar Controls Styling */
        .navbar-controls {
          display: flex;
          align-items: center;
          gap: 12px;
        }

       .control-btn {
  background: rgba(0, 0, 0, 0.05);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(0, 0, 0, 0.1);
  color: #1f2937;
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
  background: rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.control-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.control-btn.active {
  background: rgba(99, 102, 241, 0.15);
  border-color: rgba(99, 102, 241, 0.3);
  color: #4f46e5;
}

@keyframes pulse-border {
  0%, 100% {
    border-color: rgba(99, 102, 241, 0.3);
  }
  50% {
    border-color: rgba(99, 102, 241, 0.6);
  }
}

.control-btn.speaking {
  animation: pulse-border 1.5s ease-in-out infinite;
}

        /* Responsive Viewport Scaling */
      @media (max-width: 1700px) {
  .book-closed {
    transform: scale(0.85);
    transform-origin: center top;
  }
}

@media (max-width: 1400px) {
  .book-closed {
    transform: scale(0.7);
    transform-origin: center top;
  }
}

@media (max-width: 1024px) {
  .book-closed {
    transform: scale(0.9);
    transform-origin: center top;
  }
}

@media (max-width: 850px) {
  .book-closed {
    transform: scale(0.75);
    transform-origin: center top;
  }
}

@media (max-width: 768px) {
  .book-closed {
    transform: scale(0.65);
    transform-origin: center top;
  }
}

@media (max-width: 600px) {
  .book-closed {
    transform: scale(0.55);
    transform-origin: center top;
  }
}

@media (max-width: 480px) {
  .book-closed {
    transform: scale(0.48);
    transform-origin: center top;
  }
}

@media (max-width: 400px) {
  .book-closed {
    transform: scale(0.42);
    transform-origin: center top;
  }
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
            max-width: 451px;
          }
          
          .book-page {
            width: 451px !important;
            height: 715px !important;
          }
        }

        @media (max-width: 480px) {
          .book-spread-container {
            max-width: 394px;
          }
          
          .book-page {
            width: 394px !important;
            height: 624px !important;
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
            max-width: 344px;
          }
          
          .book-page {
            width: 344px !important;
            height: 546px !important;
          }
        }

        .line-clamp-3 {
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
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
          
          .scale-slider-container {
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

      <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? 'bg-[#1A1A1A]' : 'bg-[#F4F1EA]'}`}>
        {/* Top Navbar - Fully Responsive */}
        <div className={`sticky top-0 z-50 transition-colors duration-300 shadow-sm ${isDarkMode ? 'bg-[#2A2A2A] border-b border-gray-700' : 'bg-white border-b border-gray-200'}`}>
          <div className="max-w-full mx-auto px-2 sm:px-4 md:px-6 py-2 md:py-3">
            <div className="flex items-center justify-between gap-2 sm:gap-4">

              {/* Left: Close Button */}
              <div className="flex items-center gap-1 sm:gap-2">
                <button
                  onClick={closeBook}
                  className={`p-1.5 sm:p-2 rounded-full transition-colors ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                  title="Close"
                >
                  <svg className={`w-4 h-4 sm:w-5 sm:h-5 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                {/* Navigation Arrows */}
                {bookOpened && (
                  <>
                    <button
                      onClick={prevPage}
                      disabled={currentPageIndex === 0 || isFlipping}
                      className={`p-1.5 sm:p-2 rounded-full transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                      title="Previous Page"
                    >
                      <svg className={`w-4 h-4 sm:w-5 sm:h-5 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>

                    <button
                      onClick={nextPage}
                      disabled={currentPageIndex >= (isMobile ? allPages.length - 1 : allPages.length - 2) || isFlipping}
                      className={`p-1.5 sm:p-2 rounded-full transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                      title="Next Page"
                    >
                      <svg className={`w-4 h-4 sm:w-5 sm:h-5 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </>
                )}
              </div>

              {/* Center: Page Number */}
              {bookOpened && (
                <div className="flex-1 flex justify-center">
                  <span className={`text-xs sm:text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    {isMobile
                      ? `${leftPageIndex + 1}/${allPages.length}`
                      : `${leftPageIndex + 1}/${allPages.length}`
                    }
                  </span>
                </div>
              )}

              {/* Right: Controls */}
              <div className="flex items-center gap-1 sm:gap-3">
                {bookOpened && (
                  <>
                    {/* Font Size Range Input */}
                    <div className="scale-slider-container flex items-center gap-2 mr-2">
                      <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Font:</span>
                      <input
                        type="range"
                        min="50"
                        max="200"
                        step="10"
                        value={fontSize}
                        onChange={(e) => setFontSize(parseInt(e.target.value))}
                        className="w-32 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        style={{
                          background: `linear-gradient(to right, #10B981 0%, #10B981 ${((fontSize - 50) / 150) * 100}%, #E5E7EB ${((fontSize - 50) / 150) * 100}%, #E5E7EB 100%)`
                        }}
                      />
                      <span className={`text-xs w-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{fontSize}%</span>
                    </div>

                    <div className={`h-6 w-px ${isDarkMode ? 'bg-gray-600' : 'bg-gray-300'}`}></div>
                    {/* Bookmark Icon */}
                    {/* <button
                      className={`p-1.5 sm:p-2 rounded-full transition-colors ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                      title="Bookmark"
                    >
                      <svg className={`w-4 h-4 sm:w-5 sm:h-5 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                      </svg>
                    </button> */}

                    {/* Dark Mode Toggle */}
                    <button
                      onClick={() => setIsDarkMode(!isDarkMode)}
                      className={`p-1.5 sm:p-2 rounded-full transition-colors ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                      title={isDarkMode ? 'Light Mode' : 'Dark Mode'}
                    >
                      {isDarkMode ? (
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                        </svg>
                      )}
                    </button>

                    {/* Audio/Speaker Icon */}
                    {!isSpeaking ? (
                      <button
                        onClick={startSpeaking}
                        className={`p-1.5 sm:p-2 rounded-full transition-colors ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                        title="Read Aloud"
                      >
                        <svg className={`w-4 h-4 sm:w-5 sm:h-5 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                        </svg>
                      </button>
                    ) : (
                      <>
                        {!isPaused ? (
                          <button
                            onClick={pauseSpeaking}
                            className={`p-1.5 sm:p-2 rounded-full transition-colors ${isDarkMode ? 'bg-blue-900/30' : 'bg-blue-50'}`}
                            title="Pause"
                          >
                            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6" />
                            </svg>
                          </button>
                        ) : (
                          <button
                            onClick={resumeSpeaking}
                            className={`p-1.5 sm:p-2 rounded-full transition-colors ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                            title="Resume"
                          >
                            <svg className={`w-4 h-4 sm:w-5 sm:h-5 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`} fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          </button>
                        )}
                      </>
                    )}

                    {/* Bookmark Icon */}
                    <button
                      onClick={handleBookmarkClick}
                      className={`p-1.5 sm:p-2 rounded-full transition-colors ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                      title="Bookmark Page"
                    >
                      <svg className={`w-4 h-4 sm:w-5 sm:h-5 ${
                        isPageBookmarked(currentPageIndex) || (! isMobile && isPageBookmarked(currentPageIndex + 1))
                          ? 'text-blue-500 fill-current' 
                          : isDarkMode ? 'text-gray-300' : 'text-gray-700'
                      }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                      </svg>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>



        {/* Book Content Area */}
        <div className="flex justify-center items-center px-2 sm:px-4 py-4 sm:py-8 min-h-[calc(100vh-60px)]">
          {!bookOpened ? (
            <div className="book-closed" onClick={openBook}>
              <div className="book-page" style={{ width: `${A4_WIDTH}px`, height: `${A4_HEIGHT}px` }}>
                <CoverPage book={book} />
              </div>
              <p className="text-white text-center mt-6 text-lg animate-pulse">
                Click to open book • A4 Size (210×297mm)
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
                    <div className="book-page" style={{ width: `${A4_WIDTH}px`, height: `${maxPageHeight}px` }}>
                      <PageContent
                        page={nextLeftPage}
                        pageNumber={currentPageIndex + (isMobile ? 2 : 3)}
                        onChapterClick={goToPage}
                        book={book}
                        isDarkMode={isDarkMode}
                        setIsDarkMode={setIsDarkMode}
                      />
                    </div>
                    {nextRightPage && !isMobile && (
                      <div className="book-page" style={{ width: `${A4_WIDTH}px`, height: `${maxPageHeight}px` }}>
                        <PageContent
                          page={nextRightPage}
                          pageNumber={currentPageIndex + 4}
                          onChapterClick={goToPage}
                          book={book}
                          isDarkMode={isDarkMode}
                          setIsDarkMode={setIsDarkMode}
                        />
                      </div>
                    )}
                  </>
                )}

                {isFlipping && flipDirection === 'prev' && prevLeftPage && (
                  <>
                    <div className="book-page" style={{ width: `${A4_WIDTH}px`, height: `${maxPageHeight}px` }}>
                      <PageContent
                        page={prevLeftPage}
                        pageNumber={currentPageIndex - (isMobile ? 0 : 1)}
                        onChapterClick={goToPage}
                        book={book}

                        isDarkMode={isDarkMode}
                        setIsDarkMode={setIsDarkMode}
                      />
                    </div>
                    {prevRightPage && !isMobile && (
                      <div className="book-page" style={{ width: `${A4_WIDTH}px`, height: `${maxPageHeight}px` }}>
                        <PageContent
                          page={prevRightPage}
                          pageNumber={currentPageIndex}
                          onChapterClick={goToPage}
                          book={book}

                          isDarkMode={isDarkMode}
                          setIsDarkMode={setIsDarkMode}
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
                      height: `${maxPageHeight}px`,
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

                      isDarkMode={isDarkMode}
                      setIsDarkMode={setIsDarkMode}
                    />
                  </div>
                )}

                {rightPage && !isMobile && (
                  <div
                    className="book-page page-right page-flip-animation"
                    style={{
                      width: `${A4_WIDTH}px`,
                      height: `${maxPageHeight}px`,
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

                      isDarkMode={isDarkMode}
                      setIsDarkMode={setIsDarkMode}
                    />
                  </div>
                )}
              </div>
              <p className="text-black text-center mt-6 text-lg">
                Drag to Flip Pages
              </p>

              {/* Highlights Section */}
              {bookOpened && highlights.length > 0 && (
                <div className={`highlights-section max-w-6xl mx-auto mt-6 mb-6 px-4 ${isDarkMode ? 'text-white' : 'text-black'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                      <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      My Highlights ({highlights.length})
                    </h3>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                    {highlights.map((highlight) => (
                      <div
                        key={highlight.id}
                        className={`p-3 rounded-lg shadow-sm cursor-pointer transition-all hover:shadow-md hover:-translate-y-1 ${
                          isDarkMode ? 'bg-gray-800 hover:bg-gray-750' : 'bg-white hover:bg-gray-50'
                        }`}
                        style={{ borderTop: `3px solid ${highlight.color}` }}
                        onClick={() => goToHighlight(highlight.page_index)}
                      >
                        <div className="flex items-start gap-2 mb-2">
                          <div className="w-2 h-2 rounded-full mt-1.5" style={{ backgroundColor: highlight.color }}></div>
                          <h4 className="font-semibold text-sm line-clamp-2 flex-1">{highlight.title}</h4>
                        </div>
                        <p className={`text-xs mb-2 line-clamp-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          "{highlight.selected_text}"
                        </p>
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-medium ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                            Page {highlight.page_index + 1}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteHighlight(highlight.id);
                            }}
                            className="text-red-500 hover:text-red-700 p-1"
                            title="Delete"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Bookmarks Section */}
              {bookOpened && bookmarks.length > 0 && (
                <div className={`bookmarks-section max-w-6xl mx-auto mt-6 mb-8 px-4 ${isDarkMode ? 'text-white' : 'text-black'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                      <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                      </svg>
                      My Bookmarks ({bookmarks.length})
                    </h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {bookmarks.map((bookmark) => (
                      <div
                        key={bookmark.id}
                        className={`group relative px-3 py-2 rounded-lg shadow-sm cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 ${
                          isDarkMode ? 'bg-gray-800 hover:bg-gray-750' : 'bg-white hover:bg-gray-50'
                        }`}
                        onClick={() => goToBookmark(bookmark.page_index)}
                      >
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                          </svg>
                          <span className={`text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            Page {bookmark.page_index + 1}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteBookmark(bookmark.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700 ml-1"
                            title="Remove"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bookmark Choice Modal (Desktop) */}
      {showBookmarkModal && !isMobile && (
        <>
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-50"
            onClick={() => setShowBookmarkModal(false)}
          />
          <div
            className={`fixed z-50 ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-black'} rounded-lg shadow-2xl p-6 w-96`}
            style={{
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)'
            }}
          >
            <h3 className="text-lg font-bold mb-4">Bookmark Page</h3>
            <p className={`text-sm mb-6 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Which page do you want to bookmark?
            </p>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => toggleBookmark(currentPageIndex)}
                className={`p-4 rounded-lg border-2 transition-all hover:scale-105 ${
                  isPageBookmarked(currentPageIndex)
                    ? 'border-blue-500 bg-blue-50'
                    : isDarkMode 
                      ? 'border-gray-600 hover:border-gray-500' 
                      : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <svg className={`w-8 h-8 mx-auto mb-2 ${
                  isPageBookmarked(currentPageIndex) ? 'text-blue-500' : isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`} fill={isPageBookmarked(currentPageIndex) ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
                <p className="font-semibold">Left Page</p>
                <p className="text-sm text-gray-500">Page {currentPageIndex + 1}</p>
                {isPageBookmarked(currentPageIndex) && (
                  <p className="text-xs text-blue-500 mt-1">✓ Bookmarked</p>
                )}
              </button>

              <button
                onClick={() => toggleBookmark(currentPageIndex + 1)}
                className={`p-4 rounded-lg border-2 transition-all hover:scale-105 ${
                  isPageBookmarked(currentPageIndex + 1)
                    ? 'border-blue-500 bg-blue-50'
                    : isDarkMode 
                      ? 'border-gray-600 hover:border-gray-500' 
                      : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <svg className={`w-8 h-8 mx-auto mb-2 ${
                  isPageBookmarked(currentPageIndex + 1) ? 'text-blue-500' : isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`} fill={isPageBookmarked(currentPageIndex + 1) ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
                <p className="font-semibold">Right Page</p>
                <p className="text-sm text-gray-500">Page {currentPageIndex + 2}</p>
                {isPageBookmarked(currentPageIndex + 1) && (
                  <p className="text-xs text-blue-500 mt-1">✓ Bookmarked</p>
                )}
              </button>
            </div>

            <button
              onClick={() => setShowBookmarkModal(false)}
              className={`w-full mt-6 px-4 py-2 rounded-lg transition-colors font-medium ${
                isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              Cancel
            </button>
          </div>
        </>
      )}

      {/* Color Picker Modal */}
      {showColorPicker && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-50"
            onClick={() => {
              setShowColorPicker(false);
              setSelectedText('');
              setHighlightTitle('');
              window.getSelection().removeAllRanges();
            }}
          />
          <div
            className={`fixed z-50 ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-black'} rounded-lg shadow-2xl p-6 w-96`}
            style={{
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)'
            }}
          >
            <h3 className="text-lg font-bold mb-4">Create Highlight</h3>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Selected Text:</label>
              <div className={`p-2 rounded text-sm max-h-24 overflow-y-auto ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                "{selectedText}"
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Highlight Title:</label>
              <input
                type="text"
                value={highlightTitle}
                onChange={(e) => setHighlightTitle(e.target.value)}
                placeholder="Enter a title for this highlight"
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Choose Color:</label>
              <div className="flex gap-2 flex-wrap">
                {[
                  { color: '#FFFF00', name: 'Yellow' },
                  { color: '#90EE90', name: 'Green' },
                  { color: '#FFB6C1', name: 'Pink' },
                  { color: '#87CEEB', name: 'Blue' },
                  { color: '#FFD700', name: 'Gold' },
                  { color: '#DDA0DD', name: 'Plum' },
                  { color: '#FFA500', name: 'Orange' },
                  { color: '#98FB98', name: 'Mint' }
                ].map((item) => (
                  <button
                    key={item.color}
                    onClick={() => setSelectedColor(item.color)}
                    className={`w-12 h-12 rounded-lg border-2 transition-transform hover:scale-110 ${selectedColor === item.color ? 'border-black ring-2 ring-blue-500' : 'border-gray-300'
                      }`}
                    style={{ backgroundColor: item.color }}
                    title={item.name}
                  />
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={saveHighlight}
                className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors font-medium"
              >
                Save Highlight
              </button>
              <button
                onClick={() => {
                  setShowColorPicker(false);
                  setSelectedText('');
                  setHighlightTitle('');
                  window.getSelection().removeAllRanges();
                }}
                className={`flex-1 px-4 py-2 rounded-lg transition-colors font-medium ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                  }`}
              >
                Cancel
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

// Page Content Component (EXACT SAME AS YOUR ORIGINAL)
function PageContent({ page, pageNumber, onChapterClick, book, isDarkMode, setIsDarkMode }) {
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
    return <ChapterTitlePage chapter={page.content} pageNumber={pageNumber} isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} />;
  }
  if (page.type === 'content') {
    return <ContentPage page={page.content} chapterTitle={page.chapterTitle} pageNumber={pageNumber} isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} />;
  }
  if (page.type === 'back-cover') {
    return <BackCoverPage book={book} />;
  }
  return null;
}

function CoverPage({ book }) {
  return (
    <div className="page-inner bg-gradient-to-br from-blue-800 via-blue-700 to-blue-900 text-white">
      {/* Header */}
      <div className="flex-shrink-0 pt-8 text-center" style={{ height: '80px' }}>
        <div className="text-2xl font-bold">
          <span className="text-green-400">PLAB</span>
          <span className="text-blue-400">MEDI</span>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex flex-col justify-center items-center p-12">
        <div className="text-center space-y-6">
          {/* Book Icon */}
          <div className="mb-8">
            <svg className="w-24 h-24 mx-auto text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>

          {/* Title */}
          <h1 className="text-5xl font-bold leading-tight px-6 select-text">
            {book?.title || 'Smart Notes'}
          </h1>

          {/* Author */}
          <div className="space-y-2 pt-2">
            <p className="text-lg text-blue-200">by {book?.author_name || 'Dr. Karam Singh'}</p>
          </div>

          {/* Divider Line */}
          <div className="w-48 h-px bg-blue-300/50 mx-auto my-6"></div>

          {/* Edition/Subject */}
          <div className="space-y-3 pt-2">
            <p className="text-base text-blue-100 select-text">
              {book?.subject_name || 'Clinical Practice Edition'}
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 text-center pb-8" style={{ height: '80px' }}>
        <p className="text-sm text-blue-200">Tap to open</p>
        <p className="text-xs text-blue-300">{book?.topic_name || '2025 Edition'}</p>
      </div>
    </div>
  );
}


function TableOfContents({ chapters, chapterPageMap, onChapterClick }) {
  return (
    <div className="page-inner bg-white">
      {/* Header */}
      <div className="flex-shrink-0 p-10 pb-4">
        <h2 className="text-3xl font-bold text-gray-900 select-text">
          Course Contents
        </h2>
      </div>

      {/* Content Area */}
      <div className="flex-1 px-10 pb-4 overflow-y-auto">
        <div className="space-y-0">
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
                className="w-full text-left p-6 hover:bg-gray-50 transition-all cursor-pointer border-b border-gray-200 last:border-b-0"
              >
                <div className="space-y-2">
                  <h3 className="font-semibold text-base text-gray-900 select-text">
                    Chapter {index + 1}: {chapter.title}
                  </h3>
                  {chapter.description && (
                    <p className="text-sm text-gray-600 select-text">
                      {chapter.description}
                    </p>
                  )}
                  <div className="text-sm text-blue-600 font-medium">
                    Page {pageIndex + 1}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 h-12"></div>
    </div>
  );
}


function ChapterTitlePage({ chapter, pageNumber, chapterIndex, isDarkMode }) {
  return (
    <div
      className={`page-inner relative ${isDarkMode ? 'bg-[#2A2A2A]' : 'bg-white'
        }`}
    >
      <div className="flex flex-col justify-center items-center p-12 h-full">
        <div className="text-center space-y-6 max-w-2xl">
          {/* Chapter Number */}
          <p
            className={`text-sm uppercase tracking-wide select-text ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}
          >
            CHAPTER {chapterIndex || 1}
          </p>

          {/* Chapter Title */}
          <h2
            className={`text-4xl font-bold leading-tight select-text ${isDarkMode ? 'text-gray-100' : 'text-gray-900'
              }`}
          >
            {chapter.title}
          </h2>

          {/* Underline */}
          <div
            className={`w-16 h-1 mx-auto ${isDarkMode ? 'bg-blue-400' : 'bg-blue-600'
              }`}
          ></div>

          {/* Description */}
          <p
            className={`text-base leading-relaxed px-8 select-text mt-8 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}
          >
            This chapter covers essential endocrinology concepts including diabetes mellitus,
            thyroid disorders, adrenal pathology, and metabolic syndromes. Key topics include
            pathophysiology, clinical manifestations, diagnostic approaches, and evidence-based
            management strategies.
          </p>
        </div>

        {/* Page Number */}
        <div className="absolute bottom-8 left-0 right-0 text-center">
          <span
            className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-500'
              }`}
          >
            {pageNumber}
          </span>
        </div>
      </div>
    </div>
  );
}



function ContentPage({ page, chapterTitle, pageNumber, isDarkMode }) {
  // Header and footer heights
  const HEADER_HEIGHT = 60;
  const FOOTER_HEIGHT = 50;

  return (
    <div
      className={`page-inner bg-gradient-to-br ${isDarkMode ? 'bg-[#2A2A2A] text-gray-200' : 'bg-[#F4F1EA] text-gray-800'
        }`}
      style={{ minHeight: '1300px', display: 'flex', flexDirection: 'column' }}
    >
      {/* Header */}
      <div
        className={`flex-shrink-0 px-10 pt-4 pb-4 border-b ${isDarkMode
            ? 'bg-[#2A2A2A] border-gray-700'
            : 'bg-white border-gray-300'
          }`}
        style={{ height: `${HEADER_HEIGHT}px` }}
      >
        <p
          className={`text-xs uppercase tracking-wide truncate select-text ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`}
        >
          {chapterTitle}
        </p>
      </div>

      {/* Content Area */}
      <div
        className={`px-10 py-8 flex-1 ${isDarkMode ? 'bg-[#2A2A2A]' : 'bg-white'
          }`}
      >
        <div
          className={`book-content-text select-text ${isDarkMode ? 'dark-book-content' : ''
            }`}
          dangerouslySetInnerHTML={{
            __html:
              page.content ||
              `<p class="${isDarkMode ? 'text-gray-500' : 'text-gray-400'
              } italic text-center mt-20">No content available</p>`,
          }}
        />

      </div>

      {/* Footer */}
      <div
        className={`flex-shrink-0 pt-4 pb-4 text-center border-t ${isDarkMode
            ? 'bg-[#2A2A2A] border-gray-700'
            : 'bg-white border-gray-200'
          }`}
        style={{ height: `${FOOTER_HEIGHT}px` }}
      >
        <span
          className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-400'
            }`}
        >
          {pageNumber}
        </span>
      </div>
    </div>
  );
}



function BackCoverPage({ book }) {
  return (
    <div className="page-inner bg-gradient-to-br from-gray-800 to-gray-900 text-white">
      {/* Header */}
      <div className="flex-shrink-0 h-20"></div>

      {/* Content Area */}
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

      {/* Footer */}
      <div className="flex-shrink-0 h-20"></div>
    </div>
  );
}