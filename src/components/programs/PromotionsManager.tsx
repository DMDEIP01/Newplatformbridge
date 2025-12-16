import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Tag, Image as ImageIcon, Upload } from "lucide-react";
import { format } from "date-fns";

interface Promotion {
  id: string;
  promo_code: string;
  promo_name: string;
  promo_type: string;
  discount_value: number | null;
  free_months: number | null;
  voucher_value: number | null;
  start_date: string;
  end_date: string;
  is_active: boolean;
  max_uses: number | null;
  current_uses: number;
  description: string | null;
  terms_conditions: string | null;
  logo_url: string | null;
}

interface Product {
  id: string;
  product_id: string;
  name: string;
}

export function PromotionsManager() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<Promotion | null>(null);
  const [selectedPromoId, setSelectedPromoId] = useState<string>("");
  const [assignedProducts, setAssignedProducts] = useState<Set<string>>(new Set());

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const [formData, setFormData] = useState({
    promo_code: "",
    promo_name: "",
    promo_type: "percentage_discount",
    discount_value: "",
    free_months: "",
    voucher_value: "",
    start_date: "",
    end_date: "",
    max_uses: "",
    description: "",
    terms_conditions: "",
    logo_url: "",
  });

  useEffect(() => {
    fetchPromotions();
    fetchProducts();
  }, []);

  const fetchPromotions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("promotions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load promotions");
    } else {
      setPromotions(data || []);
    }
    setLoading(false);
  };

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("id, product_id, name")
      .eq("is_active", true)
      .order("name");

    if (error) {
      toast.error("Failed to load products");
    } else {
      setProducts(data || []);
    }
  };

  const fetchAssignedProducts = async (promotionId: string) => {
    const { data, error } = await supabase
      .from("product_promotions")
      .select("product_id")
      .eq("promotion_id", promotionId)
      .eq("is_active", true);

    if (error) {
      toast.error("Failed to load assigned products");
    } else {
      setAssignedProducts(new Set(data?.map(pp => pp.product_id) || []));
    }
  };

  const handleOpenDialog = (promo?: Promotion) => {
    if (promo) {
      setEditingPromo(promo);
      setFormData({
        promo_code: promo.promo_code,
        promo_name: promo.promo_name,
        promo_type: promo.promo_type,
        discount_value: promo.discount_value?.toString() || "",
        free_months: promo.free_months?.toString() || "",
        voucher_value: promo.voucher_value?.toString() || "",
        start_date: promo.start_date,
        end_date: promo.end_date,
        max_uses: promo.max_uses?.toString() || "",
        description: promo.description || "",
        terms_conditions: promo.terms_conditions || "",
        logo_url: promo.logo_url || "",
      });
      setLogoPreview(promo.logo_url);
      setLogoFile(null);
    } else {
      setEditingPromo(null);
      setFormData({
        promo_code: "",
        promo_name: "",
        promo_type: "percentage_discount",
        discount_value: "",
        free_months: "",
        voucher_value: "",
        start_date: "",
        end_date: "",
        max_uses: "",
        description: "",
        terms_conditions: "",
        logo_url: "",
      });
      setLogoPreview(null);
      setLogoFile(null);
    }
    setDialogOpen(true);
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error("Logo file size must be less than 2MB");
        return;
      }
      
      if (!file.type.startsWith("image/")) {
        toast.error("Please upload an image file");
        return;
      }

      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSavePromotion = async () => {
    setUploadingLogo(true);
    
    try {
      let logoUrl = formData.logo_url;

      // Handle logo upload if a new file is selected
      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `${formData.promo_code}_${Date.now()}.${fileExt}`;
        const filePath = fileName;

        const { error: uploadError } = await supabase.storage
          .from('promotion-logos')
          .upload(filePath, logoFile, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          toast.error("Failed to upload logo");
          setUploadingLogo(false);
          return;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('promotion-logos')
          .getPublicUrl(filePath);
        
        logoUrl = publicUrl;
      }

      const promoData: any = {
        promo_code: formData.promo_code,
        promo_name: formData.promo_name,
        promo_type: formData.promo_type,
        start_date: formData.start_date,
        end_date: formData.end_date,
        description: formData.description || null,
        terms_conditions: formData.terms_conditions || null,
        max_uses: formData.max_uses ? parseInt(formData.max_uses) : null,
        discount_value: formData.discount_value ? parseFloat(formData.discount_value) : null,
        free_months: formData.free_months ? parseInt(formData.free_months) : null,
        voucher_value: formData.voucher_value ? parseFloat(formData.voucher_value) : null,
        logo_url: logoUrl || null,
      };

      let error;
      if (editingPromo) {
        ({ error } = await supabase
          .from("promotions")
          .update(promoData)
          .eq("id", editingPromo.id));
      } else {
        ({ error } = await supabase
          .from("promotions")
          .insert([promoData]));
      }

      if (error) {
        toast.error(`Failed to ${editingPromo ? 'update' : 'create'} promotion`);
      } else {
        toast.success(`Promotion ${editingPromo ? 'updated' : 'created'} successfully`);
        fetchPromotions();
        setDialogOpen(false);
      }
    } catch (error: any) {
      toast.error("An error occurred", {
        description: error.message,
      });
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleToggleActive = async (promo: Promotion) => {
    const { error } = await supabase
      .from("promotions")
      .update({ is_active: !promo.is_active })
      .eq("id", promo.id);

    if (error) {
      toast.error("Failed to update promotion status");
    } else {
      toast.success("Promotion status updated");
      fetchPromotions();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("promotions")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Failed to delete promotion");
    } else {
      toast.success("Promotion deleted successfully");
      fetchPromotions();
    }
  };

  const handleOpenAssignDialog = async (promoId: string) => {
    setSelectedPromoId(promoId);
    await fetchAssignedProducts(promoId);
    setAssignDialogOpen(true);
  };

  const handleToggleProduct = (productId: string) => {
    const newSet = new Set(assignedProducts);
    if (newSet.has(productId)) {
      newSet.delete(productId);
    } else {
      newSet.add(productId);
    }
    setAssignedProducts(newSet);
  };

  const handleSaveAssignments = async () => {
    // Deactivate all existing assignments
    await supabase
      .from("product_promotions")
      .update({ is_active: false })
      .eq("promotion_id", selectedPromoId);

    // Insert/update new assignments
    const assignments = Array.from(assignedProducts).map((productId) => ({
      product_id: productId,
      promotion_id: selectedPromoId,
      is_active: true,
    }));

    const { error } = await supabase
      .from("product_promotions")
      .upsert(assignments, { onConflict: "product_id,promotion_id" });

    if (error) {
      toast.error("Failed to save product assignments");
    } else {
      toast.success("Product assignments saved successfully");
      setAssignDialogOpen(false);
    }
  };

  const getPromoTypeLabel = (type: string) => {
    switch (type) {
      case "percentage_discount": return "Percentage Discount";
      case "fixed_discount": return "Fixed Discount";
      case "free_months": return "Free Months";
      case "voucher": return "Voucher";
      default: return type;
    }
  };

  const getPromoValue = (promo: Promotion) => {
    switch (promo.promo_type) {
      case "percentage_discount":
        return `${promo.discount_value}%`;
      case "fixed_discount":
        return `£${promo.discount_value}`;
      case "free_months":
        return `${promo.free_months} months`;
      case "voucher":
        return `£${promo.voucher_value}`;
      default:
        return "-";
    }
  };

  if (loading) {
    return <div>Loading promotions...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Promotions Management</CardTitle>
              <CardDescription>
                Create and manage promotional offers for products
              </CardDescription>
            </div>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Create Promotion
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Logo</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {promotions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground">
                    No promotions found. Create your first promotion to get started.
                  </TableCell>
                </TableRow>
              ) : (
                promotions.map((promo) => (
                  <TableRow key={promo.id}>
                    <TableCell>
                      {promo.logo_url ? (
                        <img 
                          src={promo.logo_url} 
                          alt={promo.promo_name}
                          className="h-10 w-10 object-contain rounded"
                        />
                      ) : (
                        <div className="h-10 w-10 flex items-center justify-center bg-muted rounded">
                          <ImageIcon className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-mono">{promo.promo_code}</TableCell>
                    <TableCell className="font-medium">{promo.promo_name}</TableCell>
                    <TableCell>{getPromoTypeLabel(promo.promo_type)}</TableCell>
                    <TableCell>{getPromoValue(promo)}</TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(promo.start_date), "MMM d, yyyy")} - {format(new Date(promo.end_date), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <Badge variant={promo.is_active ? "default" : "secondary"}>
                        {promo.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {promo.current_uses} {promo.max_uses ? `/ ${promo.max_uses}` : ""}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenAssignDialog(promo.id)}
                        >
                          <Tag className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(promo)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggleActive(promo)}
                        >
                          <Checkbox checked={promo.is_active} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(promo.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPromo ? "Edit" : "Create"} Promotion</DialogTitle>
            <DialogDescription>
              {editingPromo ? "Update" : "Add"} promotional offer details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Promo Code *</Label>
                <Input
                  value={formData.promo_code}
                  onChange={(e) => setFormData({ ...formData, promo_code: e.target.value.toUpperCase() })}
                  placeholder="SUMMER2025"
                />
              </div>
              <div className="space-y-2">
                <Label>Promo Name *</Label>
                <Input
                  value={formData.promo_name}
                  onChange={(e) => setFormData({ ...formData, promo_name: e.target.value })}
                  placeholder="Summer Sale 2025"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Promotion Type *</Label>
              <Select value={formData.promo_type} onValueChange={(value) => setFormData({ ...formData, promo_type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage_discount">Percentage Discount</SelectItem>
                  <SelectItem value="fixed_discount">Fixed Discount</SelectItem>
                  <SelectItem value="free_months">Free Months</SelectItem>
                  <SelectItem value="voucher">Voucher</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.promo_type === "percentage_discount" && (
              <div className="space-y-2">
                <Label>Discount Percentage *</Label>
                <Input
                  type="number"
                  value={formData.discount_value}
                  onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                  placeholder="10"
                  min="0"
                  max="100"
                />
              </div>
            )}

            {formData.promo_type === "fixed_discount" && (
              <div className="space-y-2">
                <Label>Discount Amount (£) *</Label>
                <Input
                  type="number"
                  value={formData.discount_value}
                  onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                  placeholder="50.00"
                  min="0"
                  step="0.01"
                />
              </div>
            )}

            {formData.promo_type === "free_months" && (
              <div className="space-y-2">
                <Label>Number of Free Months *</Label>
                <Input
                  type="number"
                  value={formData.free_months}
                  onChange={(e) => setFormData({ ...formData, free_months: e.target.value })}
                  placeholder="3"
                  min="1"
                />
              </div>
            )}

            {formData.promo_type === "voucher" && (
              <div className="space-y-2">
                <Label>Voucher Value (£) *</Label>
                <Input
                  type="number"
                  value={formData.voucher_value}
                  onChange={(e) => setFormData({ ...formData, voucher_value: e.target.value })}
                  placeholder="100.00"
                  min="0"
                  step="0.01"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date *</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date *</Label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Maximum Uses (optional)</Label>
              <Input
                type="number"
                value={formData.max_uses}
                onChange={(e) => setFormData({ ...formData, max_uses: e.target.value })}
                placeholder="Leave empty for unlimited"
                min="1"
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the promotion"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Terms & Conditions</Label>
              <Textarea
                value={formData.terms_conditions}
                onChange={(e) => setFormData({ ...formData, terms_conditions: e.target.value })}
                placeholder="Terms and conditions for this promotion"
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label>Promotion Logo</Label>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="cursor-pointer"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Upload a logo for this promotion (max 2MB, image files only)
                  </p>
                </div>
                {logoPreview && (
                  <div className="relative h-20 w-20 border rounded-lg overflow-hidden bg-muted">
                    <img 
                      src={logoPreview} 
                      alt="Logo preview" 
                      className="h-full w-full object-contain"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSavePromotion} disabled={uploadingLogo}>
              {uploadingLogo ? (
                <>
                  <Upload className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>{editingPromo ? "Update" : "Create"} Promotion</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Assign Products to Promotion</DialogTitle>
            <DialogDescription>
              Select which products this promotion applies to
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {products.map((product) => (
              <div key={product.id} className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-accent/5">
                <Checkbox
                  checked={assignedProducts.has(product.id)}
                  onCheckedChange={() => handleToggleProduct(product.id)}
                />
                <div className="flex-1">
                  <div className="font-medium">{product.name}</div>
                  <div className="text-sm text-muted-foreground">{product.product_id}</div>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveAssignments}>Save Assignments</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
