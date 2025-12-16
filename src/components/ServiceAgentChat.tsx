import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Bot, User, Send, Loader2, CheckCircle, Search, FileText } from "lucide-react";
import { toast } from "sonner";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ServiceRequest {
  customer_name: string;
  customer_email: string;
  policy_number?: string;
  reason: string;
  details: string;
  conversation_summary: string;
  portal_context?: string;
}

interface ServiceAgentChatProps {
  onServiceRequestCaptured: (request: ServiceRequest, messages: Message[]) => void;
}

export default function ServiceAgentChat({ onServiceRequestCaptured }: ServiceAgentChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hi! I'm your AI assistant. I can help you with MediaMarkt products, portal navigation, policies, and more. How can I help you today?"
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [capturedRequest, setCapturedRequest] = useState<ServiceRequest | null>(null);
  const [toolStatus, setToolStatus] = useState<{ type: string; message: string } | null>(null);
  const [currentPortal, setCurrentPortal] = useState<'customer' | 'retail' | 'config'>('retail');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith('/retail')) {
      setCurrentPortal('retail');
    } else if (path.startsWith('/program-configuration')) {
      setCurrentPortal('config');
    } else {
      setCurrentPortal('customer');
    }
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages]);

  const streamChat = async (userMessage: string) => {
    const newMessages = [...messages, { role: "user" as const, content: userMessage }];
    setMessages(newMessages);
    setIsLoading(true);
    setToolStatus(null);

    let assistantMessage = "";
    let toolCallBuffer = "";
    let isCapturingToolCall = false;

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/service-agent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ 
            messages: newMessages,
            context: {
              portal: currentPortal,
              currentPage: window.location.pathname
            }
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to get response from AI");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader available");

      const decoder = new TextDecoder();
      let textBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta;

            if (delta?.content) {
              assistantMessage += delta.content;
              setMessages([
                ...newMessages,
                { role: "assistant", content: assistantMessage }
              ]);
            }

            if (delta?.tool_calls) {
              const toolCall = delta.tool_calls[0];
              
              if (toolCall?.function?.name) {
                const functionName = toolCall.function.name;
                
                if (functionName === "search_mediamarkt") {
                  setToolStatus({ type: "search", message: "🔍 Searching MediaMarkt..." });
                } else if (functionName === "capture_service_request") {
                  setToolStatus({ type: "capture", message: "📝 Preparing service request..." });
                }
              }
              
              if (toolCall?.function?.arguments) {
                toolCallBuffer += toolCall.function.arguments;
                isCapturingToolCall = true;
              }
            }

            if (parsed.choices?.[0]?.finish_reason === "tool_calls" && isCapturingToolCall) {
              try {
                const toolArgs = JSON.parse(toolCallBuffer);
                
                // Handle capture_service_request
                if (toolArgs.customer_name && toolArgs.customer_email) {
                  setCapturedRequest(toolArgs);
                  onServiceRequestCaptured(toolArgs, newMessages);
                  toast.success("Service request captured successfully!");
                  setToolStatus(null);
                  toolCallBuffer = "";
                  isCapturingToolCall = false;
                }
                // Handle search_mediamarkt - send mock results back to AI
                else if (toolArgs.search_query) {
                  setToolStatus({ type: "search", message: "📱 Found products, analyzing..." });
                  
                  // Mock search results
                  const mockResults = `Found Samsung products:
- Samsung Galaxy S24 Ultra - €1,199
- Samsung Galaxy S24 - €899
- Samsung Galaxy A54 - €449
- Samsung Galaxy Z Flip5 - €1,099`;
                  
                  // Send tool results back to AI for explanation
                  const messagesWithToolResult = [
                    ...newMessages,
                    { role: "assistant" as const, content: assistantMessage || "Searching..." },
                    { role: "user" as const, content: `Tool results: ${mockResults}\n\nPlease explain these results to the user in a friendly way.` }
                  ];
                  
                  // Clear the tool call buffer
                  toolCallBuffer = "";
                  isCapturingToolCall = false;
                  
                  // Make follow-up request to get AI's explanation
                  setTimeout(async () => {
                    setToolStatus(null);
                    assistantMessage = "";
                    
                    const followUpResponse = await fetch(
                      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/service-agent`,
                      {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
                        },
                        body: JSON.stringify({ 
                          messages: messagesWithToolResult,
                          context: {
                            portal: currentPortal,
                            currentPage: window.location.pathname
                          }
                        }),
                      }
                    );
                    
                    if (followUpResponse.ok && followUpResponse.body) {
                      const followUpReader = followUpResponse.body.getReader();
                      const followUpDecoder = new TextDecoder();
                      let followUpBuffer = "";
                      
                      while (true) {
                        const { done, value } = await followUpReader.read();
                        if (done) break;
                        
                        followUpBuffer += followUpDecoder.decode(value, { stream: true });
                        
                        let newlineIdx;
                        while ((newlineIdx = followUpBuffer.indexOf("\n")) !== -1) {
                          let line = followUpBuffer.slice(0, newlineIdx);
                          followUpBuffer = followUpBuffer.slice(newlineIdx + 1);
                          
                          if (line.endsWith("\r")) line = line.slice(0, -1);
                          if (line.startsWith(":") || line.trim() === "") continue;
                          if (!line.startsWith("data: ")) continue;
                          
                          const jsonStr = line.slice(6).trim();
                          if (jsonStr === "[DONE]") break;
                          
                          try {
                            const parsed = JSON.parse(jsonStr);
                            const delta = parsed.choices?.[0]?.delta;
                            
                            if (delta?.content) {
                              assistantMessage += delta.content;
                              setMessages([
                                ...messagesWithToolResult.slice(0, -1),
                                { role: "assistant", content: assistantMessage }
                              ]);
                            }
                          } catch (e) {
                            console.error("Error parsing follow-up JSON:", e);
                          }
                        }
                      }
                    }
                  }, 500);
                  
                  // Don't clear buffers here, we do it above
                  return;
                }
              } catch (e) {
                console.error("Error parsing tool call:", e);
              }
              toolCallBuffer = "";
              isCapturingToolCall = false;
            }
          } catch (e) {
            console.error("Error parsing JSON:", e);
          }
        }
      }

      setTimeout(() => setToolStatus(null), 1000);
    } catch (error) {
      console.error("Chat error:", error);
      toast.error("Failed to get response. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    streamChat(input);
    setInput("");
  };

  return (
    <Card className="w-full h-[600px] flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            AI Assistant
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            {currentPortal === 'retail' ? 'Retail Portal' : 
             currentPortal === 'config' ? 'Configuration' : 
             'Customer Portal'}
          </Badge>
        </div>
        <CardDescription>
          Ask me about MediaMarkt products, policies, or portal navigation
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        <ScrollArea className="flex-1 px-4" ref={scrollRef}>
          <div className="space-y-4 py-4">
            {capturedRequest && (
              <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-green-800">
                  <p className="font-medium">Service request captured successfully!</p>
                  <p className="text-green-700">We'll get back to you shortly.</p>
                </div>
              </div>
            )}
            
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {message.role === "assistant" && (
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
                {message.role === "user" && (
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                    <User className="h-4 w-4 text-primary-foreground" />
                  </div>
                )}
              </div>
            ))}
            
            {toolStatus && (
              <div className="flex items-center gap-2 text-muted-foreground animate-pulse">
                {toolStatus.type === 'search' && <Search className="h-4 w-4" />}
                {toolStatus.type === 'capture' && <FileText className="h-4 w-4" />}
                <span className="text-sm">{toolStatus.message}</span>
              </div>
            )}
            
            {isLoading && !toolStatus && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Thinking...</span>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <form onSubmit={handleSubmit} className="p-4 border-t">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button type="submit" disabled={isLoading || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
