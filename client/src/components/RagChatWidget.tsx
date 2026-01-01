import { useState, useRef, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Streamdown } from "streamdown";
import {
  Brain,
  MessageSquare,
  Send,
  Loader2,
  X,
  Minimize2,
  Maximize2,
  ChevronDown,
  BookOpen,
  Sparkles,
  Plus,
} from "lucide-react";

interface ChunkMetadata {
  chunkId: number;
  documentId: number;
  documentTitle: string;
  content: string;
  similarity: number;
}

interface Message {
  id: number;
  role: "user" | "assistant" | "system";
  content: string;
  retrievedChunks?: ChunkMetadata[] | null;
  createdAt: Date;
}

interface StreamingMessage {
  content: string;
  isStreaming: boolean;
  sources?: { documentTitle: string; content: string; similarity: number }[];
}

const WIDGET_STATE_KEY = "rag-widget-state";

export default function RagChatWidget() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(() => {
    const saved = localStorage.getItem(WIDGET_STATE_KEY);
    return saved === "open";
  });
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<number | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [showConversationList, setShowConversationList] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState<StreamingMessage | null>(null);
  const [showSources, setShowSources] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Save widget state
  useEffect(() => {
    localStorage.setItem(WIDGET_STATE_KEY, isOpen ? "open" : "closed");
  }, [isOpen]);

  // Queries
  const conversationsQuery = trpc.rag.listConversations.useQuery(
    {},
    { enabled: !!user && isOpen }
  );
  const conversationQuery = trpc.rag.getConversation.useQuery(
    { conversationId: selectedConversation! },
    { enabled: !!selectedConversation && isOpen }
  );

  // Mutations
  const createConversationMutation = trpc.rag.createConversation.useMutation({
    onSuccess: (data) => {
      setSelectedConversation(data.conversationId);
      conversationsQuery.refetch();
      setShowConversationList(false);
    },
  });

  const chatMutation = trpc.rag.chat.useMutation({
    onSuccess: () => {
      conversationQuery.refetch();
      setMessageInput("");
    },
    onError: (error) => {
      toast.error(`Chat error: ${error.message}`);
    },
  });

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversationQuery.data?.messages, streamingMessage]);

  // Streaming chat handler
  const handleStreamingChat = useCallback(async () => {
    if (!messageInput.trim() || !selectedConversation || !user) return;

    const message = messageInput.trim();
    setMessageInput("");
    setStreamingMessage({ content: "", isStreaming: true, sources: [] });

    try {
      const eventSource = new EventSource(
        `/api/rag/stream?userId=${user.id}&conversationId=${selectedConversation}&message=${encodeURIComponent(message)}`
      );

      eventSource.addEventListener("sources", (event) => {
        const data = JSON.parse(event.data);
        setStreamingMessage(prev => prev ? { ...prev, sources: data.chunks } : null);
      });

      eventSource.addEventListener("chunk", (event) => {
        const data = JSON.parse(event.data);
        setStreamingMessage(prev => prev ? { ...prev, content: prev.content + data.content } : null);
      });

      eventSource.addEventListener("complete", () => {
        setStreamingMessage(null);
        conversationQuery.refetch();
        eventSource.close();
      });

      eventSource.addEventListener("error", () => {
        setStreamingMessage(null);
        eventSource.close();
        chatMutation.mutate({ conversationId: selectedConversation, message });
      });
    } catch {
      setStreamingMessage(null);
      chatMutation.mutate({ conversationId: selectedConversation, message });
    }
  }, [messageInput, selectedConversation, user, chatMutation, conversationQuery]);

  const handleSendMessage = () => {
    if (!messageInput.trim() || !selectedConversation) return;
    handleStreamingChat();
  };

  const handleNewConversation = () => {
    createConversationMutation.mutate({});
  };

  if (!user) return null;

  const conversations = conversationsQuery.data || [];
  const messages = (conversationQuery.data?.messages || []) as Message[];

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 p-4 rounded-full bg-gradient-to-r from-cyan-600 to-purple-600 text-white shadow-lg hover:shadow-cyan-500/25 hover:scale-105 transition-all duration-300 group"
          aria-label="Open AI Assistant"
        >
          <Brain className="h-6 w-6 group-hover:animate-pulse" />
          <span className="absolute -top-1 -right-1 h-3 w-3 bg-green-500 rounded-full animate-pulse" />
        </button>
      )}

      {/* Chat Widget */}
      {isOpen && (
        <div
          className={`fixed z-50 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl shadow-purple-500/10 transition-all duration-300 ${
            isExpanded
              ? "bottom-4 right-4 w-[600px] h-[80vh]"
              : "bottom-6 right-6 w-[380px] h-[500px]"
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-slate-700 bg-gradient-to-r from-slate-800 to-slate-900 rounded-t-lg">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/30">
                <Brain className="h-4 w-4 text-cyan-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">AI Assistant</h3>
                <p className="text-[10px] text-slate-400">Knowledge Base</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="h-7 w-7 p-0 text-slate-400 hover:text-white"
              >
                {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="h-7 w-7 p-0 text-slate-400 hover:text-red-400"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Conversation Selector */}
          <div className="p-2 border-b border-slate-800">
            <div className="relative">
              <button
                onClick={() => setShowConversationList(!showConversationList)}
                className="w-full flex items-center justify-between p-2 rounded-lg bg-slate-800/50 hover:bg-slate-800 text-sm text-white transition-colors"
              >
                <span className="flex items-center gap-2 truncate">
                  <MessageSquare className="h-3.5 w-3.5 text-cyan-400" />
                  {selectedConversation
                    ? conversationQuery.data?.title || "Current Chat"
                    : "Select a conversation"}
                </span>
                <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${showConversationList ? "rotate-180" : ""}`} />
              </button>

              {/* Dropdown */}
              {showConversationList && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-10 max-h-48 overflow-auto">
                  <button
                    onClick={handleNewConversation}
                    className="w-full flex items-center gap-2 p-2 text-sm text-cyan-400 hover:bg-slate-700 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    New Conversation
                  </button>
                  {conversations.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => {
                        setSelectedConversation(conv.id);
                        setShowConversationList(false);
                      }}
                      className={`w-full flex items-center gap-2 p-2 text-sm text-left transition-colors ${
                        selectedConversation === conv.id
                          ? "bg-cyan-500/20 text-cyan-400"
                          : "text-slate-300 hover:bg-slate-700"
                      }`}
                    >
                      <MessageSquare className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="truncate">{conv.title || "Untitled"}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Messages Area */}
          <ScrollArea className="flex-1 h-[calc(100%-140px)]">
            <div className="p-3 space-y-3">
              {!selectedConversation ? (
                <div className="text-center py-8">
                  <Brain className="h-10 w-10 mx-auto mb-3 text-cyan-500/50" />
                  <p className="text-sm text-slate-400 mb-3">
                    Start a conversation to ask questions about the system
                  </p>
                  <Button
                    onClick={handleNewConversation}
                    size="sm"
                    className="bg-gradient-to-r from-cyan-600 to-purple-600"
                    disabled={createConversationMutation.isPending}
                  >
                    {createConversationMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-1" />
                        New Chat
                      </>
                    )}
                  </Button>
                </div>
              ) : messages.length === 0 && !streamingMessage ? (
                <div className="text-center py-6">
                  <Sparkles className="h-8 w-8 mx-auto mb-2 text-purple-500/50" />
                  <p className="text-sm text-slate-400">
                    Ask me anything about the documentation
                  </p>
                </div>
              ) : (
                <>
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-lg p-2.5 text-sm ${
                          msg.role === "user"
                            ? "bg-cyan-600/20 border border-cyan-500/30"
                            : "bg-slate-800/50 border border-slate-700"
                        }`}
                      >
                        <div className="prose prose-invert prose-sm max-w-none text-xs">
                          <Streamdown>{msg.content}</Streamdown>
                        </div>
                        
                        {/* Compact Sources */}
                        {msg.role === "assistant" && msg.retrievedChunks && msg.retrievedChunks.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-slate-700">
                            <button
                              onClick={() => setShowSources(showSources === msg.id ? null : msg.id)}
                              className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                            >
                              <BookOpen className="h-2.5 w-2.5" />
                              {msg.retrievedChunks.length} sources
                            </button>
                            {showSources === msg.id && (
                              <div className="mt-1.5 space-y-1">
                                {msg.retrievedChunks.slice(0, 3).map((chunk, i) => (
                                  <div key={chunk.chunkId} className="text-[10px] text-slate-400">
                                    [{i + 1}] {chunk.documentTitle}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Streaming Message */}
                  {streamingMessage && (
                    <div className="flex justify-start">
                      <div className="max-w-[85%] rounded-lg p-2.5 bg-slate-800/50 border border-slate-700">
                        {streamingMessage.content ? (
                          <div className="prose prose-invert prose-sm max-w-none text-xs">
                            <Streamdown>{streamingMessage.content}</Streamdown>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-slate-400">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            <span className="text-xs">Thinking...</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input Area */}
          {selectedConversation && (
            <div className="p-2 border-t border-slate-800">
              <div className="flex gap-2">
                <Input
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder="Ask a question..."
                  className="flex-1 h-9 text-sm bg-slate-800/50 border-slate-700 focus:border-cyan-500"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  disabled={chatMutation.isPending || streamingMessage?.isStreaming}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!messageInput.trim() || chatMutation.isPending || streamingMessage?.isStreaming}
                  size="sm"
                  className="h-9 px-3 bg-gradient-to-r from-cyan-600 to-purple-600"
                >
                  {chatMutation.isPending || streamingMessage?.isStreaming ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
