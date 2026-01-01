/**
 * RAG Streaming Service
 * Provides Server-Sent Events (SSE) for streaming RAG chat responses
 */

import { Response } from "express";
import { invokeLLM } from "./_core/llm";
import * as rag from "./rag";

export interface StreamingChatRequest {
  userId: number;
  conversationId: number;
  message: string;
}

/**
 * Stream RAG chat response using Server-Sent Events
 */
export async function streamRagChat(
  res: Response,
  request: StreamingChatRequest
): Promise<void> {
  const { userId, conversationId, message } = request;
  
  // Set up SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // Disable nginx buffering
  
  // Helper to send SSE events
  const sendEvent = (event: string, data: unknown) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };
  
  try {
    // Send start event
    sendEvent("start", { conversationId, timestamp: Date.now() });
    
    // Perform semantic search to get relevant context
    sendEvent("status", { phase: "searching", message: "Searching knowledge base..." });
    
    const searchResults = await rag.semanticSearch(userId, message, 5);
    
    // Send retrieved sources
    sendEvent("sources", {
      chunks: searchResults.chunks.map(c => ({
        documentTitle: c.documentTitle,
        content: c.content.slice(0, 200) + (c.content.length > 200 ? "..." : ""),
        similarity: c.similarity,
      })),
    });
    
    // Build context from retrieved chunks
    const context = searchResults.chunks.length > 0
      ? searchResults.chunks.map((chunk, i) => 
          `[Source ${i + 1}: ${chunk.documentTitle}]\n${chunk.content}`
        ).join("\n\n---\n\n")
      : "No relevant context found in the knowledge base.";
    
    // Get conversation history
    const conversation = await rag.getConversation(conversationId, userId);
    if (!conversation) {
      sendEvent("error", { message: "Conversation not found" });
      res.end();
      return;
    }
    
    // Build messages for LLM
    const systemPrompt = conversation.systemPrompt || `You are a helpful AI assistant with access to a knowledge base. 
Answer questions based on the provided context. If the context doesn't contain relevant information, 
say so and provide general knowledge if appropriate. Always cite sources when using information from the context.`;
    
    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: `${systemPrompt}\n\n## Knowledge Base Context:\n${context}` },
    ];
    
    // Add conversation history (last 10 messages)
    const recentMessages = conversation.messages.slice(-10);
    for (const msg of recentMessages) {
      messages.push({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      });
    }
    
    // Add current message
    messages.push({ role: "user", content: message });
    
    // Send status update
    sendEvent("status", { phase: "generating", message: "Generating response..." });
    
    // Call LLM (non-streaming for now, but we'll simulate streaming)
    const response = await invokeLLM({ messages });
    
    const rawContent = response.choices?.[0]?.message?.content;
    const assistantContent = typeof rawContent === "string" 
      ? rawContent 
      : "I apologize, but I couldn't generate a response.";
    
    // Simulate streaming by sending chunks
    const words = assistantContent.split(" ");
    let currentChunk = "";
    
    for (let i = 0; i < words.length; i++) {
      currentChunk += (i > 0 ? " " : "") + words[i];
      
      // Send chunk every few words
      if ((i + 1) % 3 === 0 || i === words.length - 1) {
        sendEvent("chunk", { 
          content: currentChunk,
          index: Math.floor(i / 3),
        });
        currentChunk = "";
        
        // Small delay to simulate streaming
        await new Promise(resolve => setTimeout(resolve, 20));
      }
    }
    
    // Save messages to database
    await rag.saveMessage(conversationId, "user", message as string);
    const assistantMessageId = await rag.saveMessage(conversationId, "assistant", assistantContent, {
      retrievedChunks: searchResults.chunks.map(c => c.chunkId),
    });
    
    // Log search for analytics
    await rag.logSearch(userId, message, searchResults.chunks.length);
    
    // Send completion event
    sendEvent("complete", {
      messageId: assistantMessageId,
      fullContent: assistantContent,
      sourcesUsed: searchResults.chunks.length,
      timestamp: Date.now(),
    });
    
  } catch (error) {
    console.error("[RAG Stream] Error:", error);
    sendEvent("error", {
      message: error instanceof Error ? error.message : "An error occurred",
    });
  } finally {
    res.end();
  }
}
