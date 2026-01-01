import { useState, useRef, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Streamdown } from "streamdown";
import {
  Brain,
  MessageSquare,
  FileText,
  Upload,
  Search,
  Plus,
  Trash2,
  Archive,
  ThumbsUp,
  ThumbsDown,
  Send,
  Loader2,
  BookOpen,
  Sparkles,
  Clock,
  Hash,
  ChevronRight,
  Database,
  Zap,
  File,
  FileCode,
  FileJson,
  X
} from "lucide-react";

interface ChunkMetadata {
  chunkId: number;
  documentId: number;
  documentTitle: string;
  content: string;
  similarity: number;
  sectionTitle?: string;
}

interface Message {
  id: number;
  role: "user" | "assistant" | "system";
  content: string;
  retrievedChunks?: ChunkMetadata[] | null;
  createdAt: Date;
  feedback?: "positive" | "negative" | null;
}

interface Conversation {
  id: number;
  title: string | null;
  messageCount: number;
  totalTokensUsed: number;
  updatedAt: Date;
  isArchived: boolean;
}

interface Document {
  id: number;
  title: string;
  source: string;
  sourceType: string;
  status: string;
  chunkCount: number;
  tags: string[] | null;
  createdAt: Date;
}

interface StreamingMessage {
  content: string;
  isStreaming: boolean;
  sources?: { documentTitle: string; content: string; similarity: number }[];
}

// Supported file types
const SUPPORTED_EXTENSIONS = [".pdf", ".md", ".txt", ".ts", ".tsx", ".js", ".jsx", ".py", ".json", ".yaml", ".yml", ".html", ".css", ".sql", ".sh"];

function getFileIcon(filename: string) {
  const ext = filename.slice(filename.lastIndexOf(".")).toLowerCase();
  if ([".ts", ".tsx", ".js", ".jsx", ".py"].includes(ext)) return <FileCode className="h-5 w-5 text-cyan-400" />;
  if ([".json", ".yaml", ".yml"].includes(ext)) return <FileJson className="h-5 w-5 text-yellow-400" />;
  if (ext === ".pdf") return <FileText className="h-5 w-5 text-red-400" />;
  return <File className="h-5 w-5 text-slate-400" />;
}

export default function KnowledgeBase() {
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("chat");
  const [selectedConversation, setSelectedConversation] = useState<number | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [showSources, setShowSources] = useState<number | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState("");
  const [newDocContent, setNewDocContent] = useState("");
  const [newDocTags, setNewDocTags] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState<StreamingMessage | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadMode, setUploadMode] = useState<"text" | "file">("text");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Queries
  const conversationsQuery = trpc.rag.listConversations.useQuery({});
  const documentsQuery = trpc.rag.listDocuments.useQuery();
  const conversationQuery = trpc.rag.getConversation.useQuery(
    { conversationId: selectedConversation! },
    { enabled: !!selectedConversation }
  );
  const searchConversationsQuery = trpc.rag.searchConversations.useQuery(
    { query: searchQuery, limit: 20 },
    { enabled: searchQuery.length > 2 && isSearching }
  );

  // Mutations
  const createConversationMutation = trpc.rag.createConversation.useMutation({
    onSuccess: (data) => {
      setSelectedConversation(data.conversationId);
      conversationsQuery.refetch();
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

  const ingestDocumentMutation = trpc.rag.ingestDocument.useMutation({
    onSuccess: () => {
      toast.success("Document ingested successfully!");
      documentsQuery.refetch();
      setUploadDialogOpen(false);
      setNewDocTitle("");
      setNewDocContent("");
      setNewDocTags("");
    },
    onError: (error) => {
      toast.error(`Ingestion error: ${error.message}`);
    },
  });

  const uploadFileMutation = trpc.rag.uploadFile.useMutation({
    onSuccess: (data) => {
      toast.success(`File uploaded! Created ${data.chunkCount} chunks.`);
      documentsQuery.refetch();
      setUploadDialogOpen(false);
      setSelectedFile(null);
      setNewDocTags("");
    },
    onError: (error) => {
      toast.error(`Upload error: ${error.message}`);
    },
  });

  const deleteDocumentMutation = trpc.rag.deleteDocument.useMutation({
    onSuccess: () => {
      toast.success("Document deleted");
      documentsQuery.refetch();
    },
  });

  const archiveConversationMutation = trpc.rag.archiveConversation.useMutation({
    onSuccess: () => {
      toast.success("Conversation archived");
      conversationsQuery.refetch();
      if (selectedConversation) {
        setSelectedConversation(null);
      }
    },
  });

  const deleteConversationMutation = trpc.rag.deleteConversation.useMutation({
    onSuccess: () => {
      toast.success("Conversation deleted");
      conversationsQuery.refetch();
      setSelectedConversation(null);
    },
  });

  const feedbackMutation = trpc.rag.provideFeedback.useMutation({
    onSuccess: () => {
      conversationQuery.refetch();
    },
  });

  const ingestSystemDocsMutation = trpc.rag.ingestSystemDocs.useMutation({
    onSuccess: (data) => {
      toast.success(`Ingested ${data.documentsIngested} system documents (${data.totalChunks} chunks)`);
      documentsQuery.refetch();
    },
    onError: (error) => {
      toast.error(`Failed to ingest system docs: ${error.message}`);
    },
  });

  // Auto-scroll to bottom of messages
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

      eventSource.addEventListener("error", (event) => {
        console.error("SSE Error:", event);
        setStreamingMessage(null);
        eventSource.close();
        // Fall back to regular mutation
        chatMutation.mutate({ conversationId: selectedConversation, message });
      });

    } catch (error) {
      console.error("Streaming error:", error);
      setStreamingMessage(null);
      // Fall back to regular mutation
      chatMutation.mutate({ conversationId: selectedConversation, message });
    }
  }, [messageInput, selectedConversation, user, chatMutation, conversationQuery]);

  const handleSendMessage = () => {
    if (!messageInput.trim() || !selectedConversation) return;
    // Try streaming first, fall back to regular mutation
    handleStreamingChat();
  };

  const handleNewConversation = () => {
    createConversationMutation.mutate({});
  };

  const handleIngestDocument = () => {
    if (!newDocTitle.trim() || !newDocContent.trim()) {
      toast.error("Title and content are required");
      return;
    }
    ingestDocumentMutation.mutate({
      title: newDocTitle.trim(),
      content: newDocContent.trim(),
      tags: newDocTags.split(",").map(t => t.trim()).filter(Boolean),
      sourceType: "text",
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    if (!SUPPORTED_EXTENSIONS.includes(ext)) {
      toast.error(`Unsupported file type. Supported: ${SUPPORTED_EXTENSIONS.join(", ")}`);
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File too large. Maximum size is 10MB.");
      return;
    }

    setSelectedFile(file);
  };

  const handleFileUpload = async () => {
    if (!selectedFile) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      uploadFileMutation.mutate({
        filename: selectedFile.name,
        content: base64,
        tags: newDocTags.split(",").map(t => t.trim()).filter(Boolean),
      });
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleSearch = () => {
    if (searchQuery.length > 2) {
      setIsSearching(true);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>Please log in to access the Knowledge Base.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const conversations = conversationsQuery.data || [];
  const documents = documentsQuery.data || [];
  const currentConversation = conversationQuery.data;
  const messages = (currentConversation?.messages || []) as Message[];
  const searchResults = searchConversationsQuery.data;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/30">
                <Brain className="h-6 w-6 text-cyan-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Knowledge Base</h1>
                <p className="text-sm text-slate-400">AI-powered documentation assistant</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-cyan-500/30 text-cyan-400">
                <Database className="h-3 w-3 mr-1" />
                {documents.length} Documents
              </Badge>
              <Badge variant="outline" className="border-purple-500/30 text-purple-400">
                <Hash className="h-3 w-3 mr-1" />
                {documents.reduce((acc, d) => acc + d.chunkCount, 0)} Chunks
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-slate-800/50 border border-slate-700">
            <TabsTrigger value="chat" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">
              <MessageSquare className="h-4 w-4 mr-2" />
              Chat
            </TabsTrigger>
            <TabsTrigger value="documents" className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400">
              <FileText className="h-4 w-4 mr-2" />
              Documents
            </TabsTrigger>
            <TabsTrigger value="search" className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400">
              <Search className="h-4 w-4 mr-2" />
              Search
            </TabsTrigger>
          </TabsList>

          {/* Chat Tab */}
          <TabsContent value="chat" className="space-y-0">
            <div className="grid grid-cols-12 gap-4 h-[calc(100vh-220px)]">
              {/* Conversations Sidebar */}
              <div className="col-span-3 bg-slate-900/50 rounded-lg border border-slate-800 flex flex-col">
                <div className="p-3 border-b border-slate-800">
                  <Button
                    onClick={handleNewConversation}
                    className="w-full bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500"
                    disabled={createConversationMutation.isPending}
                  >
                    {createConversationMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4 mr-2" />
                    )}
                    New Conversation
                  </Button>
                </div>
                <ScrollArea className="flex-1">
                  <div className="p-2 space-y-1">
                    {conversations.map((conv: Conversation) => (
                      <button
                        key={conv.id}
                        onClick={() => setSelectedConversation(conv.id)}
                        className={`w-full text-left p-3 rounded-lg transition-all ${
                          selectedConversation === conv.id
                            ? "bg-cyan-500/20 border border-cyan-500/30"
                            : "hover:bg-slate-800/50 border border-transparent"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <span className="text-sm font-medium text-white truncate flex-1">
                            {conv.title || "New Conversation"}
                          </span>
                          <ChevronRight className={`h-4 w-4 text-slate-500 transition-transform ${
                            selectedConversation === conv.id ? "rotate-90" : ""
                          }`} />
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-slate-500">
                            {conv.messageCount} messages
                          </span>
                          <span className="text-xs text-slate-600">•</span>
                          <span className="text-xs text-slate-500">
                            {new Date(conv.updatedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </button>
                    ))}
                    {conversations.length === 0 && (
                      <div className="text-center py-8 text-slate-500">
                        <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No conversations yet</p>
                        <p className="text-xs mt-1">Start a new one above</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>

              {/* Chat Area */}
              <div className="col-span-9 bg-slate-900/50 rounded-lg border border-slate-800 flex flex-col">
                {selectedConversation ? (
                  <>
                    {/* Chat Header */}
                    <div className="p-3 border-b border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-cyan-400" />
                        <span className="font-medium text-white">
                          {currentConversation?.title || "New Conversation"}
                        </span>
                        {streamingMessage?.isStreaming && (
                          <Badge variant="outline" className="border-green-500/30 text-green-400 animate-pulse">
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            Streaming
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => archiveConversationMutation.mutate({ conversationId: selectedConversation })}
                          className="text-slate-400 hover:text-yellow-400"
                        >
                          <Archive className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteConversationMutation.mutate({ conversationId: selectedConversation })}
                          className="text-slate-400 hover:text-red-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Messages */}
                    <ScrollArea className="flex-1 p-4">
                      <div className="space-y-4">
                        {messages.length === 0 && !streamingMessage && (
                          <div className="text-center py-12">
                            <Brain className="h-12 w-12 mx-auto mb-4 text-cyan-500/50" />
                            <h3 className="text-lg font-medium text-white mb-2">Ask me anything</h3>
                            <p className="text-slate-400 text-sm max-w-md mx-auto">
                              I can help you understand the system's workflows, architecture, and features.
                              Start by asking a question about the documentation.
                            </p>
                          </div>
                        )}
                        {messages.map((msg) => (
                          <div
                            key={msg.id}
                            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={`max-w-[80%] rounded-lg p-4 ${
                                msg.role === "user"
                                  ? "bg-cyan-600/20 border border-cyan-500/30"
                                  : "bg-slate-800/50 border border-slate-700"
                              }`}
                            >
                              <div className="prose prose-invert prose-sm max-w-none">
                                <Streamdown>{msg.content}</Streamdown>
                              </div>
                              
                              {/* Sources for assistant messages */}
                              {msg.role === "assistant" && msg.retrievedChunks && msg.retrievedChunks.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-slate-700">
                                  <button
                                    onClick={() => setShowSources(showSources === msg.id ? null : msg.id)}
                                    className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                                  >
                                    <BookOpen className="h-3 w-3" />
                                    {showSources === msg.id ? "Hide" : "Show"} {msg.retrievedChunks.length} sources
                                  </button>
                                  {showSources === msg.id && (
                                    <div className="mt-2 space-y-2">
                                      {msg.retrievedChunks.map((chunk, i) => (
                                        <div
                                          key={chunk.chunkId}
                                          className="bg-slate-900/50 rounded p-2 text-xs"
                                        >
                                          <div className="flex items-center justify-between mb-1">
                                            <span className="text-cyan-400 font-medium">
                                              [{i + 1}] {chunk.documentTitle}
                                            </span>
                                            <Badge variant="outline" className="text-[10px] border-slate-600">
                                              {(chunk.similarity * 100).toFixed(0)}% match
                                            </Badge>
                                          </div>
                                          {chunk.sectionTitle && (
                                            <span className="text-slate-500 block mb-1">
                                              Section: {chunk.sectionTitle}
                                            </span>
                                          )}
                                          <p className="text-slate-400 line-clamp-2">{chunk.content}</p>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Feedback for assistant messages */}
                              {msg.role === "assistant" && (
                                <div className="mt-2 flex items-center gap-2">
                                  <button
                                    onClick={() => feedbackMutation.mutate({ messageId: msg.id, feedback: "positive" })}
                                    className={`p-1 rounded transition-colors ${
                                      msg.feedback === "positive"
                                        ? "text-green-400 bg-green-500/20"
                                        : "text-slate-500 hover:text-green-400"
                                    }`}
                                  >
                                    <ThumbsUp className="h-3 w-3" />
                                  </button>
                                  <button
                                    onClick={() => feedbackMutation.mutate({ messageId: msg.id, feedback: "negative" })}
                                    className={`p-1 rounded transition-colors ${
                                      msg.feedback === "negative"
                                        ? "text-red-400 bg-red-500/20"
                                        : "text-slate-500 hover:text-red-400"
                                    }`}
                                  >
                                    <ThumbsDown className="h-3 w-3" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                        
                        {/* Streaming message */}
                        {streamingMessage && (
                          <div className="flex justify-start">
                            <div className="max-w-[80%] rounded-lg p-4 bg-slate-800/50 border border-slate-700">
                              {streamingMessage.sources && streamingMessage.sources.length > 0 && (
                                <div className="mb-3 pb-3 border-b border-slate-700">
                                  <span className="text-xs text-cyan-400 flex items-center gap-1">
                                    <BookOpen className="h-3 w-3" />
                                    Found {streamingMessage.sources.length} relevant sources
                                  </span>
                                </div>
                              )}
                              <div className="prose prose-invert prose-sm max-w-none">
                                {streamingMessage.content ? (
                                  <Streamdown>{streamingMessage.content}</Streamdown>
                                ) : (
                                  <div className="flex items-center gap-2 text-slate-400">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span className="text-sm">Thinking...</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {chatMutation.isPending && !streamingMessage && (
                          <div className="flex justify-start">
                            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                              <div className="flex items-center gap-2 text-slate-400">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span className="text-sm">Thinking...</span>
                              </div>
                            </div>
                          </div>
                        )}
                        <div ref={messagesEndRef} />
                      </div>
                    </ScrollArea>

                    {/* Input Area */}
                    <div className="p-4 border-t border-slate-800">
                      <div className="flex gap-2">
                        <Input
                          value={messageInput}
                          onChange={(e) => setMessageInput(e.target.value)}
                          placeholder="Ask about workflows, architecture, features..."
                          className="flex-1 bg-slate-800/50 border-slate-700 focus:border-cyan-500"
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
                          className="bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500"
                        >
                          {chatMutation.isPending || streamingMessage?.isStreaming ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <MessageSquare className="h-16 w-16 mx-auto mb-4 text-slate-600" />
                      <h3 className="text-lg font-medium text-white mb-2">Select a conversation</h3>
                      <p className="text-slate-400 text-sm mb-4">
                        Or start a new one to begin chatting with the knowledge base
                      </p>
                      <Button
                        onClick={handleNewConversation}
                        className="bg-gradient-to-r from-cyan-600 to-purple-600"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        New Conversation
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">Knowledge Base Documents</h2>
                <p className="text-sm text-slate-400">Manage documents in your AI knowledge base</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => ingestSystemDocsMutation.mutate()}
                  disabled={ingestSystemDocsMutation.isPending}
                  className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
                >
                  {ingestSystemDocsMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Zap className="h-4 w-4 mr-2" />
                  )}
                  Load System Docs
                </Button>
                <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-gradient-to-r from-cyan-600 to-purple-600">
                      <Upload className="h-4 w-4 mr-2" />
                      Add Document
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-slate-900 border-slate-700 max-w-lg">
                    <DialogHeader>
                      <DialogTitle className="text-white">Add Document to Knowledge Base</DialogTitle>
                    </DialogHeader>
                    
                    {/* Upload Mode Toggle */}
                    <div className="flex gap-2 mb-4">
                      <Button
                        variant={uploadMode === "text" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setUploadMode("text")}
                        className={uploadMode === "text" ? "bg-cyan-600" : "border-slate-600"}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Paste Text
                      </Button>
                      <Button
                        variant={uploadMode === "file" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setUploadMode("file")}
                        className={uploadMode === "file" ? "bg-cyan-600" : "border-slate-600"}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Upload File
                      </Button>
                    </div>

                    {uploadMode === "text" ? (
                      <div className="space-y-4 py-2">
                        <div>
                          <label className="text-sm text-slate-400 mb-1 block">Title</label>
                          <Input
                            value={newDocTitle}
                            onChange={(e) => setNewDocTitle(e.target.value)}
                            placeholder="Document title"
                            className="bg-slate-800 border-slate-700"
                          />
                        </div>
                        <div>
                          <label className="text-sm text-slate-400 mb-1 block">Content</label>
                          <Textarea
                            value={newDocContent}
                            onChange={(e) => setNewDocContent(e.target.value)}
                            placeholder="Paste your document content here..."
                            className="bg-slate-800 border-slate-700 min-h-[200px]"
                          />
                        </div>
                        <div>
                          <label className="text-sm text-slate-400 mb-1 block">Tags (comma-separated)</label>
                          <Input
                            value={newDocTags}
                            onChange={(e) => setNewDocTags(e.target.value)}
                            placeholder="workflow, architecture, api"
                            className="bg-slate-800 border-slate-700"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4 py-2">
                        <div
                          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                            selectedFile ? "border-cyan-500/50 bg-cyan-500/10" : "border-slate-700 hover:border-slate-600"
                          }`}
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept={SUPPORTED_EXTENSIONS.join(",")}
                            onChange={handleFileSelect}
                            className="hidden"
                          />
                          {selectedFile ? (
                            <div className="flex items-center justify-center gap-3">
                              {getFileIcon(selectedFile.name)}
                              <div className="text-left">
                                <p className="text-white font-medium">{selectedFile.name}</p>
                                <p className="text-sm text-slate-400">
                                  {(selectedFile.size / 1024).toFixed(1)} KB
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedFile(null);
                                }}
                                className="text-slate-400 hover:text-red-400"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <>
                              <Upload className="h-10 w-10 mx-auto mb-3 text-slate-500" />
                              <p className="text-white mb-1">Click to upload or drag and drop</p>
                              <p className="text-sm text-slate-400">
                                PDF, Markdown, Code files (max 10MB)
                              </p>
                            </>
                          )}
                        </div>
                        <div>
                          <label className="text-sm text-slate-400 mb-1 block">Tags (comma-separated)</label>
                          <Input
                            value={newDocTags}
                            onChange={(e) => setNewDocTags(e.target.value)}
                            placeholder="workflow, architecture, api"
                            className="bg-slate-800 border-slate-700"
                          />
                        </div>
                        <div className="text-xs text-slate-500">
                          <p className="font-medium mb-1">Supported formats:</p>
                          <p>Documents: .pdf, .md, .txt</p>
                          <p>Code: .ts, .tsx, .js, .jsx, .py, .json, .yaml, .html, .css, .sql, .sh</p>
                        </div>
                      </div>
                    )}

                    <DialogFooter>
                      <Button variant="ghost" onClick={() => {
                        setUploadDialogOpen(false);
                        setSelectedFile(null);
                      }}>
                        Cancel
                      </Button>
                      {uploadMode === "text" ? (
                        <Button
                          onClick={handleIngestDocument}
                          disabled={ingestDocumentMutation.isPending}
                          className="bg-gradient-to-r from-cyan-600 to-purple-600"
                        >
                          {ingestDocumentMutation.isPending ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Upload className="h-4 w-4 mr-2" />
                          )}
                          Ingest Document
                        </Button>
                      ) : (
                        <Button
                          onClick={handleFileUpload}
                          disabled={!selectedFile || uploadFileMutation.isPending}
                          className="bg-gradient-to-r from-cyan-600 to-purple-600"
                        >
                          {uploadFileMutation.isPending ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Upload className="h-4 w-4 mr-2" />
                          )}
                          Upload File
                        </Button>
                      )}
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <div className="grid gap-4">
              {documents.map((doc: Document) => (
                <Card key={doc.id} className="bg-slate-900/50 border-slate-800">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-purple-500/20 border border-purple-500/30">
                          {doc.source.startsWith("file://") ? (
                            getFileIcon(doc.source.replace("file://", ""))
                          ) : (
                            <FileText className="h-5 w-5 text-purple-400" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-medium text-white">{doc.title}</h3>
                          <div className="flex items-center gap-3 mt-1 text-sm text-slate-400">
                            <span className="flex items-center gap-1">
                              <Hash className="h-3 w-3" />
                              {doc.chunkCount} chunks
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(doc.createdAt).toLocaleDateString()}
                            </span>
                            {doc.source.startsWith("file://") && (
                              <Badge variant="outline" className="text-xs border-cyan-500/30 text-cyan-400">
                                {doc.source.replace("file://", "")}
                              </Badge>
                            )}
                          </div>
                          {doc.tags && doc.tags.length > 0 && (
                            <div className="flex gap-1 mt-2">
                              {doc.tags.map((tag) => (
                                <Badge key={tag} variant="outline" className="text-xs border-slate-600">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={
                            doc.status === "indexed"
                              ? "border-green-500/30 text-green-400"
                              : doc.status === "processing"
                              ? "border-yellow-500/30 text-yellow-400"
                              : "border-red-500/30 text-red-400"
                          }
                        >
                          {doc.status}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteDocumentMutation.mutate({ documentId: doc.id })}
                          className="text-slate-400 hover:text-red-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {documents.length === 0 && (
                <Card className="bg-slate-900/50 border-slate-800">
                  <CardContent className="py-12 text-center">
                    <Database className="h-12 w-12 mx-auto mb-4 text-slate-600" />
                    <h3 className="text-lg font-medium text-white mb-2">No documents yet</h3>
                    <p className="text-slate-400 text-sm mb-4">
                      Add documents to build your knowledge base
                    </p>
                    <div className="flex justify-center gap-2">
                      <Button
                        variant="outline"
                        onClick={() => ingestSystemDocsMutation.mutate()}
                        disabled={ingestSystemDocsMutation.isPending}
                        className="border-purple-500/30 text-purple-400"
                      >
                        <Zap className="h-4 w-4 mr-2" />
                        Load System Docs
                      </Button>
                      <Button
                        onClick={() => setUploadDialogOpen(true)}
                        className="bg-gradient-to-r from-cyan-600 to-purple-600"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Add Document
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Search Tab */}
          <TabsContent value="search" className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-white mb-2">Search Conversations</h2>
              <p className="text-sm text-slate-400 mb-4">Find messages across all your conversations</p>
              
              <div className="flex gap-2 mb-6">
                <Input
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setIsSearching(false);
                  }}
                  placeholder="Search for keywords, topics, or questions..."
                  className="flex-1 bg-slate-800/50 border-slate-700 focus:border-green-500"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSearch();
                    }
                  }}
                />
                <Button
                  onClick={handleSearch}
                  disabled={searchQuery.length < 3}
                  className="bg-gradient-to-r from-green-600 to-cyan-600"
                >
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </Button>
              </div>

              {searchConversationsQuery.isLoading && (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-green-500" />
                  <p className="text-slate-400 mt-2">Searching...</p>
                </div>
              )}

              {searchResults && (
                <div className="space-y-4">
                  <p className="text-sm text-slate-400">
                    Found {searchResults.totalMatches} matches in {searchResults.conversations.length} conversations
                  </p>
                  
                  {searchResults.conversations.map((conv) => (
                    <Card key={conv.id} className="bg-slate-900/50 border-slate-800">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base text-white">
                            {conv.title || "Untitled Conversation"}
                          </CardTitle>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedConversation(conv.id);
                              setActiveTab("chat");
                            }}
                            className="text-cyan-400 hover:text-cyan-300"
                          >
                            Open
                            <ChevronRight className="h-4 w-4 ml-1" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-2">
                          {conv.matchedMessages.map((msg) => (
                            <div
                              key={msg.id}
                              className="bg-slate-800/50 rounded p-3 text-sm"
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className={
                                  msg.role === "user" 
                                    ? "border-cyan-500/30 text-cyan-400" 
                                    : "border-purple-500/30 text-purple-400"
                                }>
                                  {msg.role}
                                </Badge>
                                <span className="text-xs text-slate-500">
                                  {new Date(msg.createdAt).toLocaleString()}
                                </span>
                              </div>
                              <p className="text-slate-300">{msg.content}</p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {searchResults.conversations.length === 0 && (
                    <div className="text-center py-8">
                      <Search className="h-12 w-12 mx-auto mb-4 text-slate-600" />
                      <h3 className="text-lg font-medium text-white mb-2">No results found</h3>
                      <p className="text-slate-400 text-sm">
                        Try different keywords or check your spelling
                      </p>
                    </div>
                  )}
                </div>
              )}

              {!isSearching && !searchResults && (
                <div className="text-center py-12">
                  <Search className="h-16 w-16 mx-auto mb-4 text-slate-600" />
                  <h3 className="text-lg font-medium text-white mb-2">Search your conversations</h3>
                  <p className="text-slate-400 text-sm max-w-md mx-auto">
                    Enter at least 3 characters to search through all your RAG conversations and find relevant messages.
                  </p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
