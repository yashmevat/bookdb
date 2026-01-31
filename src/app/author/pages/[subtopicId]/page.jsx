'use client';
import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function PagesPage() {
  const params = useParams();
  const router = useRouter();
  const subtopicId = params.subtopicId;

  const [pages, setPages] = useState([]);
  const [subtopicTitle, setSubtopicTitle] = useState('');
  const [topicTitle, setTopicTitle] = useState('');
  const [bookTitle, setBookTitle] = useState('');
  const [bookId, setBookId] = useState(null);
  const [topicId, setTopicId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [splitting, setSplitting] = useState(false);
  const [quillLoaded, setQuillLoaded] = useState(false);
  
  const [livePages, setLivePages] = useState([
    { id: 'page-1', content: '', existingPageId: null }
  ]);
  const [selectedPageIndex, setSelectedPageIndex] = useState(0);
  const [editingPageId, setEditingPageId] = useState(null);
  const quillRefs = useRef({});
  const initializedEditors = useRef(new Set()); // Track initialized editors
  const reflowTimeout = useRef(null); // Debounce reflow
  const topRef = useRef(null); // Ref for scrolling to top

  // A4 EXACT DIMENSIONS (96 DPI standard)
  const PAGE_WIDTH = 794;
  const PAGE_HEIGHT = 1123;
  const HEADER_HEIGHT = 60;
  const FOOTER_HEIGHT = 50;
  const CONTENT_PADDING = 40;
  const CONTENT_HEIGHT = PAGE_HEIGHT - HEADER_HEIGHT - FOOTER_HEIGHT;
  const CONTENT_WIDTH = PAGE_WIDTH - (CONTENT_PADDING * 2);

  useEffect(() => {
    const loadQuill = async () => {
      const link = document.createElement('link');
      link.href = 'https://cdn.quilljs.com/1.3.6/quill.snow.css';
      link.rel = 'stylesheet';
      document.head.appendChild(link);

      const script = document.createElement('script');
      script.src = 'https://cdn.quilljs.com/1.3.6/quill.js';
      script.onload = () => {
        setTimeout(() => setQuillLoaded(true), 200);
      };
      document.body.appendChild(script);
    };

    loadQuill();
    fetchPages();
    fetchSubtopicDetails();

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
  }, [subtopicId]);

  const fetchSubtopicDetails = async () => {
    try {
      // First get the subtopic to find book_id and topic_id
      const res = await fetch(`/api/author/subtopics/details?subtopic_id=${subtopicId}`);
      const data = await res.json();
      
      if (data.success) {
        setSubtopicTitle(data.subtopic?.name || '');
        setTopicTitle(data.topic?.name || '');
        setBookTitle(data.book?.title || '');
        setBookId(data.subtopic?.book_id);
        setTopicId(data.subtopic?.topic_id);
      }
    } catch (error) {
      console.error('Error fetching subtopic details:', error);
    }
  };

  const fetchPages = async () => {
    const res = await fetch(`/api/author/pages?subtopic_id=${subtopicId}`);
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

      const blockHTML = `<${tagName}${blockAttrs}>${block.innerHTML}</${tagName}>`;
      const testHTML = currentPageHTML + blockHTML;
      tempDiv.innerHTML = testHTML;
      const testHeight = tempDiv.scrollHeight;

      if (testHeight > CONTENT_HEIGHT) {
        if (currentPageHTML.trim()) {
          pages.push(currentPageHTML.trim());
          currentPageHTML = '';
        }

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
            if (sentenceBuffer) {
              const sentenceHTML = `<${tagName}${blockAttrs}>${sentenceBuffer}</${tagName}>`;
              const pageToSave = (currentPageHTML + sentenceHTML).trim();
              
              if (pageToSave) {
                pages.push(pageToSave);
              }
              currentPageHTML = '';
              sentenceBuffer = sentence;
            } else {
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

    if (currentPageHTML.trim() && currentPageHTML !== '<p><br></p>') {
      pages.push(currentPageHTML.trim());
    }

    document.body.removeChild(tempDiv);
    return pages.length > 0 ? pages : [htmlContent];
  };

  const initQuill = (index) => {
    if (!window.Quill) return;

    const editorId = `editor-${index}`;
    
    if (initializedEditors.current.has(editorId)) {
      return;
    }

    const container = document.getElementById(editorId);
    
    if (!container) return;

    if (quillRefs.current[index]) {
      const parentDiv = container.parentNode;
      if (parentDiv) {
        const existingToolbar = parentDiv.querySelector('.ql-toolbar');
        if (existingToolbar) {
          existingToolbar.remove();
        }
      }
      container.innerHTML = '';
      delete quillRefs.current[index];
    } else {
      const parentDiv = container.parentNode;
      if (parentDiv) {
        const orphanedToolbars = parentDiv.querySelectorAll('.ql-toolbar');
        orphanedToolbars.forEach(toolbar => toolbar.remove());
      }
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
        const splitPages = splitContentIntoPages(currentContent);

        if (splitPages.length > 1) {
          setSplitting(true);
          
          quill.root.innerHTML = splitPages[0];
          updatePageContent(index, splitPages[0]);

          if (livePages.length === 1 && (!livePages[0].content || livePages[0].content.trim() === '' || livePages[0].content === '<p><br></p>')) {
            const newPages = splitPages.map((pageContent, i) => ({
              id: `page-${Date.now()}-${i}`,
              content: pageContent,
              existingPageId: null
            }));
            
            initializedEditors.current.clear();
            setLivePages(newPages);
          } else {
            const newPages = [...livePages];
            for (let i = 1; i < splitPages.length; i++) {
              newPages.splice(index + i, 0, {
                id: `page-${Date.now()}-${i}`,
                content: splitPages[i],
                existingPageId: null
              });
            }

            initializedEditors.current.clear();
            setLivePages(newPages);
          }

          setTimeout(() => {
            setSplitting(false);
            setTimeout(() => {
              alert(`✅ Content split into ${splitPages.length} A4 pages!`);
            }, 100);
          }, 500);
        }
      }, 100);

      return delta;
    });

    quill.on('text-change', () => {
      const content = quill.root.innerHTML;
      const editorHeight = quill.root.scrollHeight;
      const fillPercentage = Math.round((editorHeight / CONTENT_HEIGHT) * 100);
      
      if (reflowTimeout.current) {
        clearTimeout(reflowTimeout.current);
      }
      
      if (editorHeight > CONTENT_HEIGHT) {
        reflowTimeout.current = setTimeout(() => {
          setLivePages(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], content };
            
            let allContent = '';
            for (let i = 0; i < updated.length; i++) {
              const pageContent = updated[i].content || '';
              if (pageContent.trim() && pageContent !== '<p><br></p>') {
                allContent += pageContent;
              }
            }
            
            const reflowedPages = splitContentIntoPages(allContent);
            
            const newPages = [];
            reflowedPages.forEach((pageContent, i) => {
              newPages.push({
                id: updated[i]?.id || `page-${Date.now()}-${i}`,
                content: pageContent,
                existingPageId: updated[i]?.existingPageId || null
              });
            });
            
            // Don't add extra blank page - splitContentIntoPages already handles pagination
            
            return newPages;
          });
          
          setTimeout(() => {
            initializedEditors.current.clear();
            Object.keys(quillRefs.current).forEach(key => {
              const container = document.getElementById(`editor-${key}`);
              if (container?.parentNode) {
                const toolbar = container.parentNode.querySelector('.ql-toolbar');
                if (toolbar) toolbar.remove();
              }
              delete quillRefs.current[key];
            });
          }, 50);
        }, 300);
        
        return;
      }
      
      updatePageContent(index, content);
      
      const pageHeader = document.querySelector(`#editor-${index}`)?.closest('.page-editor-container')?.querySelector('.page-header');
      const pageStatus = pageHeader?.querySelector('.page-status');
      
      if (pageHeader && pageStatus) {
        if (fillPercentage >= 95) {
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
    initializedEditors.current.add(editorId);
  };

  useEffect(() => {
    if (quillLoaded) {
      livePages.forEach((_, index) => {
        const editorId = `editor-${index}`;
        if (!initializedEditors.current.has(editorId)) {
          setTimeout(() => initQuill(index), 100 * index);
        }
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

    const editorId = `editor-${index}`;
    initializedEditors.current.delete(editorId);

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
            subtopic_id: subtopicId,
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
      if (savedCount > 0) message += `Created ${savedCount} new page(s)\n`;
      if (updatedCount > 0) message += `Updated ${updatedCount} page(s)\n`;
      if (failedCount > 0) message += `Failed ${failedCount} page(s)`;
    
      alert(message);
      
      Object.values(quillRefs.current).forEach((quill, index) => {
        if (quill) {
          const container = document.getElementById(`editor-${index}`);
          if (container) container.innerHTML = '';
        }
      });
      
      quillRefs.current = {};
      initializedEditors.current.clear();
      setLivePages([{ id: `page-${Date.now()}`, content: '', existingPageId: null }]);
      setSelectedPageIndex(0);
      setEditingPageId(null);
      fetchPages();
      
      setTimeout(() => initQuill(0), 300);
    } else {
      alert('Failed to save pages');
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
    initializedEditors.current.clear();

    setEditingPageId(page.id);
    setSelectedPageIndex(0);
    
    const newPage = {
      id: `edit-${Date.now()}`,
      content: page.content,
      existingPageId: page.id
    };
    
    setLivePages([newPage]);

    setTimeout(() => {
      if (topRef.current) {
        topRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      
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
      initializedEditors.current.add('editor-0');
      
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
      initializedEditors.current.clear();
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
      alert('Page deleted successfully!');
    } else {
      alert('Failed to delete page');
    }
  };

  return (
    <>
      <style jsx global>{`
        .page-wrapper {
          width: 100%;
          display: flex;
          justify-content: center;
          gap: 20px;
          flex-wrap: wrap;
          padding: 0 12px;
          margin: 20px 0;
        }

        .page-editor-container {
          width: 100%;
          max-width: ${PAGE_WIDTH}px;
          height: ${PAGE_HEIGHT + 40}px;
          background: white;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          border-radius: 0;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          box-sizing: border-box;
          transition: box-shadow 0.2s ease;
          margin: 12px auto;
        }

        /* Mobile: Allow horizontal scroll to see full page */
        @media (max-width: 820px) {
          .page-wrapper {
            overflow-x: auto;
            justify-content: flex-start;
          }
          .page-editor-container {
            flex-shrink: 0;
          }
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
          font-family: Arial, sans-serif !important;
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

        @media print {
          .page-editor-container {
            width: 210mm;
            height: 297mm;
            page-break-after: always;
            box-shadow: none;
            margin: 0;
            transform: none !important;
          }
        }

        .page-editor-container,
        .page-editor-container * {
          color: #111827 !important;
          -webkit-text-fill-color: #111827 !important;
          color-scheme: light !important;
        }

        .ql-container {
          background: white !important;
          color: #111827 !important;
        }

        .ql-editor {
          color: #111827 !important;
          -webkit-text-fill-color: #111827 !important;
        }

        .page-header, .page-footer {
          color: #111827 !important;
          background: #f9fafb !important;
        }

        .ql-editor a {
          color: #1f2937 !important;
        }

        .mt-16, .mt-16 * {
          color: #111827 !important;
          -webkit-text-fill-color: #111827 !important;
          background-color: transparent !important;
        }

        .mt-16 .bg-white {
          background: #ffffff !important;
          color: #111827 !important;
        }
      `}</style>

      <div className="min-h-screen bg-gray-50">
        <div ref={topRef} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          
          {/* Breadcrumb */}
          <div className="mb-8">
            <div className="flex items-center text-sm text-gray-600 space-x-2 mb-4">
              <button 
                onClick={() => router.push('/author/books')} 
                className="hover:text-indigo-600 transition"
              >
                📚 Books
              </button>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <button 
                onClick={() => router.push('/author/books')} 
                className="hover:text-indigo-600 transition"
              >
                {bookTitle || 'Book'}
              </button>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <button 
                onClick={() => bookId && topicId && router.push(`/author/subtopics/${bookId}/${topicId}`)} 
                className="hover:text-indigo-600 transition"
              >
                {topicTitle || 'Topic'}
              </button>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span className="text-gray-900 font-semibold">{subtopicTitle || 'Subtopic'}</span>
            </div>

            <button 
              onClick={() => bookId && topicId && router.push(`/author/subtopics/${bookId}/${topicId}`)}
              className="inline-flex items-center text-indigo-600 hover:text-indigo-800 transition mb-4 group"
            >
              <svg className="w-5 h-5 mr-2 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Subtopics
            </button>
            
            <h1 className="text-3xl font-bold text-gray-900 mb-2">A4 Page Editor</h1>
            <p className="text-gray-600">Subtopic: <span className="font-semibold text-indigo-600">{subtopicTitle || 'Loading...'}</span></p>
            <p className="text-sm text-gray-500 mt-1">📄 A4 Size: 210mm × 297mm (794px × 1123px)</p>
            {editingPageId && (
              <div className="mt-3 inline-block editing-indicator">
                ✏️ Editing Mode - Page ID: {editingPageId}
              </div>
            )}
          </div>

          {/* Control Panel */}
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl shadow-lg p-6 mb-8 border border-gray-200">
            <div className="flex flex-col lg:flex-row items-start gap-4">
              <div className="text-4xl">📝</div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                  {editingPageId ? 'Edit Mode' : 'Create Mode'}
                </h2>
                <p className="text-gray-600 mb-4">
                  {editingPageId 
                    ? 'Editing existing page - Perfect A4 format' 
                    : 'Create pages with A4 auto-split - No gaps at bottom'}
                </p>
                
                <div className="flex gap-3 flex-wrap">
                  <button 
                    onClick={addNewPage}
                    disabled={!quillLoaded}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium disabled:bg-gray-400 shadow-md"
                  >
                    Add New Page
                  </button>
                  <button 
                    onClick={saveAllPages}
                    disabled={loading || !quillLoaded}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400 font-medium shadow-md"
                  >
                    {loading ? 'Saving...' : editingPageId ? 'Update Page' : 'Save All Pages'}
                  </button>
                  {editingPageId && (
                    <button 
                      onClick={cancelEdit}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition font-medium shadow-md"
                    >
                      Cancel Edit
                    </button>
                  )}
                  <div className="px-4 py-2 bg-white rounded-lg border border-gray-300 font-semibold text-gray-700 shadow-sm">
                    📄 {livePages.length} Page(s) • {livePages.reduce((sum, p) => sum + countWords(p.content), 0)} Words
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Editor Loading State */}
          {!quillLoaded ? (
            <div className="flex items-center justify-center p-12 bg-white rounded-xl shadow-lg">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading editor...</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {livePages.map((page, index) => (
                <div key={page.id} className="page-wrapper">
                  <div className="page-editor-container">
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
                </div>
              ))}
            </div>
          )}

          {/* Saved Pages Section */}
          <div className="mt-16">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">📚 Saved A4 Pages ({pages.length})</h2>
            
            {pages.length === 0 ? (
              <div className="bg-white p-12 rounded-xl shadow-lg text-center text-gray-500 border border-gray-200">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-lg font-medium">No saved pages yet</p>
                <p className="text-sm mt-1">Create your first page to get started</p>
              </div>
            ) : (
              <div className="grid gap-6">
                {pages.map((page, index) => (
                  <div 
                    key={page.id} 
                    className={`bg-white rounded-xl shadow-lg border transition-all ${
                      editingPageId === page.id ? 'ring-4 ring-yellow-400' : 'border-gray-200'
                    }`}
                  >
                    <div className="p-6">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-4">
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
                            className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 text-sm disabled:bg-gray-400 disabled:cursor-not-allowed transition shadow-md"
                          >
                            {editingPageId === page.id ? '✏️ Editing...' : '✏️ Edit'}
                          </button>
                          <button 
                            onClick={() => handleDeleteExistingPage(page.id)}
                            disabled={editingPageId === page.id}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm disabled:bg-gray-400 disabled:cursor-not-allowed transition shadow-md"
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 max-h-96 overflow-y-auto">
                        <div dangerouslySetInnerHTML={{ __html: page.content }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Split Loader */}
        {splitting && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm mx-4">
              <div className="flex flex-col items-center">
                <div className="relative">
                  <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                </div>
                <h3 className="mt-6 text-xl font-bold text-gray-900">Splitting Content...</h3>
                <p className="mt-2 text-sm text-gray-600 text-center">Creating A4 pages from your content</p>
                <div className="mt-4 flex gap-1">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
