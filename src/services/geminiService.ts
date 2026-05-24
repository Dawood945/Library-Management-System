import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function recommendBooks(userHistory: string[], catalogSummary: string): Promise<string> {
  try {
    const prompt = `You are a helpful librarian AI. Based on the user's reading history and the current catalog, recommend 3 books they might like.
    
    Reading History:
    ${userHistory.length > 0 ? userHistory.map(b => "- " + b).join("\n") : "New user with no history."}
    
    Available Catalog:
    ${catalogSummary}
    
    Format your output using Markdown. Be friendly and conversational. Keep it concise.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: prompt,
      config: {
        systemInstruction: "You are an expert librarian AI recommending books.",
      }
    });

    return response.text || "I couldn't generate recommendations at this time.";
  } catch (err) {
    console.error("Failed to recommend books:", err);
    return "Error generating recommendations.";
  }
}

export async function generateBookContent(title: string, author: string): Promise<string> {
  try {
    const prompt = `Write a compelling first chapter for a book titled "${title}" by ${author}. This is for a reader who has checked it out from the library. Provide a short introduction followed by the text of Chapter 1. Use Markdown styling.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: "You are an author writing a chapter of a book.",
      }
    });

    return response.text || "Could not retrieve the book content.";
  } catch (err) {
    console.error("Failed to fetch book content:", err);
    return "Error retrieving book content. Please try again later.";
  }
}

export async function chatWithLibrarian(messageHistory: {role: 'user'|'model', text: string}[], catalogSummary: string): Promise<string> {
  try {
    const chat = ai.chats.create({
      model: "gemini-3-flash-preview",
      config: {
        systemInstruction: `You are the AI Librarian assistant. Help members find books from the catalog. 
        Here is what we currently have:
        ${catalogSummary}
        
        Keep answers short and friendly. Formulate output in Markdown.`,
      }
    });

    // Populate history
    for(let i=0; i<messageHistory.length - 1; i++) {
        const msg = messageHistory[i];
        if (msg.role === 'user') {
             await chat.sendMessage({ message: msg.text });
        } else {
            // Note: chat history in the new SDK isn't directly settable in the same way,
            // we should just pass the messages. But the simplest way is to put the whole transcript into the model if needed,
            // or perform actual tracking. Since this is a simple implementation, we'll just send the last message 
            // and include history in the prompt.
        }
    }
    
    // So let's actually just build a string of the transcript and send it as one prompt
    const transcript = messageHistory.map(m => `${m.role === 'user' ? 'User' : 'Librarian'}: ${m.text}`).join('\n');
    
    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Previous conversation:\n${transcript}\n\nLibrarian:`,
        config: {
            systemInstruction: `You are the AI Librarian assistant. Help members find books from the catalog. 
            Here is what we currently have:
            ${catalogSummary}
            
            Keep answers short and friendly. Continue the conversation natively. Formulate output in Markdown.`,
        }
    });

    return response.text || "Sorry, I am busy organizing shelves right now.";
  } catch (err) {
    console.error("Librarian offline:", err);
    return "I am currently offline. Please talk to a human librarian.";
  }
}
