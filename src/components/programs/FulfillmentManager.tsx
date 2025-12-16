import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Search } from "lucide-react";
import { toast } from "sonner";

interface FulfillmentAssignment {
  id: string;
  program_ids: string[] | null;
  product_id: string | null;
  device_category: string | null;
  manufacturer: string | null;
  model_name: string | null;
  repairer_id: string | null;
  is_active: boolean;
  created_at: string;
  repairers?: {
    id: string;
    name: string;
    company_name: string;
  };
}

interface Program {
  id: string;
  name: string;
  settings?: {
    countries?: string[];
    [key: string]: any;
  } | null;
}

interface Product {
  id: string;
  name: string;
}

export function FulfillmentManager() {
  const [assignments, setAssignments] = useState<FulfillmentAssignment[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [deviceCategories, setDeviceCategories] = useState<string[]>([]);
  const [manufacturers, setManufacturers] = useState<string[]>([]);
  const [models, setModels] = useState<Array<{ manufacturer: string; model_name: string; device_category: string }>>([]);
  const [repairers, setRepairers] = useState<Array<{ 
    id: string; 
    name: string; 
    company_name: string;
    country: string | null;
    coverage_areas: string[] | null;
    specializations: string[] | null;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Form state
  const [assignmentType, setAssignmentType] = useState<"product" | "device_category" | "device">("product");
  const [selectedProgramIds, setSelectedProgramIds] = useState<string[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedDeviceCategory, setSelectedDeviceCategory] = useState("");
  const [selectedManufacturer, setSelectedManufacturer] = useState("");
  const [selectedModelName, setSelectedModelName] = useState("");
  const [selectedRepairerId, setSelectedRepairerId] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load assignments with repairer info
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from("fulfillment_assignments")
        .select(`
          *,
          repairers (
            id,
            name,
            company_name
          )
        `)
        .order("created_at", { ascending: false });

      if (assignmentsError) throw assignmentsError;
      setAssignments(assignmentsData || []);

      // Load programs
      const { data: programsData, error: programsError } = await supabase
        .from("programs")
        .select("id, name, settings")
        .eq("is_active", true);

      if (programsError) throw programsError;
      setPrograms((programsData || []).map(p => ({
        ...p,
        settings: p.settings as Program['settings']
      })));

      // Load products
      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select("id, name")
        .eq("is_active", true);

      if (productsError) throw productsError;
      setProducts(productsData || []);

      // Load device categories
      const { data: devicesData, error: devicesError } = await supabase
        .from("devices")
        .select("device_category, manufacturer, model_name")
        .order("device_category");

      if (devicesError) throw devicesError;
      const uniqueCategories = Array.from(new Set(devicesData?.map(d => d.device_category) || []));
      setDeviceCategories(uniqueCategories);
      
      const uniqueManufacturers = Array.from(new Set(devicesData?.map(d => d.manufacturer) || []));
      setManufacturers(uniqueManufacturers);
      
      setModels(devicesData || []);

      // Load repairers from repairers table
      const { data: repairersData, error: repairersError } = await supabase
        .from("repairers")
        .select("id, name, company_name, country, coverage_areas, specializations")
        .eq("is_active", true)
        .order("company_name");

      if (repairersError) throw repairersError;
      setRepairers(repairersData || []);

    } catch (error: any) {
      console.error("Error loading data:", error);
      toast.error("Failed to load data: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAssignment = async () => {
    try {
      console.log("Attempting to add assignment:", {
        assignmentType,
        selectedProgramIds,
        selectedProductId,
        selectedDeviceCategory,
        selectedManufacturer,
        selectedModelName,
        selectedRepairerId
      });

      if (selectedProgramIds.length === 0) {
        toast.error("Please select at least one program");
        return;
      }

      const newAssignment: any = {
        repairer_id: selectedRepairerId || null,
        is_active: true,
        program_ids: selectedProgramIds,
      };

      if (assignmentType === "product") {
        if (!selectedProductId) {
          toast.error("Please select a product");
          return;
        }
        newAssignment.product_id = selectedProductId;
      } else if (assignmentType === "device_category") {
        if (!selectedDeviceCategory) {
          toast.error("Please select a device category");
          return;
        }
        newAssignment.device_category = selectedDeviceCategory;
      } else if (assignmentType === "device") {
        if (!selectedManufacturer || !selectedModelName) {
          toast.error("Please select manufacturer and model");
          return;
        }
        newAssignment.manufacturer = selectedManufacturer;
        newAssignment.model_name = selectedModelName;
      }

      const { error } = await supabase
        .from("fulfillment_assignments")
        .insert(newAssignment);

      if (error) throw error;

      toast.success("Fulfillment assignment added successfully");
      loadData();
      
      // Reset form
      setSelectedProgramIds([]);
      setSelectedProductId("");
      setSelectedDeviceCategory("");
      setSelectedManufacturer("");
      setSelectedModelName("");
      setSelectedRepairerId("");
    } catch (error: any) {
      console.error("Error adding assignment:", error);
      toast.error("Failed to add assignment: " + error.message);
    }
  };

  const handleDeleteAssignment = async (id: string) => {
    try {
      const { error } = await supabase
        .from("fulfillment_assignments")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Assignment deleted successfully");
      loadData();
    } catch (error: any) {
      console.error("Error deleting assignment:", error);
      toast.error("Failed to delete assignment: " + error.message);
    }
  };

  const getAssignmentLabel = (assignment: FulfillmentAssignment) => {
    if (assignment.program_ids && assignment.program_ids.length > 0) {
      const programNames = assignment.program_ids
        .map(id => programs.find(p => p.id === id)?.name || "Unknown")
        .join(", ");
      return `Programs: ${programNames}`;
    }
    if (assignment.manufacturer && assignment.model_name) {
      return `Device: ${assignment.manufacturer} ${assignment.model_name}`;
    }
    if (assignment.product_id) {
      const product = products.find(p => p.id === assignment.product_id);
      return `Product: ${product?.name || "Unknown"}`;
    }
    if (assignment.device_category) {
      return `Device Category: ${assignment.device_category}`;
    }
    return "Unknown";
  };

  // Country code to name mapping
  const countryCodeToName: Record<string, string> = {
    'DE': 'Germany',
    'ES': 'Spain',
    'FR': 'France',
    'IT': 'Italy',
    'UK': 'United Kingdom',
    'IE': 'Ireland',
    'NL': 'Netherlands',
    'BE': 'Belgium',
    'AT': 'Austria',
    'CH': 'Switzerland',
  };

  // Filter repairers based on selected programs and device category
  const filteredRepairers = repairers.filter(repairer => {
    // If no programs selected yet, show all repairers
    if (selectedProgramIds.length === 0) {
      return true;
    }

    // Filter by device category specializations (only if repairer has specializations)
    if (assignmentType === "device_category" && selectedDeviceCategory && repairer.specializations && repairer.specializations.length > 0) {
      const hasSpecialization = repairer.specializations.some(spec => 
        spec.toLowerCase().includes(selectedDeviceCategory.toLowerCase()) ||
        selectedDeviceCategory.toLowerCase().includes(spec.toLowerCase())
      );
      if (!hasSpecialization) {
        return false;
      }
    }
    
    // Filter by device category specializations for specific device assignments (only if repairer has specializations)
    if (assignmentType === "device" && selectedManufacturer && selectedModelName && repairer.specializations && repairer.specializations.length > 0) {
      const deviceData = models.find(m => 
        m.manufacturer === selectedManufacturer && m.model_name === selectedModelName
      );
      if (deviceData && deviceData.device_category) {
        const hasSpecialization = repairer.specializations.some(spec => 
          spec.toLowerCase().includes(deviceData.device_category.toLowerCase()) ||
          deviceData.device_category.toLowerCase().includes(spec.toLowerCase())
        );
        if (!hasSpecialization) {
          return false;
        }
      }
    }

    // Filter by program countries - require exact country match when program has country restrictions
    const selectedPrograms = programs.filter(p => selectedProgramIds.includes(p.id));
    const programCountries = selectedPrograms
      .flatMap(p => (p.settings?.countries || []))
      .filter((country): country is string => country !== undefined && country !== null);
    
    if (programCountries.length > 0) {
      // If program has country restrictions, repairer MUST have a country set
      if (!repairer.country) {
        return false;
      }
      
      // Map program country codes to full country names
      const programCountryNames = programCountries.map(code => 
        countryCodeToName[code] || code
      );
      
      const matchesCountry = programCountryNames.some(country => 
        country.toLowerCase() === repairer.country?.toLowerCase()
      );
      
      if (!matchesCountry) {
        return false;
      }
    }

    return true;
  });

  const filteredAssignments = assignments.filter(assignment => {
    const label = getAssignmentLabel(assignment).toLowerCase();
    const repairerName = assignment.repairers?.company_name?.toLowerCase() || "";
    const search = searchTerm.toLowerCase();
    return label.includes(search) || repairerName.includes(search);
  });

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add Fulfillment Assignment</CardTitle>
          <CardDescription>
            Assign fulfillment partners to programs, products, or device categories
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Programs (Select one or more)</Label>
              <div className="border rounded-md p-2 max-h-48 overflow-y-auto space-y-2">
                {programs.map(program => (
                  <label key={program.id} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-2 rounded">
                    <input
                      type="checkbox"
                      checked={selectedProgramIds.includes(program.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedProgramIds([...selectedProgramIds, program.id]);
                        } else {
                          setSelectedProgramIds(selectedProgramIds.filter(id => id !== program.id));
                        }
                      }}
                      className="h-4 w-4"
                    />
                    <span className="text-sm">{program.name}</span>
                  </label>
                ))}
                {programs.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-2">No programs available</p>
                )}
              </div>
              {selectedProgramIds.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  {selectedProgramIds.length} program{selectedProgramIds.length > 1 ? 's' : ''} selected
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Assignment Type</Label>
              <Select value={assignmentType} onValueChange={(value: any) => setAssignmentType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="product">By Product</SelectItem>
                  <SelectItem value="device_category">By Device Category</SelectItem>
                  <SelectItem value="device">By Specific Device</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {assignmentType === "product" && (
              <div className="space-y-2">
                <Label>Product</Label>
                <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map(product => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {assignmentType === "device_category" && (
              <div className="space-y-2">
                <Label>Device Category</Label>
                <Select value={selectedDeviceCategory} onValueChange={setSelectedDeviceCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {deviceCategories.map(category => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {assignmentType === "device" && (
              <>
                <div className="space-y-2">
                  <Label>Manufacturer</Label>
                  <Select value={selectedManufacturer} onValueChange={(value) => {
                    setSelectedManufacturer(value);
                    setSelectedModelName(""); // Reset model when manufacturer changes
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select manufacturer" />
                    </SelectTrigger>
                    <SelectContent>
                      {manufacturers.map(manufacturer => (
                        <SelectItem key={manufacturer} value={manufacturer}>
                          {manufacturer}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Model</Label>
                  <Select 
                    value={selectedModelName} 
                    onValueChange={setSelectedModelName}
                    disabled={!selectedManufacturer}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select model" />
                    </SelectTrigger>
                    <SelectContent>
                      {models
                        .filter(m => m.manufacturer === selectedManufacturer)
                        .map(model => (
                          <SelectItem key={`${model.manufacturer}-${model.model_name}`} value={model.model_name}>
                            {model.model_name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label>Fulfillment Partner (Optional)</Label>
              <div className="flex gap-2">
                <Select value={selectedRepairerId} onValueChange={setSelectedRepairerId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Any available repairer" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredRepairers.length === 0 ? (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        No repairers available for selected criteria
                      </div>
                    ) : (
                      filteredRepairers.map(repairer => (
                        <SelectItem key={repairer.id} value={repairer.id}>
                          {repairer.company_name} {repairer.country && `(${repairer.country})`}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {selectedRepairerId && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setSelectedRepairerId("")}
                    title="Clear selection"
                  >
                    ×
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Leave blank to allow dynamic selection at claim time
              </p>
            </div>
          </div>

          <Button onClick={handleAddAssignment} className="w-full md:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Add Assignment
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current Assignments</CardTitle>
          <CardDescription>
            Manage existing fulfillment partner assignments
          </CardDescription>
          <div className="flex items-center gap-2 mt-4">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search assignments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Assignment</TableHead>
                <TableHead>Device Category</TableHead>
                <TableHead>Fulfillment Partner</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAssignments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No assignments found
                  </TableCell>
                </TableRow>
              ) : (
                filteredAssignments.map(assignment => (
                  <TableRow key={assignment.id}>
                  <TableCell>{getAssignmentLabel(assignment)}</TableCell>
                  <TableCell>
                    {assignment.manufacturer && assignment.model_name ? (
                      <Badge variant="secondary">{assignment.manufacturer} {assignment.model_name}</Badge>
                    ) : assignment.device_category ? (
                      <Badge variant="outline">{assignment.device_category}</Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {assignment.repairer_id ? 
                      (assignment.repairers?.company_name || "Unknown") : 
                      <span className="text-muted-foreground italic">Any available repairer</span>
                    }
                  </TableCell>
                    <TableCell>
                      <Badge variant={assignment.is_active ? "default" : "secondary"}>
                        {assignment.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(assignment.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteAssignment(assignment.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}