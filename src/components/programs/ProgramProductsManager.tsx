import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CreateProductDialog } from "./CreateProductDialog";
import { EditProductDialog } from "./EditProductDialog";
import { Package, Save, Eye, Trash2, Power } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Program {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  type: string;
  monthly_premium: number;
  is_active: boolean;
}

interface ProgramProduct {
  product_id: string;
  is_active: boolean;
}

interface ProductProgramMapping {
  [productId: string]: string[]; // Maps product ID to array of program IDs
}

export function ProgramProductsManager() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<string>("");
  const [programProducts, setProgramProducts] = useState<Set<string>>(new Set());
  const [showAllProducts, setShowAllProducts] = useState(false);
  const [showInactiveProducts, setShowInactiveProducts] = useState(false);
  const [allProductMappings, setAllProductMappings] = useState<ProductProgramMapping>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [productToDisable, setProductToDisable] = useState<Product | null>(null);

  useEffect(() => {
    fetchPrograms();
    fetchProducts();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [showInactiveProducts]);

  useEffect(() => {
    if (selectedProgramId && !showAllProducts) {
      fetchProgramProducts();
    } else if (showAllProducts) {
      fetchAllProductMappings();
    }
  }, [selectedProgramId, showAllProducts]);

  const fetchPrograms = async () => {
    const { data, error } = await supabase
      .from("programs")
      .select("id, name")
      .eq("is_active", true)
      .order("name");

    if (error) {
      toast.error("Failed to load programs");
      console.error(error);
    } else {
      setPrograms(data || []);
    }
  };

  const fetchProducts = async () => {
    let query = supabase
      .from("products")
      .select("id, name, type, monthly_premium, is_active")
      .order("type", { ascending: true });

    if (!showInactiveProducts) {
      query = query.eq("is_active", true);
    }

    const { data, error } = await query;

    if (error) {
      toast.error("Failed to load products");
      console.error(error);
    } else {
      setProducts(data || []);
    }
  };

  const fetchProgramProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("program_products")
      .select("product_id, is_active")
      .eq("program_id", selectedProgramId)
      .eq("is_active", true);

    if (error) {
      toast.error("Failed to load program products");
      console.error(error);
    } else {
      const productIds = new Set((data || []).map((pp: ProgramProduct) => pp.product_id));
      setProgramProducts(productIds);
    }
    setLoading(false);
  };

  const fetchAllProductMappings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("program_products")
      .select("product_id, program_id, is_active")
      .eq("is_active", true);

    if (error) {
      toast.error("Failed to load product mappings");
      console.error(error);
    } else {
      const mappings: ProductProgramMapping = {};
      (data || []).forEach((item: any) => {
        if (!mappings[item.product_id]) {
          mappings[item.product_id] = [];
        }
        mappings[item.product_id].push(item.program_id);
      });
      setAllProductMappings(mappings);
    }
    setLoading(false);
  };

  const handleToggleProduct = (productId: string) => {
    const newSet = new Set(programProducts);
    if (newSet.has(productId)) {
      newSet.delete(productId);
    } else {
      newSet.add(productId);
    }
    setProgramProducts(newSet);
  };

  const handleSave = async () => {
    if (!selectedProgramId) return;

    setSaving(true);

    // First, deactivate all existing assignments
    await supabase
      .from("program_products")
      .update({ is_active: false })
      .eq("program_id", selectedProgramId);

    // Then, upsert the selected products
    const assignments = Array.from(programProducts).map((productId) => ({
      program_id: selectedProgramId,
      product_id: productId,
      is_active: true,
    }));

    const { error } = await supabase
      .from("program_products")
      .upsert(assignments, { onConflict: "program_id,product_id" });

    setSaving(false);

    if (error) {
      toast.error("Failed to save product assignments");
      console.error(error);
    } else {
      toast.success("Product assignments saved successfully");
    }
  };

  const handleEditProduct = (productId: string) => {
    setSelectedProductId(productId);
    setEditDialogOpen(true);
  };

  const handleProductUpdated = () => {
    fetchProducts();
  };

  const handleToggleProductStatus = async (product: Product) => {
    const newStatus = !product.is_active;
    
    const { error } = await supabase
      .from("products")
      .update({ is_active: newStatus })
      .eq("id", product.id);

    if (error) {
      toast.error(`Failed to ${newStatus ? 'enable' : 'disable'} product`);
      console.error(error);
    } else {
      toast.success(`Product ${newStatus ? 'enabled' : 'disabled'} successfully`);
      fetchProducts();
    }
    setProductToDisable(null);
  };

  const groupedProducts = products.reduce((acc, product) => {
    if (!acc[product.type]) {
      acc[product.type] = [];
    }
    acc[product.type].push(product);
    return acc;
  }, {} as Record<string, Product[]>);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">Product Assignment</h2>
        <p className="text-muted-foreground text-sm">
          Assign products to programs to make them available for sale
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Select Program</CardTitle>
              <CardDescription>
                Choose a program to manage its product assignments
              </CardDescription>
            </div>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Package className="mr-2 h-4 w-4" />
              Create New Product
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="show-all"
              checked={showAllProducts}
              onCheckedChange={(checked) => {
                setShowAllProducts(checked as boolean);
                if (checked) {
                  setSelectedProgramId("");
                  setProgramProducts(new Set());
                }
              }}
            />
            <label
              htmlFor="show-all"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              Show all products across all programs
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="show-inactive"
              checked={showInactiveProducts}
              onCheckedChange={(checked) => setShowInactiveProducts(checked as boolean)}
            />
            <label
              htmlFor="show-inactive"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              Show disabled products
            </label>
          </div>
          
          {!showAllProducts && (
            <Select value={selectedProgramId} onValueChange={setSelectedProgramId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a program..." />
              </SelectTrigger>
              <SelectContent>
                {programs.map((program) => (
                  <SelectItem key={program.id} value={program.id}>
                    {program.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>

      <CreateProductDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onProductCreated={fetchProducts}
      />

      {(selectedProgramId || showAllProducts) && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>
                  {showAllProducts ? "All Products" : "Available Products"}
                </CardTitle>
                <CardDescription>
                  {showAllProducts
                    ? "View all products and their program assignments"
                    : "Select products to assign to this program"}
                </CardDescription>
              </div>
              {!showAllProducts && (
                <Button onClick={handleSave} disabled={saving}>
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading products...</div>
            ) : products.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No products available. Create products first.
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupedProducts).map(([type, typeProducts]) => (
                  <div key={type} className="space-y-3">
                    <h3 className="font-semibold text-lg capitalize">{type} Products</h3>
                    <div className="space-y-2">
                      {typeProducts.map((product) => (
                        <div
                          key={product.id}
                          className={`flex items-center justify-between rounded-lg border p-4 hover:bg-accent/5 transition-colors ${!product.is_active ? 'opacity-60 bg-muted/30' : ''}`}
                        >
                          <div className="flex items-center space-x-3 flex-1">
                            {!showAllProducts && product.is_active && (
                              <Checkbox
                                id={product.id}
                                checked={programProducts.has(product.id)}
                                onCheckedChange={() => handleToggleProduct(product.id)}
                              />
                            )}
                            <label
                              htmlFor={product.id}
                              className="flex-1 cursor-pointer space-y-1"
                            >
                              <div className="flex items-center gap-2">
                                <Package className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">{product.name}</span>
                                {!product.is_active && (
                                  <Badge variant="destructive" className="text-xs">Disabled</Badge>
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                £{product.monthly_premium.toFixed(2)}/month
                              </div>
                              {showAllProducts && allProductMappings[product.id]?.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {allProductMappings[product.id].map((programId) => {
                                    const program = programs.find((p) => p.id === programId);
                                    return program ? (
                                      <Badge key={programId} variant="secondary" className="text-xs">
                                        {program.name}
                                      </Badge>
                                    ) : null;
                                  })}
                                </div>
                              )}
                            </label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditProduct(product.id)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View/Edit
                            </Button>
                            <Button
                              variant={product.is_active ? "outline" : "default"}
                              size="sm"
                              onClick={() => {
                                if (product.is_active) {
                                  setProductToDisable(product);
                                } else {
                                  handleToggleProductStatus(product);
                                }
                              }}
                            >
                              <Power className="h-4 w-4 mr-2" />
                              {product.is_active ? "Disable" : "Enable"}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
      
      <EditProductDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onProductUpdated={handleProductUpdated}
        productId={selectedProductId}
      />

      <AlertDialog open={!!productToDisable} onOpenChange={() => setProductToDisable(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disable Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to disable "{productToDisable?.name}"? This product will no longer be available for sale or assignment to programs.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => productToDisable && handleToggleProductStatus(productToDisable)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Disable Product
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
