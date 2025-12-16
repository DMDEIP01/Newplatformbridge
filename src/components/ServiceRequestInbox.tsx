import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, Clock, Send, User, Bot, CheckCircle2, Search, FileText, Download, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface Document {
  id: string;
  file_name: string;
  file_path: string;
  uploaded_date: string;
}

interface Message {
  id: string;
  role: "user" | "assistant" | "agent";
  content: string;
  created_at: string;
  read_by_agent: boolean;
  documents?: Document[];
}

interface ServiceRequestWithMessages {
  id: string;
  request_reference: string;
  customer_name: string;
  customer_email: string;
  reason: string;
  details: string;
  status: string;
  created_at: string;
  last_activity_at: string;
  policy_id: string | null;
  unread_count: number;
  messages: Message[];
}

export default function ServiceRequestInbox() {
  const [requests, setRequests] = useState<ServiceRequestWithMessages[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequestWithMessages | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyMessage, setReplyMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadRequests();
    
    // Subscribe to new messages
    const channel = supabase
      .channel('service-request-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'service_request_messages'
        },
        () => {
          loadRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadRequests = async () => {
    try {
      // Fetch service requests
      const { data: requestsData, error: requestsError } = await supabase
        .from('service_requests')
        .select('*')
        .order('last_activity_at', { ascending: false });

      if (requestsError) throw requestsError;

      // Fetch messages for each request and count unread
      const requestsWithMessages = await Promise.all(
        (requestsData || []).map(async (request) => {
          const { data: messages, error: messagesError } = await supabase
            .from('service_request_messages')
            .select('*')
            .eq('service_request_id', request.id)
            .order('created_at', { ascending: true });

          if (messagesError) throw messagesError;

          // Fetch documents for this service request
          const { data: documents, error: docsError } = await supabase
            .from('documents')
            .select('*')
            .eq('service_request_id', request.id)
            .order('uploaded_date', { ascending: true });

          if (docsError) console.error('Error fetching documents:', docsError);

          // Attach documents to messages based on timestamp proximity
          const messagesWithDocs = (messages || []).map(msg => {
            const msgDocs = (documents || []).filter(doc => {
              const timeDiff = Math.abs(
                new Date(doc.uploaded_date).getTime() - 
                new Date(msg.created_at).getTime()
              );
              return timeDiff < 5000; // Within 5 seconds
            }).map(doc => ({
              id: doc.id,
              file_name: doc.file_name,
              file_path: doc.file_path,
              uploaded_date: doc.uploaded_date
            }));

            return {
              ...msg,
              role: msg.role as "user" | "assistant" | "agent",
              documents: msgDocs.length > 0 ? msgDocs : undefined
            };
          });

          const unreadCount = messages?.filter(m => !m.read_by_agent && m.role !== 'agent').length || 0;

          return {
            ...request,
            messages: messagesWithDocs,
            unread_count: unreadCount
          };
        })
      );

      // Sort by unread first, then by last activity
      const sorted = requestsWithMessages.sort((a, b) => {
        if (a.unread_count > 0 && b.unread_count === 0) return -1;
        if (a.unread_count === 0 && b.unread_count > 0) return 1;
        return new Date(b.last_activity_at).getTime() - new Date(a.last_activity_at).getTime();
      });

      setRequests(sorted);
    } catch (error) {
      console.error('Error loading requests:', error);
      toast.error("Failed to load service requests");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRequest = async (request: ServiceRequestWithMessages) => {
    setSelectedRequest(request);

    // Mark messages as read
    const unreadMessageIds = request.messages
      .filter(m => !m.read_by_agent && m.role !== 'agent')
      .map(m => m.id);

    if (unreadMessageIds.length > 0) {
      await supabase
        .from('service_request_messages')
        .update({ read_by_agent: true })
        .in('id', unreadMessageIds);

      loadRequests();
    }
  };

  const handleSendReply = async () => {
    if (!selectedRequest || !replyMessage.trim()) return;

    setSending(true);
    try {
      const { error } = await supabase
        .from('service_request_messages')
        .insert({
          service_request_id: selectedRequest.id,
          role: 'agent',
          content: replyMessage,
          read_by_agent: true
        });

      if (error) throw error;

      setReplyMessage("");
      toast.success("Reply sent successfully");
      
      // Reload to update the conversation
      await loadRequests();
      
      // Update selected request
      const updated = requests.find(r => r.id === selectedRequest.id);
      if (updated) {
        setSelectedRequest(updated);
      }
    } catch (error) {
      console.error('Error sending reply:', error);
      toast.error("Failed to send reply");
    } finally {
      setSending(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
      open: { variant: "destructive", label: "Open" },
      in_progress: { variant: "default", label: "In Progress" },
      resolved: { variant: "secondary", label: "Resolved" }
    };

    const config = statusConfig[status] || { variant: "outline" as const, label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const filteredRequests = requests.filter(r => 
    r.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.customer_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.request_reference.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Separate active and resolved requests
  const activeRequests = filteredRequests
    .filter(r => r.status !== 'resolved' && r.status !== 'closed')
    .sort((a, b) => {
      // Sort by status priority first (open > pending > other)
      const statusPriority: Record<string, number> = { open: 1, pending: 2 };
      const aPriority = statusPriority[a.status] || 3;
      const bPriority = statusPriority[b.status] || 3;
      
      if (aPriority !== bPriority) return aPriority - bPriority;
      
      // Then by age (oldest first)
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });

  const resolvedRequests = filteredRequests
    .filter(r => r.status === 'resolved' || r.status === 'closed')
    .sort((a, b) => new Date(b.last_activity_at).getTime() - new Date(a.last_activity_at).getTime());

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading inbox...</div>
      </div>
    );
  }

  const renderRequestsList = (requestList: ServiceRequestWithMessages[]) => (
    <ScrollArea className="h-[calc(100vh-24rem)]">
      {requestList.length === 0 ? (
        <div className="p-4 text-center text-muted-foreground">
          No service requests found
        </div>
      ) : (
        <div className="divide-y">
          {requestList.map((request) => {
            const ageHours = (Date.now() - new Date(request.created_at).getTime()) / (1000 * 60 * 60);
            const isOverdue = ageHours > 48 && request.status !== 'resolved' && request.status !== 'closed';
            
            return (
              <div
                key={request.id}
                onClick={() => handleSelectRequest(request)}
                className="p-4 cursor-pointer transition-colors hover:bg-accent/50 flex items-center gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <MessageSquare className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="font-medium text-sm">{request.request_reference}</span>
                    {request.unread_count > 0 && (
                      <Badge variant="destructive" className="h-5 min-w-5 rounded-full px-1.5 text-xs">
                        {request.unread_count}
                      </Badge>
                    )}
                    {getStatusBadge(request.status)}
                    {isOverdue && (
                      <Badge variant="destructive" className="text-xs">
                        Overdue
                      </Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Customer</p>
                      <p className="font-medium truncate">{request.customer_name}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Email</p>
                      <p className="truncate">{request.customer_email}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Reason</p>
                      <p className="truncate">{request.reason}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Last Activity</p>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span className="text-xs">
                          {formatDistanceToNow(new Date(request.last_activity_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </ScrollArea>
  );

  return (
    <>
      {/* Requests List - Full Width */}
      <Card>
        <CardHeader>
          <CardTitle>Service Requests</CardTitle>
          <CardDescription>
            {requests.filter(r => r.unread_count > 0).length} unread • {activeRequests.length} active • {resolvedRequests.length} resolved
          </CardDescription>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search requests..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Tabs defaultValue="active" className="w-full">
            <TabsList className="w-full justify-start rounded-none border-b px-4">
              <TabsTrigger value="active">
                Active ({activeRequests.length})
              </TabsTrigger>
              <TabsTrigger value="resolved">
                Resolved ({resolvedRequests.length})
              </TabsTrigger>
            </TabsList>
            <TabsContent value="active" className="mt-0">
              {renderRequestsList(activeRequests)}
            </TabsContent>
            <TabsContent value="resolved" className="mt-0">
              {renderRequestsList(resolvedRequests)}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Full Screen Conversation Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)}>
        <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0">
          {selectedRequest && (
            <>
              <DialogHeader className="px-6 pt-6 pb-4 border-b">
                <div className="flex items-start justify-between">
                  <div>
                    <DialogTitle className="text-2xl">{selectedRequest.request_reference}</DialogTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedRequest.customer_name} • {selectedRequest.customer_email}
                    </p>
                  </div>
                  {getStatusBadge(selectedRequest.status)}
                </div>
                <div className="mt-3 p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium">{selectedRequest.reason}</p>
                  <p className="text-sm text-muted-foreground mt-1">{selectedRequest.details}</p>
                </div>
              </DialogHeader>
              
              <div className="flex-1 overflow-hidden px-6 flex flex-col">
                <ScrollArea className="flex-1 pr-4 py-4">
                  <div className="space-y-4">
                    {selectedRequest.messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex gap-3 ${
                          message.role === 'agent' ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        {message.role !== 'agent' && (
                          <div className="flex-shrink-0">
                            {message.role === 'user' ? (
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <User className="h-4 w-4 text-primary" />
                              </div>
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center">
                                <Bot className="h-4 w-4 text-secondary" />
                              </div>
                            )}
                          </div>
                        )}
                        <div
                          className={`rounded-lg p-3 max-w-[70%] ${
                            message.role === 'agent'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                          
                          {message.documents && message.documents.length > 0 && (
                            <div className="mt-3 space-y-2">
                              {message.documents.map((doc) => (
                                <div
                                  key={doc.id}
                                  className={`flex items-center gap-2 p-2 rounded border ${
                                    message.role === 'agent'
                                      ? 'bg-primary-foreground/10 border-primary-foreground/20'
                                      : 'bg-background border-border'
                                  }`}
                                >
                                  <FileText className="h-4 w-4 shrink-0" />
                                  <span className="text-sm flex-1 truncate">{doc.file_name}</span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0"
                                    onClick={async () => {
                                      try {
                                        const { data, error } = await supabase.storage
                                          .from("claim-documents")
                                          .download(doc.file_path);
                                        
                                        if (error) throw error;
                                        
                                        const url = URL.createObjectURL(data);
                                        const a = document.createElement("a");
                                        a.href = url;
                                        a.download = doc.file_name;
                                        document.body.appendChild(a);
                                        a.click();
                                        document.body.removeChild(a);
                                        URL.revokeObjectURL(url);
                                        toast.success("Document downloaded");
                                      } catch (error) {
                                        console.error("Error downloading file:", error);
                                        toast.error("Failed to download file");
                                      }
                                    }}
                                  >
                                    <Download className="h-3 w-3" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          <p className={`text-xs mt-1 ${
                            message.role === 'agent' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                          }`}>
                            {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                          </p>
                        </div>
                        {message.role === 'agent' && (
                          <div className="flex-shrink-0">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <CheckCircle2 className="h-4 w-4 text-primary" />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                <div className="flex gap-2 py-4 border-t">
                  <Input
                    placeholder="Type your reply..."
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendReply();
                      }
                    }}
                    disabled={sending}
                  />
                  <Button onClick={handleSendReply} disabled={sending || !replyMessage.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
