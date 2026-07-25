"use client";

import { useState, type FormEvent } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function ChatPanel() {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });

  const busy = status === "submitted" || status === "streaming";

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    sendMessage({ text });
    setInput("");
  }

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-hidden">
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto">
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Try &quot;What should I work on next?&quot; or &quot;What&apos;s on my
            plate today?&quot;
          </p>
        )}
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap",
              message.role === "user"
                ? "self-end bg-primary text-primary-foreground"
                : "self-start bg-muted",
            )}
          >
            {message.parts.map((part, i) =>
              part.type === "text" ? <span key={i}>{part.text}</span> : null,
            )}
          </div>
        ))}
        {status === "submitted" && (
          <div className="flex items-center gap-1.5 self-start text-sm text-muted-foreground">
            <Sparkles className="size-3.5 animate-pulse" />
            Thinking...
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Message AI Brain..."
          disabled={busy}
        />
        <Button type="submit" size="icon" disabled={busy || !input.trim()}>
          <Send className="size-4" />
        </Button>
      </form>
    </div>
  );
}
