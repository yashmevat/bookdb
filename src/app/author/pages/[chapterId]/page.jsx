'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const CKEditorComponent = dynamic(
  () => import('../../components/CKEditorComponent'),
  { 
    ssr: false,
    loading: () => (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-yellow-800">⏳ Loading editor...</p>
      </div>
    )
  }
);

export default function PagesPage() {
  const params = useParams();
  const chapterId = params.chapterId;

  const [pages, setPages] = useState([]);
  const [chapterTitle, setChapterTitle] = useState('');
  const [bookId, setBookId] = useState(null);
  const [formData, setFormData] = useState({ content: '' });
  const [editMode, setEditMode] = useState(false);
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [editorInstance, setEditorInstance] = useState(null);
  const [autoSplit, setAutoSplit] = useState(false);

  useEffect(() => {
    fetchPages();
    fetchChapterDetails();
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

  const handleEditorChange = (data) => {
    setFormData({ content: data });
  };

  const handleEditorReady = (editor) => {
    setEditorInstance(editor);
  };

  // Count words in HTML content
  const countWords = (html) => {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    const text = temp.textContent || temp.innerText || '';
    const words = text.trim().split(/\s+/).filter(word => word.length > 0);
    return words.length;
  };

  // Split content by page height to fit book dimensions
  // Simpler approach - add more content to fill gaps
const splitContentByHeight = (htmlContent, maxHeight = 680) => {
  const pages = [];
  
  const container = document.createElement('div');
  container.style.cssText = `
    position: absolute;
    visibility: hidden;
    width: 606px;
    padding: 32px;
    font-size: 16px;
    line-height: 1.75;
    font-family: system-ui, -apple-system, sans-serif;
  `;
  document.body.appendChild(container);
  
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');
  const allElements = Array.from(doc.body.children);
  
  let currentPage = [];
  
  for (let element of allElements) {
    const tagName = element.tagName.toLowerCase();
    const originalContent = element.textContent || '';
    
    // Pehle pura element try karo
    currentPage.push(element.outerHTML);
    container.innerHTML = currentPage.join('');
    
    // Agar height exceed ho gayi
    if (container.scrollHeight > maxHeight) {
      // Last element remove karo
      currentPage.pop();
      
      // Ab is element ko chunks mein todo
      if (originalContent.trim()) {
        // Words mein split karo
        const words = originalContent.split(/\s+/);
        let currentChunk = '';
        
        for (let i = 0; i < words.length; i++) {
          const testChunk = currentChunk + (currentChunk ? ' ' : '') + words[i];
          
          // Test element banao with current chunk
          const testElement = document.createElement(tagName);
          testElement.innerHTML = testChunk;
          
          // Copy attributes
          Array.from(element.attributes).forEach(attr => {
            testElement.setAttribute(attr.name, attr.value);
          });
          
          // Test karo ki fit ho raha hai ya nahi
          const tempPage = [...currentPage, testElement.outerHTML];
          container.innerHTML = tempPage.join('');
          
          if (container.scrollHeight > maxHeight && currentChunk) {
            // Current chunk ko save karo aur naya page shuru karo
            const chunkElement = document.createElement(tagName);
            chunkElement.innerHTML = currentChunk;
            Array.from(element.attributes).forEach(attr => {
              chunkElement.setAttribute(attr.name, attr.value);
            });
            
            currentPage.push(chunkElement.outerHTML);
            
            // Save current page
            if (currentPage.length > 0) {
              pages.push(currentPage.join(''));
            }
            
            // Naya page shuru karo
            currentPage = [];
            currentChunk = words[i];
          } else {
            // Add word to current chunk
            currentChunk = testChunk;
          }
        }
        
        // Remaining chunk ko add karo
        if (currentChunk.trim()) {
          const chunkElement = document.createElement(tagName);
          chunkElement.innerHTML = currentChunk;
          Array.from(element.attributes).forEach(attr => {
            chunkElement.setAttribute(attr.name, attr.value);
          });
          currentPage.push(chunkElement.outerHTML);
        }
      } else {
        // Empty element - directly add
        currentPage.push(element.outerHTML);
      }
      
      // Check current page height again
      container.innerHTML = currentPage.join('');
      if (container.scrollHeight > maxHeight && currentPage.length > 0) {
        pages.push(currentPage.join(''));
        currentPage = [];
      }
    }
  }
  
  // Add remaining content
  if (currentPage.length > 0) {
    pages.push(currentPage.join(''));
  }
  
  document.body.removeChild(container);
  return pages.length > 0 ? pages : [htmlContent];
};



  // Preview pagination before saving
  const previewPagination = () => {
    let editorContent = formData.content;
    if (editorInstance) {
      editorContent = editorInstance.getData();
    }

    if (!editorContent || editorContent.trim() === '') {
      alert('Please add some content first!');
      return;
    }

    const pages = autoSplit 
      ? splitContentByHeight(editorContent, 700)
      : editorContent.split(/<div[^>]*page-break-after[^>]*>[\s\S]*?<\/div>/gi).filter(p => p.trim());

    const totalWords = countWords(editorContent);

    alert(
      `📊 Pagination Preview:\n\n` +
      `Total Words: ${totalWords}\n` +
      `Total Pages: ${pages.length}\n` +
      `Average words/page: ${Math.round(totalWords / pages.length)}\n\n` +
      `${autoSplit ? '✅ Pages will fit perfectly in book (670×700px)!' : '📄 Using manual page breaks'}`
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    let editorContent = formData.content;
    if (editorInstance) {
      editorContent = editorInstance.getData();
    }

    if (editMode) {
      const res = await fetch('/api/author/pages', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editorContent, id: editId })
      });

      const data = await res.json();
      if (data.success) {
        setFormData({ content: '' });
        setEditMode(false);
        setEditId(null);
        fetchPages();
        alert('Page updated!');

        if (editorInstance) {
          editorInstance.setData('');
        }
      } else {
        alert('Error: ' + data.error);
      }
    } else {
      let contentPages = [];

      if (autoSplit) {
        // Auto-split by HEIGHT to fit book page
        const maxPageHeight = 700; // 800px total - 100px for margins/header/footer
        contentPages = splitContentByHeight(editorContent, maxPageHeight);
        console.log(`Auto-split into ${contentPages.length} page(s) based on page height (670×800px)`);
      } else {
        // Manual split by page breaks
        const pageBreakMarker = /<div[^>]*page-break-after[^>]*>[\s\S]*?<\/div>/gi;
        const contentWithDelimiters = editorContent.replace(pageBreakMarker, '|||PAGE_BREAK|||');
        contentPages = contentWithDelimiters.split('|||PAGE_BREAK|||').filter(page => page.trim() !== '');
        console.log(`Manual split into ${contentPages.length} page(s)`);
      }

      let savedCount = 0;
      let failedCount = 0;

      for (let i = 0; i < contentPages.length; i++) {
        const pageData = {
          chapter_id: chapterId,
          content: contentPages[i].trim()
        };

        try {
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
            console.error(`Failed to save page ${i + 1}:`, data.error);
          }
        } catch (error) {
          failedCount++;
          console.error(`Error saving page ${i + 1}:`, error);
        }
      }

      if (savedCount > 0) {
        setFormData({ content: '' });
        fetchPages();

        const message = contentPages.length > 1 
          ? `Successfully created ${savedCount} page(s)!${failedCount > 0 ? ` (${failedCount} failed)` : ''}` 
          : 'Page created!';

        alert(message);

        if (editorInstance) {
          editorInstance.setData('');
        }
      } else {
        alert('Error: No pages were created');
      }
    }

    setLoading(false);
  };

  const handleEdit = (page) => {
    setFormData({ content: page.content || '' });
    setEditMode(true);
    setEditId(page.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditMode(false);
    setEditId(null);
    setFormData({ content: '' });

    if (editorInstance) {
      editorInstance.setData('');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this page?')) return;

    const res = await fetch(`/api/author/pages?id=${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      fetchPages();
      alert('Page deleted!');
    }
  };

  return (
    <>
      <style jsx global>{`
        .cke_pagebreak {
          background: linear-gradient(to right, #4299e1 50%, transparent 50%) !important;
          background-size: 10px 2px !important;
          background-repeat: repeat-x !important;
          border: 1px dashed #4299e1 !important;
          padding: 10px 0 !important;
          margin: 20px 0 !important;
          position: relative !important;
          display: block !important;
        }

        .cke_pagebreak::after {
          content: '📄 Page Break - New Page Starts Here' !important;
          display: block !important;
          text-align: center !important;
          color: #4299e1 !important;
          font-size: 12px !important;
          font-weight: bold !important;
          margin-top: 5px !important;
        }
      `}</style>

      <div className="p-8 max-w-7xl mx-auto">
        <div className="mb-8">
          <Link 
            href={bookId ? `/author/chapters/${bookId}` : '/author/books'}
            className="text-blue-600 hover:text-blue-800 flex items-center gap-2 mb-4"
          >
            ← Back to Chapters
          </Link>
          <h1 className="text-3xl font-bold text-gray-800">Pages & Content</h1>
          <p className="text-gray-600 mt-2">Chapter: <span className="font-semibold">{chapterTitle}</span></p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <h2 className="text-xl font-semibold mb-4">
            {editMode ? 'Edit Page' : 'Add New Page'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Auto-split toggle */}
            {!editMode && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <input
                    type="checkbox"
                    id="autoSplit"
                    checked={autoSplit}
                    onChange={(e) => setAutoSplit(e.target.checked)}
                    className="w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                  />
                  <label htmlFor="autoSplit" className="text-sm font-semibold text-purple-900 cursor-pointer">
                    🤖 Enable Automatic Page Split (Fit to Book Page Size)
                  </label>
                </div>

                {autoSplit && (
                  <div className="ml-8 bg-white p-3 rounded border border-purple-200">
                    <p className="text-sm text-purple-800">
                      ✨ <strong>Smart Pagination Enabled</strong>
                    </p>
                    <p className="text-xs text-purple-600 mt-1">
                      Content will automatically split to fit book pages (670×800px)
                      <br />
                      No text will be cut off - overflow goes to next page automatically!
                    </p>
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Content
              </label>

              <CKEditorComponent 
                value={formData.content}
                onChange={handleEditorChange}
                onReady={handleEditorReady}
              />

              <div className="mt-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800 font-semibold mb-1">
                  💡 Two ways to create multiple pages:
                </p>
                <div className="text-sm text-blue-700 space-y-2">
                  <div>
                    <strong>Option 1: Automatic (Recommended) ⭐</strong>
                    <ul className="list-disc list-inside ml-2 mt-1">
                      <li>Enable "Automatic Page Split" checkbox above</li>
                      <li>Write all content continuously</li>
                      <li>Content auto-splits to fit 670×800px book pages perfectly!</li>
                      <li>No text will be cut - overflow moves to next page</li>
                    </ul>
                  </div>
                  <div>
                    <strong>Option 2: Manual</strong>
                    <ul className="list-disc list-inside ml-2 mt-1">
                      <li>Write content → Click "Insert" → "Page Break"</li>
                      <li>Write more content → Add more page breaks as needed</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              {!editMode && (
                <button 
                  type="button"
                  onClick={previewPagination}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium"
                >
                  📊 Preview Pagination
                </button>
              )}
              <button 
                type="submit" 
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400 font-medium"
              >
                {loading ? 'Saving...' : (editMode ? 'Update Page' : 'Add Pages')}
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

        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-800">All Pages ({pages.length})</h3>
          </div>

          {pages.length === 0 ? (
            <div className="bg-white p-8 rounded-lg shadow text-center text-gray-500">
              <p className="text-lg">No pages yet</p>
              <p className="text-sm mt-2">Add your first page to this chapter</p>
            </div>
          ) : (
            <div className="grid gap-6">
              {pages.map((page, index) => (
                <div key={page.id} className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-semibold rounded-full">
                          Page {index + 1}
                        </span>
                        <span className="text-xs text-gray-500">
                          ({countWords(page.content || '')} words)
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">
                        Created: {new Date(page.created_at).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'short', 
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleEdit(page)}
                        className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition text-sm font-medium"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => handleDelete(page.id)}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <div className="prose max-w-none">
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 max-h-96 overflow-y-auto">
                      {page.content ? (
                        <div 
                          className="text-gray-700 leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: page.content }}
                        />
                      ) : (
                        <span className="text-gray-400 italic">No content</span>
                      )}
                    </div>
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