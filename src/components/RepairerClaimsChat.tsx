import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Message {
  id: string;
  content: string;
  role: string;
  created_at: string;
}

interface RepairerClaimsChatProps {
  claimId: string;
  serviceRequestId?: string;
  userRole: "repairer_agent" | "claims_agent" | "retail_agent" | "admin";
  onServiceRequestCreated?: (serviceRequestId: string) => void;
}

export default function RepairerClaimsChat({
  claimId,
  serviceRequestId,
  userRole,
  onServiceRequestCreated,
}: RepairerClaimsChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentServiceRequestId, setCurrentServiceRequestId] = useState<string | null>(
    serviceRequestId || null
  );
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadOrCreateServiceRequest();
  }, [claimId]);

  useEffect(() => {
    if (currentServiceRequestId) {
      loadMessages();
      
      // Subscribe to new messages
      const channel = supabase
        .channel(`service_request_${currentServiceRequestId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "service_request_messages",
            filter: `service_request_id=eq.${currentServiceRequestId}`,
          },
          (payload) => {
            setMessages((prev) => [...prev, payload.new as Message]);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [currentServiceRequestId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  };

  const loadOrCreateServiceRequest = async () => {
    try {
      // First try to find existing service request for this claim
      const { data: existingRequest, error: fetchError } = await supabase
        .from("service_requests")
        .select("id")
        .eq("claim_id", claimId)
        .eq("reason", "repairer_communication")
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existingRequest) {
        setCurrentServiceRequestId(existingRequest.id);
      } else {
        // Create new service request for communication
        const { data: claim } = await supabase
          .from("claims")
          .select("policies(customer_name, customer_email, policy_number)")
          .eq("id", claimId)
          .single();

        const policy = claim?.policies as any;

        const { data: newRequest, error: createError } = await supabase
          .from("service_requests")
          .insert({
            claim_id: claimId,
            customer_name: policy?.customer_name || "Customer",
            customer_email: policy?.customer_email || "unknown@email.com",
            reason: "repairer_communication",
            details: "Communication channel for repairer and claims team",
            status: "open",
          })
          .select()
          .single();

        if (createError) throw createError;

        setCurrentServiceRequestId(newRequest.id);
        if (onServiceRequestCreated) {
          onServiceRequestCreated(newRequest.id);
        }
      }
    } catch (error: any) {
      console.error("Failed to load/create service request:", error);
      toast.error("Failed to initialize chat");
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async () => {
    if (!currentServiceRequestId) return;

    try {
      const { data, error } = await supabase
        .from("service_request_messages")
        .select("*")
        .eq("service_request_id", currentServiceRequestId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error: any) {
      console.error("Failed to load messages:", error);
      toast.error("Failed to load messages");
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !currentServiceRequestId) return;

    setSending(true);
    try {
      const { error } = await supabase
        .from("service_request_messages")
        .insert({
          service_request_id: currentServiceRequestId,
          content: input.trim(),
          role: userRole,
        });

      if (error) throw error;

      // Update last activity
      await supabase
        .from("service_requests")
        .update({ last_activity_at: new Date().toISOString() })
        .eq("id", currentServiceRequestId);

      setInput("");
    } catch (error: any) {
      console.error("Failed to send message:", error);
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      repairer_agent: "Repairer",
      claims_agent: "Claims Agent",
      retail_agent: "Retail Agent",
      admin: "Admin",
      user: "Customer",
    };
    return labels[role] || role;
  };

  const getRoleBadgeVariant = (role: string) => {
    if (role === "repairer_agent") return "default";
    if (role.includes("agent") || role === "admin") return "secondary";
    return "outline";
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Repairer-Claims Communication
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col space-y-4 p-4">
        <ScrollArea ref={scrollRef} className="flex-1 pr-4 h-[400px]">
          <div className="space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-20" />
                <p>No messages yet. Start the conversation!</p>
              </div>
            )}
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === userRole ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] space-y-1 ${
                    message.role === userRole ? "items-end" : "items-start"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Badge variant={getRoleBadgeVariant(message.role)} className="text-xs">
                      {getRoleLabel(message.role)}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(message.created_at), "HH:mm")}
                    </span>
                  </div>
                  <div
                    className={`rounded-lg px-4 py-2 ${
                      message.role === userRole
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            disabled={sending}
          />
          <Button onClick={sendMessage} disabled={sending || !input.trim()}>
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
