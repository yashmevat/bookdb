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
