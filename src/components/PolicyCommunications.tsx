import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, Eye, Download, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { toast } from "sonner";
import { useRole } from "@/hooks/useRole";

interface PolicyCommunication {
  id: string;
  communication_type: string;
  subject: string;
  message_body: string;
  status: string;
  sent_at: string;
  read_at: string | null;
  claim_id: string | null;
  complaint_id: string | null;
}

interface PolicyCommunicationsProps {
  policyId?: string;
  claimId?: string | null | "any";
  complaintId?: string;
}

export function PolicyCommunications({ policyId, claimId, complaintId }: PolicyCommunicationsProps) {
  const [communications, setCommunications] = useState<PolicyCommunication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedComm, setSelectedComm] = useState<PolicyCommunication | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [filterType, setFilterType] = useState<string>("all");
  const { isComplaintsAgent, isAdmin } = useRole();

  useEffect(() => {
    if (policyId || complaintId) {
      fetchCommunications();
    }
  }, [policyId, claimId, complaintId, filterType]);

  const fetchCommunications = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from("policy_communications")
        .select("*")
        .order("sent_at", { ascending: false });

      // Apply filters based on context
      if (policyId) {
        query = query.eq("policy_id", policyId);
      }

      // Filter based on claimId parameter
      if (claimId === null) {
        query = query.is("claim_id", null);
      } else if (claimId === "any") {
        query = query.not("claim_id", "is", null);
      } else if (claimId) {
        query = query.eq("claim_id", claimId);
      }

      // Filter by complaint ID
      if (complaintId) {
        query = query.eq("complaint_id", complaintId);
      }

      // Apply type filter
      if (filterType !== "all") {
        query = query.eq("communication_type", filterType);
      }

      const { data, error } = await query;

      if (error) throw error;
      setCommunications(data || []);
    } catch (error: any) {
      console.error("Error fetching communications:", error);
      toast.error("Failed to load communications");
    } finally {
      setLoading(false);
    }
  };

  const handleViewCommunication = async (comm: PolicyCommunication) => {
    setSelectedComm(comm);
    setPreviewOpen(true);

    // Mark as read if not already
    if (!comm.read_at) {
      try {
        const { error } = await supabase
          .from("policy_communications")
          .update({ read_at: new Date().toISOString() })
          .eq("id", comm.id);

        if (!error) {
          setCommunications(prev =>
            prev.map(c =>
              c.id === comm.id ? { ...c, read_at: new Date().toISOString() } : c
            )
          );
        }
      } catch (error) {
        console.error("Error marking communication as read:", error);
      }
    }
  };

  const handleDownload = (comm: PolicyCommunication) => {
    const blob = new Blob([comm.message_body], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${comm.subject.replace(/[^a-z0-9]/gi, '_')}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Communication downloaded");
  };

  const extractEmailContent = (html: string) => {
    if (html.includes('<!DOCTYPE html>') || html.includes('<html')) {
      return html;
    }
    
    if (html.includes('<p>') || html.includes('<div>')) {
      return html;
    }
    
    return `<p style="white-space: pre-wrap;">${html}</p>`;
  };

  const handleResend = async (comm: PolicyCommunication) => {
    try {
      let email = null;

      if (policyId) {
        const { data: policy, error: policyError } = await supabase
          .from("policies")
          .select("customer_email")
          .eq("id", policyId)
          .single();

        if (policyError) throw policyError;
        email = policy?.customer_email;
      }

      if (complaintId) {
        const { data: complaint, error: complaintError } = await supabase
          .from("complaints")
          .select("customer_email")
          .eq("id", complaintId)
          .single();

        if (complaintError) throw complaintError;
        email = complaint?.customer_email;
      }

      if (!email) {
        toast.error("Customer email not found");
        return;
      }

      const { error } = await supabase.functions.invoke("send-email", {
        body: {
          to: email,
          subject: comm.subject,
          html: comm.message_body,
          policyId: policyId,
          claimId: comm.claim_id,
          complaintId: complaintId,
          communicationType: comm.communication_type,
        },
      });

      if (error) throw error;

      toast.success("Communication resent successfully");
    } catch (error: any) {
      console.error("Error resending communication:", error);
      toast.error("Failed to resend communication");
    }
  };

  const getCommunicationTypeBadge = (type: string) => {
    if (type === 'policy') {
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400">Policy</Badge>;
    }
    if (type === 'claim') {
      return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/20 dark:text-purple-400">Claim</Badge>;
    }
    return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/20 dark:text-orange-400">Complaint</Badge>;
  };

  const canResend = isComplaintsAgent || isAdmin;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Communications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-4">Loading communications...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Communications
              </CardTitle>
              <CardDescription>
                All notifications sent {complaintId ? 'for this complaint' : claimId === "any" ? 'for claims' : claimId ? 'for this claim' : 'for this policy'}
              </CardDescription>
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Communications</SelectItem>
                <SelectItem value="policy">Policy</SelectItem>
                <SelectItem value="claim">Claim</SelectItem>
                <SelectItem value="complaint">Complaint</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {communications.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No communications yet
            </div>
          ) : (
            <div className="space-y-3">
              {communications.map((comm) => (
                <div
                  key={comm.id}
                  className="flex items-start justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Mail className={`h-4 w-4 ${comm.read_at ? 'text-muted-foreground' : 'text-primary'}`} />
                      <p className={`font-medium ${!comm.read_at ? 'text-primary' : ''}`}>
                        {comm.subject}
                      </p>
                      {getCommunicationTypeBadge(comm.communication_type)}
                      {!comm.read_at && (
                        <Badge variant="default" className="bg-primary text-xs">New</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>Sent: {format(new Date(comm.sent_at), "PPP p")}</span>
                      {comm.read_at && (
                        <span className="ml-2">• Read: {format(new Date(comm.read_at), "PPP p")}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewCommunication(comm)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownload(comm)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    {canResend && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleResend(comm)}
                      >
                        <Mail className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Full-screen Email Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-[100vw] w-[100vw] max-h-[100vh] h-[100vh] p-0 rounded-none">
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b bg-background">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-primary" />
                <div>
                  <h2 className="text-lg font-semibold">{selectedComm?.subject}</h2>
                  {selectedComm && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>Sent: {format(new Date(selectedComm.sent_at), "PPP p")}</span>
                      {getCommunicationTypeBadge(selectedComm.communication_type)}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Email Preview Content */}
            <div className="flex-1 overflow-hidden bg-muted/30">
              {selectedComm && (
                <iframe
                  srcDoc={extractEmailContent(selectedComm.message_body)}
                  className="w-full h-full border-0"
                  sandbox="allow-same-origin"
                  title="Email Preview"
                />
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}