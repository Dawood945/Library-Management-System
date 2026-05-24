import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { Book } from "../types";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { doc, collection, runTransaction } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Library, Clock } from "lucide-react";
import LibrarianChat from "../components/LibrarianChat";
import { toast } from "sonner";
import { useQuery } from "../hooks/useQuery";
import { addDays } from "date-fns";

export default function Catalog() {
  const { user, profile } = useAuth();
  const { data: books, loading, refetch } = useQuery<Book>("books");
  const [search, setSearch] = useState("");

  const filteredBooks = books.filter(b => 
    b.title.toLowerCase().includes(search.toLowerCase()) || 
    b.author.toLowerCase().includes(search.toLowerCase())
  );

  const handleBorrow = async (book: Book) => {
    if (!user || !profile) return;
    if (profile.borrowedCount >= 5) {
      toast.error("You have reached the maximum borrow limit of 5 books.");
      return;
    }

    try {
      await runTransaction(db, async (transaction) => {
        const bookRef = doc(db, "books", book.id);
        const userRef = doc(db, "users", user.uid);
        
        const bookDoc = await transaction.get(bookRef);
        const userDoc = await transaction.get(userRef);

        if (!bookDoc.exists() || !userDoc.exists()) {
          throw new Error("Document does not exist");
        }

        const bookData = bookDoc.data() as Book;
        const userData = userDoc.data();

        if (bookData.availableInventory <= 0) {
          throw new Error("Book is out of stock.");
        }
        if (userData.borrowedCount >= 5) {
          throw new Error("Borrow limit reached.");
        }

        const borrowRef = doc(collection(db, "borrows"));
        const dueDate = addDays(new Date(), 14); // 14 days borrow period
        
        transaction.update(bookRef, { availableInventory: bookData.availableInventory - 1 });
        transaction.update(userRef, { borrowedCount: userData.borrowedCount + 1 });
        transaction.set(borrowRef, {
          userId: user.uid,
          bookId: book.id,
          bookTitle: book.title,
          borrowedAt: new Date(),
          dueDate: dueDate,
          returnedAt: null,
          status: "active"
        });
      });

      toast.success(`Successfully borrowed "${book.title}"`);
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Failed to borrow book.");
      if (err.message !== "Book is out of stock." && err.message !== "Borrow limit reached.") {
        handleFirestoreError(err, OperationType.CREATE, "borrows/transact");
      }
    }
  };

  return (
    <div className="space-y-8 relative pb-24">
      <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
        <h1 className="text-5xl font-serif font-bold tracking-tight text-primary">Discover Your Next Story</h1>
        <p className="text-lg text-muted-foreground font-serif italic mb-8">Browse the Lumina Library digital catalog.</p>
        
        <div className="relative w-full max-w-xl">
          <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
          <Input 
            className="pl-10 h-12 text-md rounded-full shadow-sm bg-white" 
            placeholder="Search catalog by title or author..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center"><Library className="h-8 w-8 animate-pulse text-muted-foreground" /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredBooks.map((book) => (
            <Card key={book.id} className="overflow-hidden border-none shadow bg-card group hover:shadow-xl transition-shadow flex flex-col h-[420px]">
              <div className="h-64 overflow-hidden relative bg-accent">
                {book.coverUrl ? (
                  <img src={book.coverUrl} className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500" alt={book.title} />
                ) : (
                  <div className="flex items-center justify-center h-full w-full font-serif font-bold text-muted-foreground opacity-50 px-4 text-center">
                    {book.title}
                  </div>
                )}
                {book.availableInventory <= 0 && (
                  <div className="absolute top-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded font-bold uppercase tracking-wider backdrop-blur-sm">
                    Out of Stock
                  </div>
                )}
              </div>
              <CardContent className="p-4 flex-1 flex flex-col justify-between items-start">
                <div>
                  <h3 className="font-serif font-bold text-lg leading-tight line-clamp-2">{book.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{book.author}</p>
                </div>
                
                <div className="w-full mt-4 flex items-center justify-between">
                  <div className="text-xs text-muted-foreground flex items-center">
                    <span className="font-mono bg-muted px-2 py-1 rounded">{book.availableInventory} left</span>
                  </div>
                  {user ? (
                    <Button 
                      size="sm" 
                      className="rounded-full shadow-lg" 
                      disabled={book.availableInventory <= 0 || (profile?.borrowedCount ?? 0) >= 5}
                      onClick={() => handleBorrow(book)}
                    >
                      Borrow
                    </Button>
                  ) : (
                    <span className="text-xs italic text-muted-foreground">Sign in to borrow</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          {filteredBooks.length === 0 && (
            <div className="col-span-full py-12 text-center text-muted-foreground italic font-serif">
              No titles matched your search.
            </div>
          )}
        </div>
      )}

      {/* AI Librarian Chat takes the full catalog as context */}
      <LibrarianChat catalogSummary={books.map(b => `- ${b.title} by ${b.author} (${b.availableInventory} available)`).join("\n")} />
    </div>
  );
}
