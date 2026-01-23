// components/Sidebar.jsx
'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Check screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
      if (window.innerWidth >= 1024) {
        setIsOpen(false); // Auto-close on desktop
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close sidebar when clicking outside (mobile only)
  useEffect(() => {
    if (!isMobile) return;

    const handleClickOutside = (e) => {
      if (isOpen && !e.target.closest('.sidebar-container') && !e.target.closest('.hamburger-btn')) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, isMobile]);

  // Lock body scroll when sidebar is open on mobile
  useEffect(() => {
    if (isMobile && isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, isMobile]);

  if (!user) return null;

  const superadminLinks = [
    { href: '/dashboard/authors', label: '👤 Authors', icon: '👤' },
    { href: '/dashboard/subjects', label: '📚 Subjects', icon: '📚' },
    { href: '/dashboard/topics', label: '📝 Topics', icon: '📝' },
    { href: '/dashboard/mappings', label: '🔗 Mappings', icon: '🔗' }
  ];

  const authorLinks = [
    { href: '/author/books', label: '📖 My Books', icon: '📖' }
  ];

  const links = user.role === 'superadmin' ? superadminLinks : authorLinks;

  const closeSidebar = () => {
    if (isMobile) setIsOpen(false);
  };

  return (
    <>
      {/* Hamburger Button (Mobile Only) */}
      {isMobile && (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="hamburger-btn fixed top-4 left-4 z-50 p-2 bg-gray-800 text-white rounded-lg shadow-lg hover:bg-gray-700 transition lg:hidden"
          aria-label="Toggle Menu"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {isOpen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </button>
      )}

      {/* Backdrop Overlay (Mobile Only) */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          sidebar-container
          fixed lg:static
          top-0 left-0
          w-64 h-screen
          bg-gradient-to-b from-gray-800 to-gray-900
          text-white
          p-4 flex flex-col
          shadow-2xl
          z-40
          transition-transform duration-300 ease-in-out
          ${isMobile ? (isOpen ? 'translate-x-0' : '-translate-x-full') : 'translate-x-0'}
          lg:translate-x-0
        `}
      >
        {/* Header */}
        <div className="mb-8 pt-12 lg:pt-0">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              {user.role === 'superadmin' ? 'Admin Panel' : 'Author Panel'}
            </h2>
          </div>
          <p className="text-sm text-gray-400">
            Welcome, <span className="text-blue-400 font-semibold">{user.username}</span>
          </p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto">
          <ul className="space-y-2">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={closeSidebar}
                  className={`
                    flex items-center gap-3
                    px-4 py-3 rounded-lg
                    transition-all duration-200
                    ${
                      pathname === link.href
                        ? 'bg-blue-600 shadow-lg shadow-blue-600/50 scale-105'
                        : 'hover:bg-gray-700 hover:pl-6'
                    }
                  `}
                >
                  <span className="text-xl">{link.icon}</span>
                  <span className="font-medium">{link.label.split(' ').slice(1).join(' ')}</span>
                  {pathname === link.href && (
                    <svg className="w-4 h-4 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Divider */}
        <div className="my-4 border-t border-gray-700"></div>

        {/* User Info Card */}
        <div className="bg-gray-700/50 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-lg font-bold">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{user.username}</p>
              <p className="text-xs text-gray-400 capitalize">{user.role}</p>
            </div>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={() => {
            logout();
            closeSidebar();
          }}
          className="
            w-full px-4 py-3
            bg-red-600 hover:bg-red-700
            rounded-lg transition-all duration-200
            flex items-center justify-center gap-2
            font-semibold
            shadow-lg hover:shadow-red-600/50
            hover:scale-105
          "
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Logout
        </button>
      </aside>
    </>
  );
}
