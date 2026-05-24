import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, X, Loader2 } from "lucide-react";
import { chatWithLibrarian } from "../services/geminiService";
import Markdown from "react-markdown";

export default function LibrarianChat({ catalogSummary }: { catalogSummary: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{role: 'user'|'model', text: string}[]>([
    { role: 'model', text: 'Hello! I am your AI Librarian. Looking for a specific book or genre?' }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    if(!input.trim()) return;
    
    const userMsg = input;
    setInput("");
    const newHistory = [...messages, { role: 'user' as const, text: userMsg }];
    setMessages(newHistory);
    setIsTyping(true);

    const responseText = await chatWithLibrarian(newHistory, catalogSummary);
    setMessages([...newHistory, { role: 'model', text: responseText }]);
    setIsTyping(false);
  };

  return (
    <>
      {/* FAB */}
      <Button 
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-xl"
        onClick={() => setIsOpen(!isOpen)}
        size="icon"
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </Button>

      {/* Chat Box */}
      {isOpen && (
        <Card className="fixed bottom-24 right-6 w-80 sm:w-96 shadow-2xl z-50 overflow-hidden flex flex-col h-[500px]">
          <div className="bg-primary text-primary-foreground p-4 flex items-center justify-between">
            <h3 className="font-serif text-lg font-bold">Librarian Chat</h3>
          </div>
          
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-3 rounded-2xl ${msg.role === 'user' ? 'bg-primary text-primary-foreground rounded-br-none' : 'bg-muted rounded-bl-none'}`}>
                    <div className="markdown-body text-sm overflow-hidden prose prose-sm dark:prose-invert">
                      <Markdown>{msg.text}</Markdown>
                    </div>
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-muted p-3 rounded-2xl rounded-bl-none flex space-x-2 items-center">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Typing...</span>
                  </div>
                </div>
              )}
              <div ref={scrollRef} />
            </div>
          </ScrollArea>
          
          <div className="p-3 border-t bg-card flex gap-2">
            <Input 
              placeholder="Ask for a recommendation..." 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              disabled={isTyping}
            />
            <Button onClick={handleSend} disabled={isTyping || !input.trim()}>Send</Button>
          </div>
        </Card>
      )}
    </>
  );
}
