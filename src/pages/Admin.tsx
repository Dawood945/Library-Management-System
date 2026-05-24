import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { Book } from "../types";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { collection, addDoc, getDocs, updateDoc, doc, deleteDoc } from "firebase/firestore";
import { searchOpenLibrary } from "../services/openLibraryService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Plus, Search, Trash2 } from "lucide-react";
import { useQuery } from "../hooks/useQuery";

function AddBookSection() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    setLoading(true);
    const res = await searchOpenLibrary(query);
    setResults(res);
    setLoading(false);
  };

  const handleAdd = async (bookData: any, amount: number) => {
    try {
      await addDoc(collection(db, "books"), {
        title: bookData.title,
        author: bookData.author,
        isbn: bookData.isbn,
        coverUrl: bookData.coverUrl,
        description: "",
        totalInventory: amount,
        availableInventory: amount
      });
      toast.success(`Added "${bookData.title}" to catalog.`);
    } catch (err) {
      toast.error("Failed to add book.");
      handleFirestoreError(err, OperationType.CREATE, "books");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-4">
        <Input 
          placeholder="Search OpenLibrary by Title or ISBN..." 
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
        />
        <Button onClick={handleSearch} disabled={loading}>
          {loading ? <Loader2 className="animate-spin h-4 w-4" /> : <Search className="h-4 w-4" />}
          <span className="ml-2">Search</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {results.map((r, i) => (
          <Card key={i} className="flex flex-col h-full overflow-hidden">
            <div className="h-48 bg-muted flex items-center justify-center overflow-hidden">
              {r.coverUrl ? (
                <img src={r.coverUrl} className="object-cover h-full w-full opacity-90 hover:opacity-100 transition-opacity" alt={r.title} />
              ) : (
                <span className="text-muted-foreground italic font-serif">No Cover</span>
              )}
            </div>
            <CardContent className="p-4 flex-1 flex flex-col justify-between">
              <div>
                <h3 className="font-serif font-bold text-lg leading-tight mb-1">{r.title}</h3>
                <p className="text-sm text-muted-foreground">{r.author}</p>
                {r.publishedYear && <p className="text-xs text-muted-foreground mt-2">Published: {r.publishedYear}</p>}
              </div>
              <div className="mt-4 flex gap-2">
                <Button size="sm" onClick={() => handleAdd(r, 1)} className="w-full">
                  <Plus className="h-4 w-4 mr-1" /> Add 1 Copy
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleAdd(r, 5)} className="w-full">
                  <Plus className="h-4 w-4 mr-1" /> Add 5 Copies
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function ManageCatalog() {
  const { data: books, refetch, loading } = useQuery<Book>("books");

  const handleDelete = async (id: string) => {
    if(!confirm("Are you sure you want to delete this book?")) return;
    try {
      await deleteDoc(doc(db, "books", id));
      toast.success("Book deleted.");
      refetch();
    } catch(err) {
      toast.error("Failed to delete book.");
      handleFirestoreError(err, OperationType.DELETE, `books/${id}`);
    }
  }

  if (loading) return <Loader2 className="animate-spin mx-auto mt-10" />;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="font-serif text-2xl">Current Inventory</h2>
        <Button onClick={refetch} variant="outline" size="sm">Refresh</Button>
      </div>
      
      {/* Recipe 1: Technical Dashboard Data Grid style */}
      <div className="border rounded-lg bg-card overflow-hidden">
        <div className="grid grid-cols-[3fr_2fr_1fr_1fr_1fr] p-3 border-b bg-muted/50 text-xs uppercase tracking-wider font-semibold opacity-70">
          <div>Title</div>
          <div>Author</div>
          <div>Total</div>
          <div>Available</div>
          <div className="text-right">Actions</div>
        </div>
        {books.map(book => (
          <div key={book.id} className="grid grid-cols-[3fr_2fr_1fr_1fr_1fr] p-3 border-b last:border-b-0 items-center hover:bg-muted/30 transition-colors">
            <div className="font-serif font-medium truncate pr-4">{book.title}</div>
            <div className="text-sm text-muted-foreground truncate pr-4">{book.author}</div>
            <div className="font-mono text-sm">{book.totalInventory}</div>
            <div className="font-mono text-sm">{book.availableInventory}</div>
            <div className="text-right">
              <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => handleDelete(book.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
        {books.length === 0 && <div className="p-8 text-center text-muted-foreground">No books in catalog.</div>}
      </div>
    </div>
  );
}

export default function Admin() {
  const { profile, loading } = useAuth();
  const [secretKey, setSecretKey] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;
  if (profile?.role !== 'admin') return <div className="p-8 font-serif text-2xl text-center">Unauthorized. Admins only.</div>;

  const handleAuthenticate = (e: React.FormEvent) => {
    e.preventDefault();
    if (secretKey === import.meta.env.VITE_ADMIN_SECRET_KEY) {
      setIsAuthenticated(true);
    } else {
      toast.error("Invalid secret key.");
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto mt-20 p-6 border rounded-lg shadow-sm bg-card">
        <h2 className="text-2xl font-serif font-bold mb-4">Admin Authentication</h2>
        <p className="text-muted-foreground mb-6 text-sm">Please enter the admin secret key to access this area.</p>
        <form onSubmit={handleAuthenticate} className="space-y-4">
          <Input 
            type="password" 
            placeholder="Secret Key" 
            value={secretKey}
            onChange={(e) => setSecretKey(e.target.value)}
          />
          <Button type="submit" className="w-full">Authenticate</Button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-serif font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-2">Manage library catalog and inventory.</p>
      </div>

      <Tabs defaultValue="add">
        <TabsList className="mb-4">
          <TabsTrigger value="add">Add Books via API</TabsTrigger>
          <TabsTrigger value="manage">Manage Catalog</TabsTrigger>
        </TabsList>
        <TabsContent value="add">
          <AddBookSection />
        </TabsContent>
        <TabsContent value="manage">
          <ManageCatalog />
        </TabsContent>
      </Tabs>
    </div>
  );
}
