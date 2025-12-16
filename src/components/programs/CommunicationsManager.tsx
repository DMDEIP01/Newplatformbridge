import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Mail, MessageSquare, Edit, Eye, Package, RefreshCw, Plus, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getLogoBase64 } from "@/lib/logo-base64";

interface CommunicationTemplate {
  id: string;
  type: "policy" | "claim" | "fulfillment" | "complaint";
  status: string;
  subject: string;
  message_body: string;
  is_active: boolean;
}

interface Product {
  id: string;
  name: string;
  product_id: string;
}

interface ProductAssignment {
  product_id: string;
  is_active: boolean;
}

const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    // Policy statuses
    active: "Policy Active",
    pending: "Policy Pending",
    expired: "Policy Expired",
    cancelled: "Policy Cancelled",
    
    // Claim statuses
    notified: "Claim Notified",
    accepted: "Claim Accepted",
    rejected: "Claim Rejected",
    referred: "Claim Referred",
    referred_pending_info: "Referred - Awaiting Info",
    referred_info_received: "Referred - Info Received",
    excess_due: "Excess Due",
    excess_paid_fulfillment_pending: "Excess Paid - Fulfillment Pending",
    fulfillment_inspection_booked: "Inspection Booked",
    estimate_received: "Estimate Received",
    fulfillment_outcome: "Fulfillment Outcome",
    inbound_logistics: "Inbound Logistics",
    repair: "In Repair",
    outbound_logistics: "Outbound Logistics",
    closed: "Claim Closed",
    
    // Complaint statuses
    submitted: "Complaint Submitted",
    awaiting_info: "Awaiting Information",
    upheld: "Complaint Upheld",
    refuted: "Complaint Refuted",
    withdrawn: "Complaint Withdrawn",
    on_hold: "Complaint On Hold",
    
    // Fulfillment statuses
    pending_excess: "Pending Excess Payment",
    excess_payment_pending: "Excess Payment Pending",
    inspection_scheduled: "Inspection Scheduled",
    inspection_completed: "Inspection Completed",
    quote_pending: "Quote Pending",
    quote_approved: "Quote Approved",
    quote_rejected: "Quote Rejected",
    repair_scheduled: "Repair Scheduled",
    repair_in_progress: "Repair In Progress",
    repair_completed: "Repair Completed",
    beyond_economical_repair: "Beyond Economical Repair",
    replacement_ordered: "Replacement Ordered",
    replacement_shipped: "Replacement Shipped",
    completed: "Fulfillment Completed",
  };
  return labels[status] || status;
};

const getStatusDescription = (status: string, type: string): string => {
  const descriptions: Record<string, string> = {
    // Policy statuses
    active: "When a policy becomes active",
    pending: "When a policy is pending activation",
    expired: "When a policy expires",
    cancelled: "When a policy is cancelled",
    
    // Claim statuses
    notified: "When a claim is first notified",
    accepted: "When a claim is accepted",
    rejected: "When a claim is rejected",
    referred: "When a claim is referred for review",
    referred_pending_info: "When additional information is requested",
    referred_info_received: "When requested information is received",
    excess_due: "When excess payment is due",
    excess_paid_fulfillment_pending: "When excess is paid and awaiting fulfillment",
    fulfillment_inspection_booked: "When fulfillment inspection is scheduled",
    estimate_received: "When repair estimate is received",
    fulfillment_outcome: "When fulfillment is completed",
    inbound_logistics: "When device is being collected",
    repair: "When device is being repaired",
    outbound_logistics: "When device is being returned",
    closed: "When claim is closed",
    
    // Complaint statuses
    submitted: "When a complaint is first submitted",
    awaiting_info: "When additional information is required from customer",
    upheld: "When a complaint is upheld in customer's favor",
    refuted: "When a complaint is not upheld",
    withdrawn: "When a customer withdraws their complaint",
    on_hold: "When a complaint investigation is temporarily paused",
    
    // Fulfillment statuses
    pending_excess: "When excess payment is required before fulfillment",
    excess_payment_pending: "When waiting for excess payment confirmation",
    inspection_scheduled: "When inspection appointment is booked",
    inspection_completed: "When inspection has been completed",
    quote_pending: "When awaiting repair quote from repairer",
    quote_approved: "When customer approves repair quote",
    quote_rejected: "When customer rejects repair quote",
    repair_scheduled: "When repair appointment is scheduled",
    repair_in_progress: "When repair work is underway",
    repair_completed: "When repair has been completed",
    beyond_economical_repair: "When device is deemed beyond economical repair",
    replacement_ordered: "When replacement device is ordered",
    replacement_shipped: "When replacement device is shipped",
    completed: "When fulfillment process is complete",
  };
  return descriptions[status] || "";
};

const POLICY_STATUSES = ["active", "pending", "expired", "cancelled"];

const CLAIM_STATUSES = [
  "notified", "accepted", "rejected", "referred", "referred_pending_info", 
  "referred_info_received", "excess_due", "excess_paid_fulfillment_pending",
  "fulfillment_inspection_booked", "estimate_received", "fulfillment_outcome",
  "inbound_logistics", "repair", "outbound_logistics", "closed"
];

const FULFILLMENT_STATUSES = [
  "pending_excess", "excess_payment_pending", "inspection_scheduled", 
  "inspection_completed", "quote_pending", "quote_approved", "quote_rejected",
  "repair_scheduled", "repair_in_progress", "repair_completed", 
  "beyond_economical_repair", "replacement_ordered", "replacement_shipped", "completed"
];

const COMPLAINT_STATUSES = [
  "submitted", "pending", "awaiting_info", "upheld", "refuted", 
  "closed", "withdrawn", "on_hold"
];

export function CommunicationsManager() {
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<CommunicationTemplate[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<CommunicationTemplate | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [productAssignmentDialogOpen, setProductAssignmentDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editedSubject, setEditedSubject] = useState("");
  const [editedBody, setEditedBody] = useState("");
  const [newTemplateType, setNewTemplateType] = useState<"policy" | "claim" | "fulfillment" | "complaint">("policy");
  const [newTemplateStatus, setNewTemplateStatus] = useState("");
  const [newTemplateSubject, setNewTemplateSubject] = useState("");
  const [newTemplateBody, setNewTemplateBody] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [productAssignments, setProductAssignments] = useState<ProductAssignment[]>([]);
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");
  const [generatedHtml, setGeneratedHtml] = useState("");
  const [newGeneratedHtml, setNewGeneratedHtml] = useState("");
  const [programs, setPrograms] = useState<Array<{id: string, name: string}>>([]);
  const [selectedProgramFilter, setSelectedProgramFilter] = useState<string>("all");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("all");
  const [availableProductTypes, setAvailableProductTypes] = useState<string[]>([]);
  const [selectedCommCategory, setSelectedCommCategory] = useState<string>("all");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("all");
  const { toast } = useToast();
  const { user } = useAuth();

  const AVAILABLE_VARIABLES = [
    { key: "{policy_number}", label: "Policy Number", description: "The customer's policy number" },
    { key: "{customer_name}", label: "Customer Name", description: "Customer's full name" },
    { key: "{claim_number}", label: "Claim Number", description: "Claim reference number (claims only)" },
    { key: "{complaint_reference}", label: "Complaint Reference", description: "Complaint reference number (complaints only)" },
    { key: "{start_date}", label: "Start Date", description: "Policy start date" },
    { key: "{renewal_date}", label: "Renewal Date", description: "Policy renewal date" },
    { key: "{product_name}", label: "Product Name", description: "Insurance product name" },
    { key: "{excess_amount}", label: "Excess Amount", description: "Claim excess amount (claims only)" },
    { key: "{cancelled_date}", label: "Cancellation Date", description: "Date policy was cancelled" },
    { key: "{claim_type}", label: "Claim Type", description: "Type of claim (breakdown, damage, theft)" },
    { key: "{claim_status}", label: "Claim Status", description: "Current claim status" },
    { key: "{submitted_date}", label: "Submission Date", description: "Date claim/complaint was submitted" },
    { key: "{submission_date}", label: "Submission Date", description: "Date submitted (alternative)" },
    { key: "{complaint_type}", label: "Complaint Type", description: "Type of complaint" },
    { key: "{closure_date}", label: "Closure Date", description: "Date complaint was closed" },
    { key: "{withdrawal_date}", label: "Withdrawal Date", description: "Date complaint was withdrawn" },
  ];

  useEffect(() => {
    fetchTemplates();
    fetchProducts();
    fetchPrograms();
    checkAdminRole();
  }, [user]);

  const fetchPrograms = async () => {
    try {
      const { data, error } = await supabase
        .from("programs")
        .select("id, name")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      setPrograms((data || []) as Array<{id: string, name: string}>);
    } catch (error: any) {
      console.error("Error fetching programs:", error);
    }
  };

  const checkAdminRole = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .in('role', ['admin', 'system_admin']);
      
      if (error) throw error;
      setIsAdmin(data && data.length > 0);
    } catch (error) {
      console.error('Error checking admin role:', error);
    }
  };

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("communication_templates")
        .select("*")
        .order("type", { ascending: true })
        .order("status", { ascending: true });

      if (error) throw error;
      setTemplates((data || []) as CommunicationTemplate[]);
    } catch (error: any) {
      console.error("Error fetching templates:", error);
      toast({
        title: "Error",
        description: "Failed to load communication templates",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, product_id, device_categories, type")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      const productList = (data || []) as (Product & { device_categories?: string[], type?: string })[];
      setProducts(productList as Product[]);
      
      // Extract unique product types (Extended Warranty, Insurance Lite, etc.)
      const types = new Set<string>();
      productList.forEach(product => {
        if (product.type) {
          types.add(product.type);
        }
      });
      setAvailableProductTypes(Array.from(types).sort());
    } catch (error: any) {
      console.error("Error fetching products:", error);
      toast({
        title: "Error",
        description: "Failed to load products",
        variant: "destructive",
      });
    }
  };

  const getFilteredProducts = () => {
    let filtered = products;

    // Filter by program if selected
    if (selectedProgramFilter !== "all") {
      // We need to check program_products table for this
      // For now, show all products - this would need a join query
    }

    // Filter by product type if selected
    if (selectedCategoryFilter !== "all") {
      filtered = filtered.filter(product => {
        const p = product as Product & { type?: string };
        return p.type === selectedCategoryFilter;
      });
    }

    return filtered;
  };

  const handleToggleActive = async (template: CommunicationTemplate) => {
    try {
      const { error } = await supabase
        .from("communication_templates")
        .update({ is_active: !template.is_active })
        .eq("id", template.id);

      if (error) throw error;

      toast({
        title: template.is_active ? "Communication Disabled" : "Communication Enabled",
        description: `${getStatusLabel(template.status)} notification ${!template.is_active ? "enabled" : "disabled"}`,
      });

      fetchTemplates();
    } catch (error: any) {
      console.error("Error toggling template:", error);
      toast({
        title: "Error",
        description: "Failed to update communication status",
        variant: "destructive",
      });
    }
  };

  const handleEditTemplate = (template: CommunicationTemplate) => {
    setSelectedTemplate(template);
    setEditedSubject(template.subject);
    setEditedBody(template.message_body);
    setGeneratedHtml("");
    setEditDialogOpen(true);
  };

  const handlePreviewTemplate = async (template: CommunicationTemplate) => {
    setSelectedTemplate(template);
    await updatePreview(template.message_body, template.subject, false);
    setPreviewDialogOpen(true);
  };

  const handleManageProducts = async (template: CommunicationTemplate) => {
    setSelectedTemplate(template);
    
    try {
      const { data, error } = await supabase
        .from("product_communication_templates")
        .select("product_id, is_active")
        .eq("template_id", template.id);

      if (error) throw error;
      
      setProductAssignments((data || []) as ProductAssignment[]);
      setProductAssignmentDialogOpen(true);
    } catch (error: any) {
      console.error("Error fetching product assignments:", error);
      toast({
        title: "Error",
        description: "Failed to load product assignments",
        variant: "destructive",
      });
    }
  };

  const handleToggleProductAssignment = async (productId: string, currentlyActive: boolean) => {
    if (!selectedTemplate) return;

    try {
      const { error } = await supabase
        .from("product_communication_templates")
        .update({ is_active: !currentlyActive })
        .eq("template_id", selectedTemplate.id)
        .eq("product_id", productId);

      if (error) throw error;

      // Update local state
      setProductAssignments(prev => 
        prev.map(pa => 
          pa.product_id === productId 
            ? { ...pa, is_active: !currentlyActive }
            : pa
        )
      );

      toast({
        title: "Success",
        description: `Product assignment ${!currentlyActive ? "enabled" : "disabled"}`,
      });
    } catch (error: any) {
      console.error("Error updating product assignment:", error);
      toast({
        title: "Error",
        description: "Failed to update product assignment",
        variant: "destructive",
      });
    }
  };

  const handleSaveTemplate = async () => {
    if (!selectedTemplate) return;

    try {
      setSaving(true);
      
      // Use generated HTML if available, otherwise generate from current body
      const htmlToSave = generatedHtml || generateHtmlFromContent(editedBody);
      
      const { error } = await supabase
        .from("communication_templates")
        .update({
          subject: editedSubject,
          message_body: htmlToSave,
        })
        .eq("id", selectedTemplate.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Template updated successfully with HTML content",
      });

      setEditDialogOpen(false);
      fetchTemplates();
    } catch (error: any) {
      console.error("Error saving template:", error);
      toast({
        title: "Error",
        description: "Failed to save template",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerateCommunications = async () => {
    if (!isAdmin) return;

    try {
      setRegenerating(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const { data, error } = await supabase.functions.invoke('regenerate-communications', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: data.message || "All communications regenerated successfully",
      });
    } catch (error: any) {
      console.error("Error regenerating communications:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to regenerate communications",
        variant: "destructive",
      });
    } finally {
      setRegenerating(false);
    }
  };

  const handleCreateTemplate = () => {
    setNewTemplateType("claim");
    setNewTemplateStatus("");
    setNewTemplateSubject("");
    setNewTemplateBody("");
    // Initialize with all products, ensuring no duplicates
    setSelectedProducts(Array.from(new Set(products.map(p => p.id))));
    setCreateDialogOpen(true);
  };
  
  const getStatusOptions = () => {
    switch (newTemplateType) {
      case "policy":
        return POLICY_STATUSES;
      case "claim":
        return CLAIM_STATUSES;
      case "fulfillment":
        return FULFILLMENT_STATUSES;
      case "complaint":
        return COMPLAINT_STATUSES;
      default:
        return [];
    }
  };

  const handleSaveNewTemplate = async () => {
    if (!newTemplateStatus || !newTemplateSubject || !newTemplateBody || saving) {
      if (!saving) {
        toast({
          title: "Error",
          description: "Please fill in all required fields",
          variant: "destructive",
        });
      }
      return;
    }

    try {
      setSaving(true);
      
      // Use generated HTML if available, otherwise generate from current body
      const htmlToSave = newGeneratedHtml || generateHtmlFromContent(newTemplateBody);
      
      // Create the template
      const { data: template, error: templateError } = await supabase
        .from("communication_templates")
        .insert({
          type: newTemplateType,
          status: newTemplateStatus,
          subject: newTemplateSubject,
          message_body: htmlToSave,
          is_active: true,
        })
        .select()
        .single();

      if (templateError) throw templateError;

      // First, delete any auto-created assignments (from trigger)
      // Then assign only to selected products
      if (selectedProducts.length > 0 && template) {
        // Delete all auto-created assignments first
        await supabase
          .from("product_communication_templates")
          .delete()
          .eq("template_id", template.id);

        // Now insert only the selected products (remove duplicates)
        const uniqueProductIds = Array.from(new Set(selectedProducts));
        const assignments = uniqueProductIds.map(productId => ({
          template_id: template.id,
          product_id: productId,
          is_active: true,
        }));

        const { error: assignmentError } = await supabase
          .from("product_communication_templates")
          .insert(assignments);

        if (assignmentError) throw assignmentError;
      }

      toast({
        title: "Template Published",
        description: "Communication template created and published successfully with HTML content",
      });

      setCreateDialogOpen(false);
      fetchTemplates();
    } catch (error: any) {
      console.error("Error creating template:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create template",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleProductSelection = (productId: string) => {
    setSelectedProducts(prev => {
      // Remove duplicates by using Set
      const uniqueProducts = Array.from(new Set(prev));
      return uniqueProducts.includes(productId)
        ? uniqueProducts.filter(id => id !== productId)
        : [...uniqueProducts, productId];
    });
  };

  const insertVariable = (variable: string, isEditing: boolean = false) => {
    if (isEditing) {
      setEditedBody(prev => prev + " " + variable + " ");
    } else {
      setNewTemplateBody(prev => prev + " " + variable + " ");
    }
  };

  const generateHtmlFromContent = (content: string): string => {
    // Convert plain text to HTML paragraphs while keeping variables intact
    const paragraphs = content.split('\n\n').map(para => {
      const trimmed = para.trim();
      if (!trimmed) return '';
      return `<p>${trimmed.replace(/\n/g, '<br>')}</p>`;
    }).join('\n');
    
    return paragraphs;
  };

  const handleGenerateHtml = (isEditing: boolean = false) => {
    if (isEditing) {
      const html = generateHtmlFromContent(editedBody);
      setGeneratedHtml(html);
      toast({
        title: "HTML Generated",
        description: "Content converted to HTML. This HTML will be saved when you update the template.",
      });
    } else {
      const html = generateHtmlFromContent(newTemplateBody);
      setNewGeneratedHtml(html);
      toast({
        title: "HTML Generated",
        description: "Content converted to HTML. This HTML will be saved when you publish the template.",
      });
    }
  };

  const updatePreview = async (body: string, subject: string, isEditing: boolean = false) => {
    // Use generated HTML if available, otherwise use raw body
    const htmlContent = isEditing ? (generatedHtml || generateHtmlFromContent(body)) : (newGeneratedHtml || generateHtmlFromContent(body));
    
    // Replace variables with sample data for preview
    let previewContent = htmlContent;
    const sampleData: Record<string, string> = {
      "{policy_number}": "POL-2024-001234",
      "{customer_name}": "John Smith",
      "{claim_number}": "CLM-2024-005678",
      "{complaint_reference}": "CMP-2024-012345",
      "{start_date}": "01/01/2024",
      "{renewal_date}": "01/01/2025",
      "{product_name}": "Premium Device Protection",
      "{excess_amount}": "£50.00",
      "{cancelled_date}": "15/12/2024",
      "{claim_type}": "Accidental Damage",
      "{claim_status}": "Accepted",
      "{submitted_date}": "15/11/2024",
      "{submission_date}": "15/11/2024",
      "{complaint_type}": "Service Quality",
      "{closure_date}": "20/12/2024",
      "{withdrawal_date}": "18/12/2024",
    };

    for (const [key, value] of Object.entries(sampleData)) {
      previewContent = previewContent.replace(new RegExp(key, "g"), value);
    }

    // Add styling to paragraphs if not already styled
    const styledContent = previewContent.replace(/<p>/g, '<p style="margin: 0 0 16px 0; color: #333333; line-height: 1.6;">').replace(/<br>/g, '<br/>');

    // Use the logo URL directly - CSS filter will make it white
    const logoUrl = '/mediamarkt-logo-email-new.png';

    // MediaMarkt branded email template with white logo via CSS filter
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #f5f5f5;
    }
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    .header {
      background: linear-gradient(135deg, #e30613 0%, #c40510 100%);
      padding: 30px 40px;
      text-align: center;
    }
    .logo {
      max-width: 180px;
      height: auto;
      margin-bottom: 10px;
      filter: brightness(0) invert(1);
    }
    .content {
      padding: 40px;
      color: #333333;
      line-height: 1.6;
    }
    .content p {
      margin: 0 0 16px 0;
      color: #333333;
    }
    .claim-info {
      background-color: #f8f8f8;
      border-left: 4px solid #e30613;
      padding: 16px 20px;
      margin: 24px 0;
    }
    .cta-button {
      display: inline-block;
      background-color: #e30613;
      color: #ffffff !important;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 4px;
      font-weight: 600;
      margin: 24px 0;
    }
    .footer {
      background-color: #1a1a1a;
      color: #999999;
      padding: 30px 40px;
      text-align: center;
      font-size: 12px;
      line-height: 1.8;
    }
    .footer a {
      color: #e30613;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <!-- Header -->
    <div class="header">
      <img src="${logoUrl}" alt="MediaMarkt" class="logo" />
      <div style="color: #ffffff; font-size: 14px; margin-top: 8px; font-weight: normal;">Insurance Protection</div>
    </div>
    
    <!-- Content -->
    <div class="content">
      ${styledContent}
      <div style="text-align: center; margin: 32px 0;">
        <a href="#" class="cta-button">Login to Customer Portal</a>
      </div>
      <p style="text-align: center; font-size: 14px; color: #666;">
        Click the button above to view your policy details and manage your account
      </p>
    </div>
    
    <!-- Footer -->
    <div class="footer">
      <p><strong>MediaMarkt Insurance</strong></p>
      <p>Your trusted protection partner</p>
      <div style="margin: 16px 0;">
        <a href="#">Contact Support</a> | 
        <a href="#">Policy Terms</a> | 
        <a href="#">Privacy Policy</a>
      </div>
      <p>This is an automated message. Please do not reply to this email.</p>
      <p style="margin-top: 16px; color: #666;">
        © ${new Date().getFullYear()} MediaMarkt Insurance. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
    `;
    setPreviewHtml(html);
  };

  const handlePublishTemplate = async (templateId: string) => {
    try {
      const { error } = await supabase
        .from("communication_templates")
        .update({ is_active: true })
        .eq("id", templateId);

      if (error) throw error;

      toast({
        title: "Template Published",
        description: "Template is now active and will be sent to customers",
      });

      fetchTemplates();
    } catch (error: any) {
      console.error("Error publishing template:", error);
      toast({
        title: "Error",
        description: "Failed to publish template",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (type: "policy" | "claim" | "fulfillment" | "complaint") => {
    if (type === "policy") {
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Policy</Badge>;
    }
    if (type === "fulfillment") {
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Fulfillment</Badge>;
    }
    if (type === "complaint") {
      return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">Complaint</Badge>;
    }
    return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Claim</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const policyTemplates = templates.filter((t) => t.type === "policy");
  const claimTemplates = templates.filter((t) => t.type === "claim");
  const fulfillmentTemplates = templates.filter((t) => t.type === "fulfillment");
  const complaintTemplates = templates.filter((t) => t.type === "complaint");

  // Get filtered templates based on selected filters
  const getFilteredTemplates = () => {
    let filtered = templates;

    // Filter by communication category
    if (selectedCommCategory !== "all") {
      filtered = filtered.filter(t => t.type === selectedCommCategory);
    }

    // Filter by status
    if (selectedStatusFilter !== "all") {
      filtered = filtered.filter(t => t.status === selectedStatusFilter);
    }

    return filtered;
  };

  const filteredTemplates = getFilteredTemplates();
  
  // Get unique statuses for the selected category
  const getAvailableStatuses = () => {
    const categoryTemplates = selectedCommCategory === "all" 
      ? templates 
      : templates.filter(t => t.type === selectedCommCategory);
    return Array.from(new Set(categoryTemplates.map(t => t.status))).sort();
  };

  return (
    <div className="space-y-6">
      <Card className="border-primary bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
                <Mail className="h-5 w-5" />
                MediaMarkt Insurance Communications
              </CardTitle>
              <CardDescription>
                Configure automated notifications for policy and claim status updates. 
                All communications are stored against the policy and can be viewed in both customer and retail portals.
              </CardDescription>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button
                onClick={handleCreateTemplate}
                variant="default"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Template
              </Button>
              {isAdmin && (
                <Button
                  onClick={handleRegenerateCommunications}
                  disabled={regenerating}
                  variant="outline"
                >
                  {regenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Regenerating...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Regenerate All
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Filter Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Communication Category</Label>
              <Select value={selectedCommCategory} onValueChange={setSelectedCommCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="policy">Policy Communications</SelectItem>
                  <SelectItem value="claim">Claim Communications</SelectItem>
                  <SelectItem value="fulfillment">Fulfillment Communications</SelectItem>
                  <SelectItem value="complaint">Complaint Communications</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={selectedStatusFilter} onValueChange={setSelectedStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {getAvailableStatuses().map((status) => (
                    <SelectItem key={status} value={status}>
                      {getStatusLabel(status)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filtered Communications */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {selectedCommCategory === "all" ? "All Communications" : 
             selectedCommCategory === "policy" ? "Policy Status Communications" :
             selectedCommCategory === "claim" ? "Claim Status Communications" :
             selectedCommCategory === "fulfillment" ? "Fulfillment Communications" :
             "Complaint Status Communications"}
          </CardTitle>
          <CardDescription>
            {filteredTemplates.length} {filteredTemplates.length === 1 ? 'template' : 'templates'} found
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {filteredTemplates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No templates found matching the selected filters.
            </div>
          ) : (
            filteredTemplates.map((template) => (
              <div
                key={template.id}
                className="flex items-start justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{getStatusLabel(template.status)}</p>
                    {getStatusBadge(template.type)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {getStatusDescription(template.status, template.type)}
                  </p>
                  <div className="flex gap-2 mt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handlePreviewTemplate(template)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Preview
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditTemplate(template)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleManageProducts(template)}
                    >
                      <Package className="h-4 w-4 mr-1" />
                      Products
                    </Button>
                    {!template.is_active && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePublishTemplate(template.id)}
                      >
                        <Send className="h-4 w-4 mr-1" />
                        Publish
                      </Button>
                    )}
                  </div>
                </div>
                <Switch
                  checked={template.is_active}
                  onCheckedChange={() => handleToggleActive(template)}
                />
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Communication Behavior
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            • All notifications direct customers to log into the MediaMarkt Insurance Portal
          </p>
          <p>
            • Communications are automatically stored against the policy for customer viewing
          </p>
          <p>
            • Both customer portal and retail portal display communication history
          </p>
          <p>
            • Customers can view and download all communications from their policy dashboard
          </p>
          <p className="text-xs text-muted-foreground mt-4 italic">
            Available variables: {"{policy_number}"}, {"{claim_number}"}, {"{start_date}"}, {"{renewal_date}"}, {"{product_name}"}, {"{excess_amount}"}, {"{cancelled_date}"}
          </p>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-7xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Edit Communication Template</DialogTitle>
            <DialogDescription>
              Customize the MediaMarkt branded message for {selectedTemplate && getStatusLabel(selectedTemplate.status)}
            </DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="edit" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="edit">Edit Content</TabsTrigger>
              <TabsTrigger value="variables">Variables</TabsTrigger>
              <TabsTrigger value="preview" onClick={() => void updatePreview(editedBody, editedSubject, true)}>Preview</TabsTrigger>
            </TabsList>
            <TabsContent value="edit" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="subject">Subject Line</Label>
                <Input
                  id="subject"
                  value={editedSubject}
                  onChange={(e) => setEditedSubject(e.target.value)}
                  placeholder="Email subject"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="body">Message Body (Plain Text)</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleGenerateHtml(true)}
                  >
                    Generate HTML
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Type or paste your content here. Use the Variables tab to insert placeholders. Click "Generate HTML" to convert to formatted email - this HTML will be saved and used for communications.
                </p>
                <Textarea
                  id="body"
                  value={editedBody}
                  onChange={(e) => {
                    setEditedBody(e.target.value);
                    setGeneratedHtml(""); // Clear generated HTML when content changes
                  }}
                  placeholder="Type your email content here. Use double line breaks for paragraphs.&#10;&#10;Example:&#10;Dear {customer_name},&#10;&#10;Your policy {policy_number} is now active.&#10;&#10;Thank you for choosing us!"
                  rows={20}
                  className="font-mono text-sm"
                />
              </div>
              {generatedHtml && (
                <div className="space-y-2">
                  <Label>Generated HTML</Label>
                  <Textarea
                    value={generatedHtml}
                    readOnly
                    rows={10}
                    className="font-mono text-xs bg-muted"
                  />
                </div>
              )}
            </TabsContent>
            <TabsContent value="variables" className="mt-4">
              <ScrollArea className="h-[500px]">
                <div className="space-y-2 pr-4">
                  <p className="text-sm text-muted-foreground mb-4">
                    Click any variable to insert it into your template
                  </p>
                  {AVAILABLE_VARIABLES.map((variable) => (
                    <div
                      key={variable.key}
                      className="flex items-start justify-between p-3 border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
                      onClick={() => insertVariable(variable.key, true)}
                    >
                      <div className="flex-1">
                        <p className="font-medium text-sm">{variable.label}</p>
                        <p className="text-xs text-muted-foreground">{variable.description}</p>
                        <code className="text-xs bg-muted px-2 py-1 rounded mt-1 inline-block">
                          {variable.key}
                        </code>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
            <TabsContent value="preview" className="mt-4">
              <div className="border rounded-lg overflow-hidden">
                <iframe
                  srcDoc={previewHtml}
                  className="w-full h-[500px] border-0"
                  title="Email Preview"
                />
              </div>
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveTemplate} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Communication Preview</DialogTitle>
            <DialogDescription>
              {selectedTemplate && getStatusLabel(selectedTemplate.status)} - MediaMarkt Insurance
            </DialogDescription>
          </DialogHeader>
          {selectedTemplate && (
            <div className="space-y-4">
              <div className="border rounded-lg overflow-hidden bg-white">
                <iframe
                  srcDoc={previewHtml}
                  className="w-full h-[600px] border-0"
                  title="Email Preview"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setPreviewDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Product Assignment Dialog */}
      <Dialog open={productAssignmentDialogOpen} onOpenChange={setProductAssignmentDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage Product Assignments</DialogTitle>
            <DialogDescription>
              {selectedTemplate && `Select which products should use the "${getStatusLabel(selectedTemplate.status)}" template`}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {products.map((product) => {
                const assignment = productAssignments.find(pa => pa.product_id === product.id);
                const isActive = assignment?.is_active ?? true;
                
                return (
                  <div key={product.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-muted-foreground">{product.product_id}</p>
                    </div>
                    <Checkbox
                      checked={isActive}
                      onCheckedChange={() => handleToggleProductAssignment(product.id, isActive)}
                    />
                  </div>
                );
              })}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button onClick={() => setProductAssignmentDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Template Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-[95vw] w-[95vw] max-h-[95vh] h-[95vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Create Communication Template</DialogTitle>
            <DialogDescription>
              Create a new automated notification template for policy or claim status updates
            </DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="setup" className="w-full flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="setup">Setup</TabsTrigger>
              <TabsTrigger value="edit">Edit Content</TabsTrigger>
              <TabsTrigger value="variables">Variables</TabsTrigger>
              <TabsTrigger value="preview" onClick={() => void updatePreview(newTemplateBody, newTemplateSubject, false)}>Preview</TabsTrigger>
            </TabsList>
            
            <TabsContent value="setup" className="space-y-4 mt-4 overflow-auto flex-1">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="template-type">Template Type *</Label>
                  <Select value={newTemplateType} onValueChange={(value: "policy" | "claim" | "fulfillment" | "complaint") => {
                    setNewTemplateType(value);
                    setNewTemplateStatus("");
                  }}>
                    <SelectTrigger id="template-type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="policy">Policy</SelectItem>
                      <SelectItem value="claim">Claim</SelectItem>
                      <SelectItem value="fulfillment">Fulfillment</SelectItem>
                      <SelectItem value="complaint">Complaint</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="template-status">Status Trigger *</Label>
                  <Select value={newTemplateStatus} onValueChange={setNewTemplateStatus}>
                    <SelectTrigger id="template-status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {getStatusOptions().map((status) => (
                        <SelectItem key={status} value={status}>
                          {getStatusLabel(status)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {newTemplateStatus && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {getStatusDescription(newTemplateStatus, newTemplateType)}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Filter & Assign Products</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const filteredProducts = getFilteredProducts();
                      const filteredIds = filteredProducts.map(p => p.id);
                      if (selectedProducts.length === filteredProducts.length) {
                        // Deselect all filtered products
                        setSelectedProducts(prev => Array.from(new Set(prev.filter(id => !filteredIds.includes(id)))));
                      } else {
                        // Select all filtered products (ensuring no duplicates)
                        setSelectedProducts(prev => Array.from(new Set([...prev, ...filteredIds])));
                      }
                    }}
                  >
                    {(() => {
                      const filteredProducts = getFilteredProducts();
                      const allSelected = filteredProducts.every(p => selectedProducts.includes(p.id));
                      return allSelected ? "Deselect All Filtered" : "Select All Filtered";
                    })()}
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="program-filter">Filter by Program</Label>
                    <Select value={selectedProgramFilter} onValueChange={setSelectedProgramFilter}>
                      <SelectTrigger id="program-filter" className="bg-background">
                        <SelectValue placeholder="All Programs" />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        <SelectItem value="all">All Programs</SelectItem>
                        {programs.map((program) => (
                          <SelectItem key={program.id} value={program.id}>
                            {program.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category-filter">Product Category</Label>
                    <Select value={selectedCategoryFilter} onValueChange={setSelectedCategoryFilter}>
                      <SelectTrigger id="category-filter" className="bg-background">
                        <SelectValue placeholder="All Categories" />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        <SelectItem value="all">All Categories</SelectItem>
                        {availableProductTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <ScrollArea className="h-[280px] border rounded-lg p-3 bg-background">
                  <div className="grid grid-cols-2 gap-2">
                    {getFilteredProducts().map((product) => (
                      <Card 
                        key={product.id}
                        className={`cursor-pointer transition-colors ${
                          selectedProducts.includes(product.id)
                            ? "border-primary bg-primary/5"
                            : "hover:bg-accent/50"
                        }`}
                        onClick={() => handleToggleProductSelection(product.id)}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="font-medium text-sm">{product.name}</p>
                              <p className="text-xs text-muted-foreground">{product.product_id}</p>
                            </div>
                            <Checkbox
                              checked={selectedProducts.includes(product.id)}
                              onCheckedChange={() => handleToggleProductSelection(product.id)}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    {getFilteredProducts().length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <p>No products match the selected filters</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
                <p className="text-xs text-muted-foreground">
                  Selected {selectedProducts.length} of {products.length} total products ({getFilteredProducts().length} shown)
                </p>
              </div>

              <div className="flex justify-end pt-4">
                <Button 
                  onClick={handleSaveNewTemplate} 
                  disabled={saving || !newTemplateStatus || !newTemplateSubject || !newTemplateBody}
                  size="lg"
                  className="min-w-[200px]"
                >
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Send className="mr-2 h-4 w-4" />
                  Publish Template
                  {newGeneratedHtml && <span className="ml-2 text-xs opacity-75">(HTML Ready)</span>}
                </Button>
              </div>
              {!newGeneratedHtml && newTemplateBody && (
                <p className="text-xs text-amber-600 dark:text-amber-400 text-right pt-2">
                  💡 Click "Generate HTML" in the Edit Content tab before publishing for formatted emails
                </p>
              )}
            </TabsContent>

            <TabsContent value="edit" className="space-y-4 mt-4 overflow-auto flex-1">
              <div className="space-y-2">
                <Label htmlFor="new-subject">Subject Line *</Label>
                <Input
                  id="new-subject"
                  value={newTemplateSubject}
                  onChange={(e) => setNewTemplateSubject(e.target.value)}
                  placeholder="Email subject"
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="new-body">Message Body (Plain Text) *</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleGenerateHtml(false)}
                  >
                    Generate HTML
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Type or paste your content here. Use the Variables tab to insert placeholders. Click "Generate HTML" to convert to formatted email - this HTML will be saved when you publish.
                </p>
                <Textarea
                  id="new-body"
                  value={newTemplateBody}
                  onChange={(e) => {
                    setNewTemplateBody(e.target.value);
                    setNewGeneratedHtml(""); // Clear generated HTML when content changes
                  }}
                  placeholder="Type your email content here. Use double line breaks for paragraphs.&#10;&#10;Example:&#10;Dear {customer_name},&#10;&#10;Your policy {policy_number} is now active.&#10;&#10;Thank you for choosing us!"
                  rows={20}
                  className="font-mono text-sm"
                />
              </div>
              {newGeneratedHtml && (
                <div className="space-y-2">
                  <Label>Generated HTML</Label>
                  <Textarea
                    value={newGeneratedHtml}
                    readOnly
                    rows={10}
                    className="font-mono text-xs bg-muted"
                  />
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="variables" className="mt-4 overflow-auto flex-1">
              <ScrollArea className="h-[500px]">
                <div className="space-y-2 pr-4">
                  <p className="text-sm text-muted-foreground mb-4">
                    Click any variable to insert it into your template
                  </p>
                  {AVAILABLE_VARIABLES.map((variable) => (
                    <div
                      key={variable.key}
                      className="flex items-start justify-between p-3 border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
                      onClick={() => insertVariable(variable.key, false)}
                    >
                      <div className="flex-1">
                        <p className="font-medium text-sm">{variable.label}</p>
                        <p className="text-xs text-muted-foreground">{variable.description}</p>
                        <code className="text-xs bg-muted px-2 py-1 rounded mt-1 inline-block">
                          {variable.key}
                        </code>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="preview" className="mt-4 space-y-4 overflow-auto flex-1 flex flex-col">
              <div className="border rounded-lg overflow-hidden flex-1">
                <iframe
                  srcDoc={previewHtml}
                  className="w-full h-full border-0"
                  title="Email Preview"
                />
              </div>
              <div className="flex items-center justify-between gap-4 pt-2 border-t">
                <div className="text-sm text-muted-foreground">
                  {!newTemplateStatus && <span className="text-destructive">⚠ Select Status Trigger in Setup tab</span>}
                  {!newTemplateSubject && newTemplateStatus && <span className="text-destructive">⚠ Add Subject Line in Edit tab</span>}
                  {!newTemplateBody && newTemplateSubject && <span className="text-destructive">⚠ Add Message Body in Edit tab</span>}
                  {newTemplateBody && newTemplateSubject && newTemplateStatus && (
                    <span className="text-green-600 dark:text-green-400">✓ Ready to publish</span>
                  )}
                </div>
                <Button 
                  onClick={handleSaveNewTemplate} 
                  disabled={saving || !newTemplateStatus || !newTemplateSubject || !newTemplateBody}
                  size="lg"
                  className="min-w-[200px]"
                >
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Send className="mr-2 h-4 w-4" />
                  Save and Publish
                  {newGeneratedHtml && <span className="ml-2 text-xs opacity-75">(HTML Ready)</span>}
                </Button>
              </div>
              {!newGeneratedHtml && newTemplateBody && (
                <p className="text-xs text-amber-600 dark:text-amber-400 text-right">
                  💡 Consider clicking "Generate HTML" in the Edit Content tab before publishing for better formatting
                </p>
              )}
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
