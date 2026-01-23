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
              Drag pages to flip • Use arrow keys (← →) • Click text to select
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


function ChapterTitlePage({ chapter, pageNumber, chapterIndex }) {
  return (
    <div className="page-inner bg-white relative">
      <div className="flex flex-col justify-center items-center p-12 h-full">
        <div className="text-center space-y-6 max-w-2xl">
          {/* Chapter Number Label */}
          <p className="text-sm text-gray-600 uppercase tracking-wide select-text">
            CHAPTER {chapterIndex || 1}
          </p>

          {/* Chapter Title */}
          <h2 className="text-4xl font-bold leading-tight text-gray-900 select-text">
            {chapter.title}
          </h2>

          {/* Blue Underline */}
          <div className="w-16 h-1 bg-blue-600 mx-auto"></div>

          {/* Chapter Description - Static for now */}
          <p className="text-base text-gray-700 leading-relaxed px-8 select-text mt-8">
            This chapter covers essential endocrinology concepts including diabetes mellitus, 
            thyroid disorders, adrenal pathology, and metabolic syndromes. Key topics include 
            pathophysiology, clinical manifestations, diagnostic approaches, and evidence-based 
            management strategies.
          </p>
        </div>

        {/* Page Number at Bottom */}
        <div className="absolute bottom-8 left-0 right-0 text-center">
          <span className="text-sm text-gray-500">{pageNumber}</span>
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
