export type UserRole = "admin" | "member";

export interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  coverUrl: string;
  description: string;
  totalInventory: number;
  availableInventory: number;
}

export interface Borrow {
  id: string;
  userId: string;
  bookId: string;
  bookTitle: string; // denormalized for easier rendering
  borrowedAt: Date;
  dueDate: Date;
  returnedAt: Date | null;
  status: "active" | "returned" | "overdue";
}
