/**
 * https://openlibrary.org/dev/docs/api/search
 */
export async function searchOpenLibrary(query: string) {
  try {
    const res = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=10`);
    if (!res.ok) throw new Error("Search failed");
    const data = await res.json();
    return data.docs.map((doc: any) => ({
      title: doc.title,
      author: doc.author_name ? doc.author_name.join(", ") : "Unknown Author",
      isbn: doc.isbn ? doc.isbn[0] : "",
      coverUrl: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : "",
      publishedYear: doc.first_publish_year || "",
    }));
  } catch (error) {
    console.error("Error fetching open library data", error);
    return [];
  }
}
