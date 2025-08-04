// components/career-advisor-chat.tsx
import React, { useState, useRef, useEffect } from "react";

export default function CareerAdvisorChat() {
  const [messages, setMessages] = useState([
    { id: 1, text: "こんにちは！何かお手伝いできますか？", sender: "advisor" },
    { id: 2, text: "はい、履歴書の書き方について教えてください。", sender: "user" }
  ]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function sendMessage() {
    if (!input.trim()) return;
    setMessages([...messages, { id: Date.now(), text: input, sender: "user" }]);
    setInput("");
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header could go here if needed */}

      <div className="flex-1 overflow-y-auto space-y-3 px-4 py-3">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`rounded-md p-2 text-sm max-w-[80%] ${
              m.sender === "user" ? "bg-blue-500 text-white self-end" : "bg-gray-200 text-gray-900 self-start"
            }`}
          >
            {m.text}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage();
        }}
        className="border-t p-3 flex items-end gap-2"
      >
        <select className="flex-1 min-w-[140px]">
          <option>Option 1</option>
          <option>Option 2</option>
        </select>
        <textarea
          className="flex-1 resize-none border rounded-md p-2 text-sm"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={1}
          placeholder="メッセージを入力..."
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="h-9 w-9 flex items-center justify-center rounded-md bg-primary text-white disabled:opacity-50"
        >
          ➤
        </button>
      </form>
    </div>
  );
}