import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft } from "lucide-react";
import { generateBookContent } from "../services/geminiService";
import Markdown from "react-markdown";

export default function ReadBook() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookTitle, setBookTitle] = useState("");

  useEffect(() => {
    async function loadBook() {
      if (!id || !user) return;
      try {
        setLoading(true);
        const bookDoc = await getDoc(doc(db, "books", id));
        if (!bookDoc.exists()) {
          setError("Book not found.");
          setLoading(false);
          return;
        }

        const book = bookDoc.data();
        setBookTitle(book.title);

        const text = await generateBookContent(book.title, book.author);
        setContent(text);
      } catch (err: any) {
        setError("Failed to load book content.");
      } finally {
        setLoading(false);
      }
    }

    loadBook();
  }, [id, user]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="animate-spin h-8 w-8 text-primary mb-4" />
        <p className="font-serif animate-pulse text-muted-foreground">Opening the book...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="mb-8">
        <Button variant="ghost" asChild className="pl-0 text-muted-foreground hover:text-foreground">
          <Link to="/dashboard">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
        </Button>
      </div>

      {error ? (
        <div className="text-center text-destructive py-10 font-serif">
          {error}
        </div>
      ) : (
        <div className="bg-card shadow-sm border p-8 md:p-12 rounded-lg">
          <h1 className="text-3xl font-serif font-bold mb-8 text-center">{bookTitle}</h1>
          <div className="prose prose-lg prose-slate dark:prose-invert font-serif leading-loose mx-auto">
            <Markdown>{content || ""}</Markdown>
          </div>
        </div>
      )}
    </div>
  );
}
