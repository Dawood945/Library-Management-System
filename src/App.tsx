import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import { Toaster } from "@/components/ui/sonner";
import Catalog from "./pages/Catalog";
import Dashboard from "./pages/Dashboard";
import Admin from "./pages/Admin";
import ReadBook from "./pages/ReadBook";
import { Button } from "@/components/ui/button";

function Navbar() {
  const { user, profile, signIn, signOut } = useAuth();

  return (
    <nav className="flex items-center justify-between p-4 border-b bg-background">
      <div className="flex items-center space-x-6">
        <Link to="/" className="text-2xl font-serif font-bold tracking-tight">
          Lumina Library
        </Link>
        <div className="hidden md:flex space-x-4">
          <Link to="/" className="text-sm font-medium hover:underline">Catalog</Link>
          {user && <Link to="/dashboard" className="text-sm font-medium hover:underline">My Dashboard</Link>}
          {profile?.role === 'admin' && (
            <Link to="/admin" className="text-sm font-medium hover:underline">Add books</Link>
          )}
        </div>
      </div>
      <div>
        {user ? (
          <div className="flex items-center space-x-4">
            <span className="text-sm text-muted-foreground">{profile?.displayName || user.email}</span>
            <Button variant="outline" size="sm" onClick={signOut}>Sign Out</Button>
          </div>
        ) : (
          <Button onClick={signIn} size="sm">Sign In</Button>
        )}
      </div>
    </nav>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col bg-background text-foreground">
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          <Routes>
            <Route path="/" element={<Catalog />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/read/:id" element={<ReadBook />} />
          </Routes>
        </main>
        <Toaster />
      </div>
    </BrowserRouter>
  );
}
