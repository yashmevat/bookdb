// app/author/layout.jsx

import Sidebar from "@/components/SideBar";

export default function AuthorLayout({ children }) {
  return (
    <div className="flex">
      <Sidebar/>
      <main className="flex-1 bg-gray-50 min-h-screen">
        {children}
      </main>
    </div>
  );
}
