import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { MessageSquare, Send, Clock, CheckCircle2, User, HelpCircle, Paperclip, X, ArrowLeft, FileText, Download } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Message {
  id: string;
  content: string;
  sender: "user" | "support";
  timestamp: string;
  status?: "sent" | "delivered" | "read";
  documents?: Document[];
}

interface Document {
  id: string;
  file_name: string;
  file_path: string;
  uploaded_date: string;
}

interface ServiceRequest {
  id: string;
  subject: string;
  category: string;
  status: "open" | "in_progress" | "resolved";
  created_at: string;
  last_message: string;
  unread_count: number;
}

const categories = [
  { value: "policy", label: "Policy Questions" },
  { value: "claim", label: "Claim Support" },
  { value: "fulfillment", label: "Fulfillment Status" },
  { value: "payment", label: "Payment Issues" },
  { value: "general", label: "General Service" },
  { value: "other", label: "Other" },
];

export default function ServiceRequest() {
  const [activeRequest, setActiveRequest] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [subject, setSubject] = useState("");
  const [showNewRequestForm, setShowNewRequestForm] = useState(false);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchServiceRequests();
  }, []);

  const fetchServiceRequests = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch service requests for user's policies
      const { data, error } = await supabase
        .from("service_requests")
        .select(`
          *,
          policies!inner(user_id)
        `)
        .eq("policies.user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error("Error fetching service requests:", error);
      toast.error("Failed to load service requests");
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (activeRequest) {
      loadMessages(activeRequest);
      
      // Subscribe to real-time updates for this service request
      const channel = supabase
        .channel(`service-request-${activeRequest}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'service_request_messages',
            filter: `service_request_id=eq.${activeRequest}`
          },
          (payload) => {
            const newMsg = payload.new as any;
            const message: Message = {
              id: newMsg.id,
              content: newMsg.content,
              sender: newMsg.role === "user" ? "user" : "support",
              timestamp: newMsg.created_at,
              status: newMsg.read_by_agent ? "read" : "delivered",
            };
            setMessages((prev) => [...prev, message]);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [activeRequest]);

  const loadMessages = async (requestId: string) => {
    try {
      const { data, error } = await supabase
        .from("service_request_messages")
        .select("*")
        .eq("service_request_id", requestId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Fetch documents for this service request
      const { data: docsData, error: docsError } = await supabase
        .from("documents")
        .select("*")
        .eq("service_request_id", requestId)
        .order("uploaded_date", { ascending: true });

      if (docsError) throw docsError;

      const documentsMap = new Map<string, Document[]>();
      (docsData || []).forEach((doc: any) => {
        const msgTime = doc.uploaded_date;
        if (!documentsMap.has(msgTime)) {
          documentsMap.set(msgTime, []);
        }
        documentsMap.get(msgTime)?.push({
          id: doc.id,
          file_name: doc.file_name,
          file_path: doc.file_path,
          uploaded_date: doc.uploaded_date,
        });
      });

      const formattedMessages: Message[] = (data || []).map((msg: any) => {
        // Find documents uploaded around the same time as this message
        const msgDocs = (docsData || []).filter((doc: any) => {
          const timeDiff = Math.abs(new Date(doc.uploaded_date).getTime() - new Date(msg.created_at).getTime());
          return timeDiff < 5000; // Within 5 seconds
        }).map((doc: any) => ({
          id: doc.id,
          file_name: doc.file_name,
          file_path: doc.file_path,
          uploaded_date: doc.uploaded_date,
        }));

        return {
          id: msg.id,
          content: msg.content,
          sender: msg.role === "user" ? "user" : "support",
          timestamp: msg.created_at,
          status: msg.read_by_agent ? "read" : "delivered",
          documents: msgDocs.length > 0 ? msgDocs : undefined,
        };
      });

      setMessages(formattedMessages);
      setDocuments(docsData || []);
    } catch (error) {
      console.error("Error loading messages:", error);
      toast.error("Failed to load messages");
    }
  };

  const handleSendMessage = async () => {
    if ((!newMessage.trim() && selectedFiles.length === 0) || !activeRequest) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get the claim_id from the service request
      const currentRequest = requests.find((r) => r.id === activeRequest);
      const claimId = currentRequest?.claim_id;

      // Upload files first if any
      const uploadedFileUrls: string[] = [];
      if (selectedFiles.length > 0) {
        setUploadingFiles(true);
        for (const file of selectedFiles) {
          const fileName = `${user.id}/${Date.now()}-${file.name}`;
          const { error: uploadError } = await supabase.storage
            .from("claim-documents")
            .upload(fileName, file);

          if (uploadError) throw uploadError;

          // Save document record linked to both service request and claim
          const { error: docError } = await supabase
            .from("documents")
            .insert({
              user_id: user.id,
              service_request_id: activeRequest,
              claim_id: claimId || null,
              file_name: file.name,
              file_path: fileName,
              document_type: "other",
            });

          if (docError) throw docError;
          uploadedFileUrls.push(fileName);
        }
        setUploadingFiles(false);
      }

      // Send message
      const messageContent = newMessage.trim() || 
        (selectedFiles.length > 0 ? `Uploaded ${selectedFiles.length} document(s)` : "");

      const { error } = await supabase
        .from("service_request_messages")
        .insert({
          service_request_id: activeRequest,
          content: messageContent,
          role: "user",
        });

      if (error) throw error;

      // Update local messages
      const message: Message = {
        id: Date.now().toString(),
        content: messageContent,
        sender: "user",
        timestamp: new Date().toISOString(),
        status: "sent",
      };

      setMessages((prev) => [...prev, message]);
      setNewMessage("");
      setSelectedFiles([]);

      toast.success("Message sent successfully");
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    } finally {
      setUploadingFiles(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(files);
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreateRequest = async () => {
    if (!subject.trim() || !selectedCategory) {
      toast.error("Please fill in all fields");
      return;
    }

    const newRequest: ServiceRequest = {
      id: (requests.length + 1).toString(),
      subject: subject,
      category: selectedCategory,
      status: "open",
      created_at: new Date().toISOString(),
      last_message: "",
      unread_count: 0,
    };

    setRequests((prev) => [newRequest, ...prev]);
    setActiveRequest(newRequest.id);
    setShowNewRequestForm(false);
    setSubject("");
    setSelectedCategory("");
    setMessages([]);

    toast.success("Service request created", {
      description: "You can now send messages to our support team.",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-700">Open</Badge>;
      case "in_progress":
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-300 dark:border-yellow-700">In Progress</Badge>;
      case "resolved":
        return <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-300 dark:border-green-700">Resolved</Badge>;
      default:
        return null;
    }
  };

  const getCategoryLabel = (category: string) => {
    return categories.find((c) => c.value === category)?.label || category;
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday " + date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    } else {
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " " + date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    }
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Full screen chat view when request is selected */}
      {activeRequest ? (
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="border-b bg-background p-4">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveRequest(null)}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Requests
                </Button>
                <div className="border-l pl-4">
                  <h2 className="font-semibold">
                    {requests.find((r) => r.id === activeRequest)?.reason}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {requests.find((r) => r.id === activeRequest)?.request_reference}
                  </p>
                </div>
              </div>
              {getStatusBadge(requests.find((r) => r.id === activeRequest)?.status || "")}
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 bg-muted/20">
            <div className="max-w-4xl mx-auto p-4 space-y-4">
              {/* Service Request Details - Always shown at top */}
              <div className="bg-background border rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <MessageSquare className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold">Service Request</h3>
                      {getStatusBadge(requests.find((r) => r.id === activeRequest)?.status || "")}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {requests.find((r) => r.id === activeRequest)?.request_reference}
                    </p>
                    <div className="space-y-2">
                      <div>
                        <p className="text-sm font-medium">Subject:</p>
                        <p className="text-sm text-foreground">
                          {requests.find((r) => r.id === activeRequest)?.reason}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Details:</p>
                        <p className="text-sm text-foreground whitespace-pre-wrap">
                          {requests.find((r) => r.id === activeRequest)?.details}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Created: {formatTimestamp(requests.find((r) => r.id === activeRequest)?.created_at || "")}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Chat Messages */}
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`flex gap-2 max-w-[70%] ${
                      message.sender === "user" ? "flex-row-reverse" : "flex-row"
                    }`}
                  >
                    <div
                      className={`flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full ${
                        message.sender === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-background border text-foreground"
                      }`}
                    >
                      {message.sender === "user" ? (
                        <User className="h-4 w-4" />
                      ) : (
                        <HelpCircle className="h-4 w-4" />
                      )}
                    </div>
                    <div className="flex flex-col gap-1">
                      <div
                        className={`rounded-lg px-4 py-3 ${
                          message.sender === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-background border"
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        
                        {/* Display attached documents */}
                        {message.documents && message.documents.length > 0 && (
                          <div className="mt-3 space-y-2">
                            {message.documents.map((doc) => (
                              <div
                                key={doc.id}
                                className={`flex items-center gap-2 p-2 rounded border ${
                                  message.sender === "user"
                                    ? "bg-primary-foreground/10 border-primary-foreground/20"
                                    : "bg-muted border-border"
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
                      </div>
                      <div
                        className={`flex items-center gap-1 text-xs text-muted-foreground ${
                          message.sender === "user" ? "justify-end" : "justify-start"
                        }`}
                      >
                        <span>{formatTimestamp(message.timestamp)}</span>
                        {message.sender === "user" && message.status === "read" && (
                          <CheckCircle2 className="h-3 w-3 text-primary" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="border-t bg-background p-4">
            <div className="max-w-4xl mx-auto space-y-3">
              {/* Selected files preview */}
              {selectedFiles.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2 text-sm"
                    >
                      <Paperclip className="h-4 w-4" />
                      <span className="max-w-[200px] truncate">{file.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0"
                        onClick={() => removeFile(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Message input */}
              <div className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingFiles}
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Input
                  placeholder="Type your message or attach documents..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
                  disabled={uploadingFiles}
                  className="flex-1"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={(!newMessage.trim() && selectedFiles.length === 0) || uploadingFiles}
                >
                  {uploadingFiles ? (
                    <Clock className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Average response time: 2-4 hours during business hours
              </p>
            </div>
          </div>
        </div>
      ) : (
        // List view
        <div className="max-w-7xl mx-auto p-6 space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Service Requests</h1>
            <p className="text-muted-foreground mt-1">Get help with policies, claims, or general questions</p>
          </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
        {/* Requests List */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Your Requests</CardTitle>
              <Button size="sm" onClick={() => setShowNewRequestForm(true)}>
                <MessageSquare className="h-4 w-4 mr-2" />
                New
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-300px)]">
              <div className="space-y-2 p-4 pt-0">
                {loading ? (
                  <div className="flex justify-center p-4">
                    <Clock className="h-6 w-6 animate-spin" />
                  </div>
                ) : requests.length === 0 ? (
                  <div className="text-center p-4 text-muted-foreground">
                    <p>No service requests yet</p>
                  </div>
                ) : (
                  requests.map((request) => (
                    <div
                      key={request.id}
                      onClick={() => setActiveRequest(request.id)}
                      className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                        activeRequest === request.id
                          ? "bg-primary/5 border-primary"
                          : "hover:bg-muted"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {getStatusBadge(request.status)}
                          </div>
                          <h4 className="font-medium line-clamp-1">{request.reason}</h4>
                          <p className="text-xs text-muted-foreground mt-1">
                            {request.request_reference}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm text-foreground/70 line-clamp-2">
                        {request.details}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {formatTimestamp(request.created_at)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Chat Area */}
        <Card className="lg:col-span-2">
          {showNewRequestForm ? (
            <>
              <CardHeader>
                <CardTitle>New Service Request</CardTitle>
                <CardDescription>Tell us what you need help with</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Category</label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border z-50">
                      {categories.map((category) => (
                        <SelectItem key={category.value} value={category.value}>
                          {category.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Subject</label>
                  <Input
                    placeholder="Brief description of your issue..."
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    maxLength={100}
                  />
                </div>
                <div className="flex gap-2 pt-4">
                  <Button onClick={handleCreateRequest} className="flex-1">
                    Create Request
                  </Button>
                  <Button variant="outline" onClick={() => setShowNewRequestForm(false)}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </>
          ) : activeRequest ? (
            <>
              <CardHeader className="pb-3 border-b">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      {requests.find((r) => r.id === activeRequest)?.reason}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      <span>{requests.find((r) => r.id === activeRequest)?.request_reference}</span>
                      <span>•</span>
                      {getStatusBadge(requests.find((r) => r.id === activeRequest)?.status || "")}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0 flex flex-col h-[calc(100vh-350px)]">
                {/* Messages */}
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`flex gap-2 max-w-[80%] ${
                            message.sender === "user" ? "flex-row-reverse" : "flex-row"
                          }`}
                        >
                          <div
                            className={`flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full ${
                              message.sender === "user"
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-foreground"
                            }`}
                          >
                            {message.sender === "user" ? (
                              <User className="h-4 w-4" />
                            ) : (
                              <HelpCircle className="h-4 w-4" />
                            )}
                          </div>
                          <div className="flex flex-col gap-1">
                            <div
                              className={`rounded-lg px-4 py-2 ${
                                message.sender === "user"
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted text-foreground"
                              }`}
                            >
                              <p className="text-sm">{message.content}</p>
                            </div>
                            <div
                              className={`flex items-center gap-1 text-xs text-muted-foreground ${
                                message.sender === "user" ? "justify-end" : "justify-start"
                              }`}
                            >
                              <span>{formatTimestamp(message.timestamp)}</span>
                              {message.sender === "user" && message.status === "read" && (
                                <CheckCircle2 className="h-3 w-3 text-primary" />
                              )}
                              {message.sender === "user" && message.status === "delivered" && (
                                <CheckCircle2 className="h-3 w-3" />
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {/* Input Area */}
                <div className="border-t p-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Type your message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                    />
                    <Button onClick={handleSendMessage} disabled={!newMessage.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Average response time: 2-4 hours during business hours
                  </p>
                </div>
              </CardContent>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <MessageSquare className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No request selected</h3>
              <p className="text-muted-foreground mb-4">
                Select a request from the list or create a new one to start chatting with our support team
              </p>
              <Button onClick={() => setShowNewRequestForm(true)}>
                <MessageSquare className="h-4 w-4 mr-2" />
                Create New Request
              </Button>
            </div>
          )}
        </Card>
      </div>
        </div>
      )}
    </div>
  );
}
