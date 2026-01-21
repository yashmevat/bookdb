// components/Sidebar.jsx
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  if (!user) return null;

  const superadminLinks = [
    { href: '/dashboard/authors', label: 'Authors' },
    { href: '/dashboard/subjects', label: 'Subjects' },
    { href: '/dashboard/topics', label: 'Topics' },
    { href: '/dashboard/mappings', label: 'Mappings' }
  ];

  const authorLinks = [
    { href: '/author/books', label: 'My Books' }
  ];

  const links = user.role === 'superadmin' ? superadminLinks : authorLinks;

  return (
    <aside className="w-64 bg-gray-800 text-white min-h-screen p-4 flex flex-col">
      <div className="mb-8">
        <h2 className="text-2xl font-bold">
          {user.role === 'superadmin' ? 'Superadmin Panel' : 'Author Panel'}
        </h2>
        <p className="text-sm text-gray-400 mt-2">Welcome, {user.username}</p>
      </div>
      
      <nav className="flex-1">
        <ul className="space-y-2">
          {links.map((link) => (
            <li key={link.href}>
              <Link 
                href={link.href}
                className={`block px-4 py-2 rounded transition ${
                  pathname === link.href 
                    ? 'bg-blue-600' 
                    : 'hover:bg-gray-700'
                }`}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <button 
        onClick={logout}
        className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 rounded transition"
      >
        Logout
      </button>
    </aside>
  );
}
