import React, { useEffect, useRef, useState } from "react";
import api from "../services/api";

// Minimal, XSS-safe markdown rendering: escape HTML first, then build block
// elements (headings, bullet/numbered lists, paragraphs) and apply a few inline
// styles (bold, italic, inline code). No raw user/LLM HTML is ever injected.
function renderInline(s) {
  return s
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+?)`/g, '<code class="px-1 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-xs">$1</code>')
    .replace(/(^|[^*])\*(?!\*)([^*]+?)\*(?!\*)/g, "$1<em>$2</em>");
}

function renderMarkdown(text) {
  const escaped = String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const lines = escaped.split(/\r?\n/);
  let html = "";
  let listType = null; // "ul" | "ol"
  const closeList = () => {
    if (listType) {
      html += `</${listType}>`;
      listType = null;
    }
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      closeList();
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      closeList();
      html += `<p class="font-semibold mt-1 first:mt-0 mb-0.5">${renderInline(heading[2])}</p>`;
      continue;
    }

    const bullet = line.match(/^[-*•]\s+(.*)$/);
    if (bullet) {
      if (listType !== "ul") {
        closeList();
        html += '<ul class="list-disc ml-4 my-1 space-y-0.5">';
        listType = "ul";
      }
      html += `<li>${renderInline(bullet[1])}</li>`;
      continue;
    }

    const ordered = line.match(/^\d+[.)]\s+(.*)$/);
    if (ordered) {
      if (listType !== "ol") {
        closeList();
        html += '<ol class="list-decimal ml-4 my-1 space-y-0.5">';
        listType = "ol";
      }
      html += `<li>${renderInline(ordered[1])}</li>`;
      continue;
    }

    closeList();
    html += `<p class="mb-1 last:mb-0">${renderInline(line)}</p>`;
  }
  closeList();
  return { __html: html };
}

export default function AIChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hi! I'm your finance assistant. Ask me anything about your spending. 💸" },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open, sending]);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  const send = async () => {
    const question = input.trim();
    if (!question || sending) return;
    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setInput("");
    setSending(true);
    try {
      const res = await api.post("/ai/chat", { question, history });
      setMessages((prev) => [...prev, { role: "assistant", content: res.data.answer }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I couldn't process that right now. Please try again." },
      ]);
    }
    setSending(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <>
      {/* Floating toggle button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow-xl shadow-violet-500/30 flex items-center justify-center hover:scale-105 transition-transform"
        aria-label="Toggle AI assistant"
      >
        {open ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed z-50 bottom-24 right-4 sm:right-6 w-[calc(100vw-2rem)] sm:w-96 max-w-md h-[70vh] sm:h-[32rem] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold leading-tight">Finance Assistant</p>
              <p className="text-[11px] text-white/80">Ask about your spending</p>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 dark:bg-gray-900/50">
            {messages.map((m, idx) => (
              <div key={idx} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                    m.role === "user"
                      ? "bg-violet-600 text-white rounded-br-sm"
                      : "bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-bl-sm border border-gray-100 dark:border-gray-600"
                  }`}
                  dangerouslySetInnerHTML={renderMarkdown(m.content)}
                />
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="bg-white dark:bg-gray-700 border border-gray-100 dark:border-gray-600 px-3 py-2 rounded-2xl rounded-bl-sm">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a question..."
                className="flex-1 resize-none max-h-24 px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm"
              />
              <button
                onClick={send}
                disabled={sending || !input.trim()}
                className="w-10 h-10 flex-shrink-0 rounded-xl bg-violet-600 text-white flex items-center justify-center hover:bg-violet-700 transition disabled:opacity-50"
                aria-label="Send message"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
