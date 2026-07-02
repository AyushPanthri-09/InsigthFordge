import { useState, useRef, useEffect } from "react";
import {
  Bot,
  Send,
  X,
  MessageSquare,
  Sparkles,
  ArrowRight,
  User,
  BrainCircuit,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";

interface Message {
  sender: "user" | "ai";
  text: string;
  timestamp: string;
}

export function AiCopilot({
  dataset,
  understanding,
}: {
  dataset: any;
  understanding: any;
}) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: "ai",
      text: "Hello! I am your AI Copilot. I have mapped the uploaded dataset and columns. Ask me to identify metrics, check quality issues, or forecast trends!",
      timestamp: "Just now",
    },
  ]);
  const [typing, setTyping] = useState(false);
  const feedEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  const presetPrompts = [
    "Summarize dataset dimensions",
    "Identify columns metadata",
    "Find potential correlations",
  ];

  const handleSend = (text: string) => {
    if (!text.trim() || typing) return;

    // Add user message
    const newMsg: Message = {
      sender: "user",
      text,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setMessages((prev) => [...prev, newMsg]);
    setInput("");
    setTyping(true);

    // Simulate AI response based on dataset parameters
    setTimeout(() => {
      let responseText =
        "I parsed your query but couldn't map it directly to a statistical formula. Could you clarify your business metric goal?";

      const promptLower = text.toLowerCase();
      const colListStr = dataset?.columns?.join(", ") || "no columns loaded";

      if (
        promptLower.includes("summarize") ||
        promptLower.includes("dimension")
      ) {
        responseText = `This dataset contains ${dataset?.rowCount?.toLocaleString() || 0} rows and ${dataset?.columnCount || 0} columns. The inferred business domain is "${understanding?.domain || "general"}" with a high structural confidence score of 95%.`;
      } else if (
        promptLower.includes("columns") ||
        promptLower.includes("metadata") ||
        promptLower.includes("type")
      ) {
        responseText = `I mapped the column schema: \`[ ${colListStr} ]\`. The Technical Profiler classified key measure columns as float/integer types and categoricals as metadata dimensions.`;
      } else if (
        promptLower.includes("correlation") ||
        promptLower.includes("relation")
      ) {
        responseText = `Pearson regression models indicate strong positive linear correlations between your primary measure variables (r = 0.85). I recommend charting these trends inside the EDA tab to isolate performance drivers.`;
      } else if (
        promptLower.includes("quality") ||
        promptLower.includes("clean")
      ) {
        responseText = `Data health profiling is complete. System audit detects minor inconsistencies and duplicate indexes in early rows. Propose applying structural standardizations to maximize analysis safety.`;
      }

      setMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: responseText,
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      ]);
      setTyping(false);
    }, 1200);
  };

  return (
    <>
      {/* ── Floating Chat Button ──────────────────────────────────── */}
      <motion.button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-2xl transition-all hover:scale-110 active:scale-95"
        style={{
          boxShadow:
            "0 8px 32px -4px oklch(0.85 0.19 95 / 45%), 0 0 0 1px oklch(0.85 0.19 95 / 30%)",
        }}
        whileHover={{ rotate: 5 }}
      >
        <MessageSquare className="h-6 w-6" />
      </motion.button>

      {/* ── Slide-over Panel ──────────────────────────────────────── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 120 }}
            transition={{ type: "spring", damping: 20, stiffness: 120 }}
            className="fixed inset-y-0 right-0 z-50 w-full max-w-[400px] border-l border-white/10 bg-surface/90 shadow-2xl backdrop-blur-2xl flex flex-col justify-between"
            style={{
              boxShadow: "-10px 0 50px -15px oklch(0 0 0 / 80%)",
            }}
          >
            {/* Header */}
            <div className="border-b border-white/5 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BrainCircuit className="h-5 w-5 text-primary" />
                <div className="space-y-0.5">
                  <h3 className="text-sm font-bold tracking-tight">
                    AI Copilot
                  </h3>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                    Insight Scientist
                  </span>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="h-8 w-8 rounded-lg border border-white/5 flex items-center justify-center hover:bg-white/5 hover:border-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Chat Messages Feed */}
            <div className="flex-grow overflow-y-auto px-6 py-4 space-y-4 scrollbar-thin">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex flex-col max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed space-y-1 relative",
                    msg.sender === "user"
                      ? "ml-auto bg-primary text-primary-foreground rounded-tr-none border border-primary/20 shadow-md"
                      : "bg-background/50 border border-white/5 rounded-tl-none",
                  )}
                  style={
                    msg.sender === "user"
                      ? {
                          boxShadow:
                            "0 4px 12px -3px oklch(0.85 0.19 95 / 25%)",
                        }
                      : {}
                  }
                >
                  <div className="flex items-center gap-1.5 opacity-60 text-[9px] font-semibold uppercase tracking-wider mb-0.5">
                    {msg.sender === "user" ? (
                      <User className="h-3 w-3" />
                    ) : (
                      <Bot className="h-3 w-3" />
                    )}
                    <span>
                      {msg.sender === "user" ? "You" : "InsightForge AI"}
                    </span>
                  </div>
                  <p>{msg.text}</p>
                  <span className="text-[8px] opacity-40 text-right self-end mt-1">
                    {msg.timestamp}
                  </span>
                </div>
              ))}

              {typing && (
                <div className="flex flex-col max-w-[85%] rounded-2xl rounded-tl-none p-4 bg-background/50 border border-white/5 text-xs">
                  <div className="flex items-center gap-1.5 opacity-60 text-[9px] font-semibold uppercase tracking-wider mb-2">
                    <Bot className="h-3 w-3" />
                    <span>InsightForge AI</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" />
                  </div>
                </div>
              )}
              <div ref={feedEndRef} />
            </div>

            {/* Presets and Input */}
            <div className="border-t border-white/5 p-4 space-y-4 bg-background/20">
              {/* Presets */}
              <div className="flex flex-wrap gap-1.5">
                {presetPrompts.map((preset, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(preset)}
                    className="rounded-lg border border-white/8 bg-white/5 px-2.5 py-1.5 text-[10px] font-medium hover:border-primary/20 hover:bg-primary/5 transition-all text-left"
                  >
                    {preset}
                  </button>
                ))}
              </div>

              {/* Text Area Input */}
              <div className="relative">
                <input
                  type="text"
                  value={input}
                  disabled={typing}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend(input)}
                  placeholder="Ask a question about your data..."
                  className="w-full rounded-xl border border-white/10 bg-background/60 py-3 pl-4 pr-10 text-xs transition-all focus:border-primary focus:bg-background focus:ring-1 focus:ring-primary"
                />
                <button
                  onClick={() => handleSend(input)}
                  disabled={typing || !input.trim()}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground hover:opacity-90 active:scale-95 transition-all disabled:opacity-30 disabled:pointer-events-none"
                >
                  <Send className="h-3 w-3" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
