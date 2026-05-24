import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { useQuery } from "../hooks/useQuery";
import { Borrow, Book } from "../types";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { where, doc, collection, runTransaction } from "firebase/firestore";
import { Link } from "react-router-dom";
import { formatDistanceToNow, isPast, format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Loader2,
  BookOpen,
  AlertCircle,
  Sparkles,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { recommendBooks } from "../services/geminiService";
import Markdown from "react-markdown";

function DashboardContent({ user, profile }: { user: any; profile: any }) {
  const {
    data: myBorrows,
    loading: borrowsLoading,
    refetch: refetchBorrows,
  } = useQuery<Borrow>("borrows", [where("userId", "==", user.uid)]);

  const { data: books, loading: booksLoading } = useQuery<Book>("books");

  const [recommendation, setRecommendation] = useState<string | null>(null);
  const [recommending, setRecommending] = useState(false);

  const activeBorrows = myBorrows.filter((b) => b.status === "active");
  const pastBorrows = myBorrows
    .filter((b) => b.status === "returned")
    .sort((a, b) => {
      const timeA = a.returnedAt
        ? a.returnedAt instanceof Date
          ? a.returnedAt.getTime()
          : (a.returnedAt as any).toDate().getTime()
        : 0;
      const timeB = b.returnedAt
        ? b.returnedAt instanceof Date
          ? b.returnedAt.getTime()
          : (b.returnedAt as any).toDate().getTime()
        : 0;
      return timeB - timeA;
    });

  const handleReturn = async (borrow: Borrow) => {
    try {
      await runTransaction(db, async (transaction) => {
        const bookRef = doc(db, "books", borrow.bookId);
        const userRef = doc(db, "users", user.uid);
        const borrowRef = doc(db, "borrows", borrow.id);

        const bookDoc = await transaction.get(bookRef);
        const userDoc = await transaction.get(userRef);

        if (!bookDoc.exists() || !userDoc.exists()) {
          throw new Error("Missing records.");
        }

        const bookData = bookDoc.data() as Book;
        const userData = userDoc.data();

        transaction.update(bookRef, {
          availableInventory: bookData.availableInventory + 1,
        });
        transaction.update(userRef, {
          borrowedCount: Math.max(0, userData.borrowedCount - 1),
        });
        transaction.update(borrowRef, {
          status: "returned",
          returnedAt: new Date(),
        });
      });

      toast.success("Book returned successfully!");
      refetchBorrows();
    } catch (err: any) {
      toast.error(err.message || "Failed to return book.");
      if (err.message !== "Missing records.") {
        handleFirestoreError(err, OperationType.UPDATE, "return_transaction");
      }
    }
  };

  const loadRecommendations = async () => {
    setRecommending(true);
    const history = myBorrows.map((b) => b.bookTitle);
    const catalogSnippet = books
      .map((b) => `- ${b.title} by ${b.author}`)
      .join("\n");
    const aiResponse = await recommendBooks(history, catalogSnippet);
    setRecommendation(aiResponse);
    setRecommending(false);
  };

  if (borrowsLoading || booksLoading)
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="animate-spin" />
      </div>
    );

  return (
    <div className="space-y-12">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between border-b pb-6 gap-6">
        <div>
          <h1 className="text-4xl font-serif font-bold tracking-tight">
            My Reading Journey
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage your current books and discover new ones.
          </p>
        </div>
        <div className="bg-card shadow-sm border rounded-lg px-6 py-4 flex flex-col items-center min-w-[200px]">
          <span className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            Borrowed Books
          </span>
          <div className="flex items-baseline space-x-2">
            <span className="text-4xl font-light font-mono">
              {activeBorrows.length}
            </span>
            <span className="text-xl text-muted-foreground font-light">
              / 5
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Borrowed List */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-2xl font-serif">Currently Reading</h2>

          {activeBorrows.length === 0 ? (
            <div className="py-12 px-6 border border-dashed rounded-lg text-center bg-muted/20">
              <BookOpen className="h-10 w-10 mx-auto text-muted-foreground mb-4 opacity-50" />
              <h3 className="font-serif text-lg mb-2">Your shelf is empty</h3>
              <p className="text-muted-foreground text-sm">
                Head over to the catalog to find a new adventure.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeBorrows.map((borrow) => {
                let due = null;
                if (borrow.dueDate) {
                  due =
                    borrow.dueDate instanceof Date
                      ? borrow.dueDate
                      : (borrow.dueDate as any).toDate();
                }
                const overdue = due && isPast(due);

                return (
                  <Card
                    key={borrow.id}
                    className={`overflow-hidden bg-card ${overdue ? "border-destructive" : ""}`}
                  >
                    <div className="flex flex-col sm:flex-row">
                      <div className="p-5 flex-1 space-y-2">
                        <h3 className="font-serif text-xl font-bold">
                          {borrow.bookTitle}
                        </h3>
                        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>
                            {due ? (
                              overdue ? (
                                <span className="text-destructive font-semibold flex items-center">
                                  <AlertCircle className="h-4 w-4 mr-1" />{" "}
                                  Overdue
                                </span>
                              ) : (
                                <span>Due in {formatDistanceToNow(due)}</span>
                              )
                            ) : (
                              "No due date"
                            )}
                          </span>
                        </div>
                      </div>
                      <div className="bg-muted/30 p-5 flex flex-col items-center justify-center sm:border-l gap-3">
                        <Button className="w-full" variant="default" asChild>
                           <Link to={`/read/${borrow.bookId}`}>Read Book</Link>
                        </Button>
                        <Button variant="outline" className="w-full" onClick={() => handleReturn(borrow)}>
                          Return Book
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          <h2 className="text-2xl font-serif mt-12 mb-4">Past Reads</h2>
          {pastBorrows.length === 0 ? (
            <p className="text-muted-foreground italic text-sm">
              You haven't returned any books yet.
            </p>
          ) : (
            <div className="space-y-3">
              {pastBorrows.map((b) => {
                let returned = null;
                if (b.returnedAt) {
                  returned =
                    b.returnedAt instanceof Date
                      ? b.returnedAt
                      : (b.returnedAt as any).toDate();
                }
                let borrowed = null;
                if (b.borrowedAt) {
                  borrowed =
                    b.borrowedAt instanceof Date
                      ? b.borrowedAt
                      : (b.borrowedAt as any).toDate();
                }
                return (
                  <Card key={b.id} className="bg-card shadow-sm border">
                    <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <h3 className="font-serif text-lg font-bold">
                          {b.bookTitle}
                        </h3>
                        <div className="text-sm text-muted-foreground mt-1 flex flex-wrap gap-x-4 gap-y-1">
                          {borrowed && (
                            <span>
                              Borrowed: {format(borrowed, "MMM d, yyyy")}
                            </span>
                          )}
                          {returned && (
                            <span>
                              Returned: {format(returned, "MMM d, yyyy")}
                            </span>
                          )}
                        </div>
                      </div>
                      <Badge
                        variant="secondary"
                        className="w-fit flex items-center space-x-1"
                      >
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        <span>Returned</span>
                      </Badge>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Sidebar recommendations */}
        <div className="space-y-6">
          <Card className="bg-gradient-to-br from-primary/10 to-transparent border-primary/20 shadow-none">
            <CardContent className="p-6">
              <div className="flex items-center space-x-2 mb-4 text-primary">
                <Sparkles className="h-5 w-5" />
                <h3 className="font-serif text-xl font-bold">
                  Librarian's Picks
                </h3>
              </div>

              {!recommendation && !recommending && (
                <div className="text-center py-6">
                  <p className="text-sm text-foreground/80 mb-4 font-serif">
                    Wondering what to read next? Let me analyze your past
                    choices.
                  </p>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={loadRecommendations}
                  >
                    Ask the Librarian
                  </Button>
                </div>
              )}

              {recommending && (
                <div className="py-8 flex flex-col items-center justify-center text-primary/70">
                  <Loader2 className="h-6 w-6 animate-spin mb-2" />
                  <span className="text-sm font-serif italic">
                    Browsing the shelves...
                  </span>
                </div>
              )}

              {recommendation && !recommending && (
                <div className="prose prose-sm prose-primary dark:prose-invert">
                  <div className="markdown-body p-4 bg-background/50 rounded-lg text-sm border font-serif leading-relaxed">
                    <Markdown>{recommendation}</Markdown>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full mt-4 h-8"
                    onClick={loadRecommendations}
                  >
                    Refresh Ideas
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user, profile, loading: authLoading } = useAuth();

  if (authLoading)
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="animate-spin" />
      </div>
    );

  if (!user) {
    return (
      <div className="p-10 text-center font-serif">
        Please log in to view your dashboard.
      </div>
    );
  }

  return <DashboardContent user={user} profile={profile} />;
}
