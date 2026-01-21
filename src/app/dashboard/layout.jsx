import Sidebar from "@/components/SideBar";


export default function DashboardLayout({ children }) {
  return (
    <div className="flex">
      <Sidebar/>
      <main className="flex-1 bg-gray-50 min-h-screen">
        {children}
      </main>
    </div>
  );
}
