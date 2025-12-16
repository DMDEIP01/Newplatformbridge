import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Upload, Search, Edit, Trash2, Download } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { CreateDeviceDialog } from "./CreateDeviceDialog";
import { EditDeviceDialog } from "./EditDeviceDialog";
import { ManageDeviceCategoriesDialog } from "./ManageDeviceCategoriesDialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useNavigate } from "react-router-dom";

interface Device {
  id: string;
  manufacturer: string;
  device_category: string;
  model_name: string;
  rrp: number;
  include_in_promos: boolean;
  external_reference: string | null;
  manufacturer_warranty_months: number | null;
  trade_in_faulty: number | null;
  refurb_buy: number | null;
  price_expiry: string | null;
}

export function DevicesList() {
  const navigate = useNavigate();
  const [devices, setDevices] = useState<Device[]>([]);
  const [filteredDevices, setFilteredDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [manufacturerFilter, setManufacturerFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [manageCategoriesOpen, setManageCategoriesOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deviceToDelete, setDeviceToDelete] = useState<Device | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deviceToEdit, setDeviceToEdit] = useState<Device | null>(null);
  const [sortField, setSortField] = useState<keyof Device | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const manufacturers = Array.from(new Set(devices.map(d => d.manufacturer))).sort();
  const categories = Array.from(new Set(devices.map(d => d.device_category))).sort();

  useEffect(() => {
    fetchDevices();
  }, []);

  useEffect(() => {
    filterDevices();
  }, [devices, searchTerm, manufacturerFilter, categoryFilter, sortField, sortDirection]);

  useEffect(() => {
    // Listen for trigger to open category dialog
    const handleTriggerDialog = () => {
      setManageCategoriesOpen(true);
    };

    window.addEventListener('trigger-category-dialog', handleTriggerDialog);
    return () => window.removeEventListener('trigger-category-dialog', handleTriggerDialog);
  }, []);

  const fetchDevices = async () => {
    try {
      const { data, error } = await supabase
        .from("devices")
        .select("*")
        .order("manufacturer", { ascending: true })
        .order("model_name", { ascending: true });

      if (error) throw error;
      setDevices(data || []);
    } catch (error: any) {
      toast.error("Failed to load devices");
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: keyof Device) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const filterDevices = () => {
    let filtered = devices;

    if (manufacturerFilter !== "all") {
      filtered = filtered.filter(d => d.manufacturer === manufacturerFilter);
    }

    if (categoryFilter !== "all") {
      filtered = filtered.filter(d => d.device_category === categoryFilter);
    }

    if (searchTerm) {
      filtered = filtered.filter(d => 
        d.model_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.manufacturer.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.device_category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.external_reference?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply sorting
    if (sortField) {
      filtered = [...filtered].sort((a, b) => {
        const aValue = a[sortField];
        const bValue = b[sortField];
        
        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;
        
        let comparison = 0;
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          comparison = aValue.localeCompare(bValue);
        } else if (typeof aValue === 'number' && typeof bValue === 'number') {
          comparison = aValue - bValue;
        } else {
          comparison = String(aValue).localeCompare(String(bValue));
        }
        
        return sortDirection === "asc" ? comparison : -comparison;
      });
    }

    setFilteredDevices(filtered);
  };

  const handleDownloadCSV = () => {
    const headers = ['manufacturer', 'model_name', 'device_category', 'rrp', 'include_in_promos', 'external_reference'];
    const csvContent = [
      headers.join(','),
      ...devices.map(device => 
        headers.map(header => {
          const value = device[header as keyof Device];
          return value !== null && value !== undefined ? value.toString() : '';
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `devices-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    toast.success("CSV downloaded successfully");
  };

  const handleCSVUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        
        const devicesToUpsert = [];
        for (let i = 1; i < lines.length; i++) {
          if (!lines[i].trim()) continue;
          
          const values = lines[i].split(',').map(v => v.trim());
          const device: any = {};
          
          headers.forEach((header, index) => {
            if (header === 'rrp') {
              device[header] = parseFloat(values[index]);
            } else if (header === 'include_in_promos') {
              device[header] = values[index].toLowerCase() === 'true';
            } else {
              device[header] = values[index] || null;
            }
          });
          
          devicesToUpsert.push(device);
        }

        // Use upsert to insert or update based on external_reference
        const { error } = await supabase
          .from("devices")
          .upsert(devicesToUpsert, { 
            onConflict: 'external_reference',
            ignoreDuplicates: false 
          });

        if (error) throw error;

        toast.success(`Successfully uploaded ${devicesToUpsert.length} devices`);
        fetchDevices();
      } catch (error: any) {
        toast.error("Failed to upload CSV: " + error.message);
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const handlePromoToggle = async (device: Device) => {
    try {
      const { error } = await supabase
        .from("devices")
        .update({ include_in_promos: !device.include_in_promos })
        .eq("id", device.id);

      if (error) throw error;

      toast.success("Promo status updated");
      fetchDevices();
    } catch (error: any) {
      toast.error("Failed to update promo status");
    }
  };

  const handleDelete = async () => {
    if (!deviceToDelete) return;

    try {
      const { error } = await supabase
        .from("devices")
        .delete()
        .eq("id", deviceToDelete.id);

      if (error) throw error;

      toast.success("Device deleted successfully");
      fetchDevices();
    } catch (error: any) {
      toast.error("Failed to delete device");
    } finally {
      setDeleteDialogOpen(false);
      setDeviceToDelete(null);
    }
  };

  if (loading) {
    return <div>Loading devices...</div>;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Device Management</CardTitle>
              <CardDescription>
                Manage devices by manufacturer and category
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Input
                type="file"
                accept=".csv"
                onChange={handleCSVUpload}
                className="hidden"
                id="csv-upload"
              />
              <Button variant="outline" onClick={handleDownloadCSV}>
                <Download className="mr-2 h-4 w-4" />
                Download CSV
              </Button>
              <Button variant="outline" onClick={() => document.getElementById('csv-upload')?.click()}>
                <Upload className="mr-2 h-4 w-4" />
                Upload CSV
              </Button>
              <Button 
                variant="outline"
                onClick={() => setManageCategoriesOpen(true)}
              >
                Manage Categories
              </Button>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Device
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search devices..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={manufacturerFilter} onValueChange={setManufacturerFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Manufacturers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Manufacturers</SelectItem>
                  {manufacturers.map(m => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 select-none transition-colors"
                      onClick={() => handleSort("manufacturer")}
                    >
                      <div className="flex items-center gap-2">
                        Manufacturer
                        {sortField === "manufacturer" && (
                          <span className="text-xs">{sortDirection === "asc" ? "↑" : "↓"}</span>
                        )}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 select-none transition-colors"
                      onClick={() => handleSort("device_category")}
                    >
                      <div className="flex items-center gap-2">
                        Category
                        {sortField === "device_category" && (
                          <span className="text-xs">{sortDirection === "asc" ? "↑" : "↓"}</span>
                        )}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50 select-none transition-colors"
                      onClick={() => handleSort("model_name")}
                    >
                      <div className="flex items-center gap-2">
                        Model
                        {sortField === "model_name" && (
                          <span className="text-xs">{sortDirection === "asc" ? "↑" : "↓"}</span>
                        )}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="text-right cursor-pointer hover:bg-muted/50 select-none transition-colors"
                      onClick={() => handleSort("rrp")}
                    >
                      <div className="flex items-center justify-end gap-2">
                        RRP
                        {sortField === "rrp" && (
                          <span className="text-xs">{sortDirection === "asc" ? "↑" : "↓"}</span>
                        )}
                      </div>
                    </TableHead>
                    <TableHead>Promos</TableHead>
                    <TableHead className="text-right">Trade-in Faulty</TableHead>
                    <TableHead className="text-right">Refurb Buy</TableHead>
                    <TableHead>Price Expiry</TableHead>
                    <TableHead>Warranty</TableHead>
                    <TableHead>External Ref</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDevices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center text-muted-foreground">
                        No devices found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredDevices.map((device) => (
                      <TableRow key={device.id}>
                        <TableCell className="font-medium">{device.manufacturer}</TableCell>
                        <TableCell>{device.device_category}</TableCell>
                        <TableCell>{device.model_name}</TableCell>
                        <TableCell className="text-right">£{device.rrp.toFixed(2)}</TableCell>
                        <TableCell>
                          <Checkbox 
                            checked={device.include_in_promos}
                            onCheckedChange={() => handlePromoToggle(device)}
                          />
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {device.trade_in_faulty ? `£${device.trade_in_faulty.toFixed(2)}` : "-"}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {device.refurb_buy ? `£${device.refurb_buy.toFixed(2)}` : "-"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {device.price_expiry ? new Date(device.price_expiry).toLocaleDateString() : "-"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {device.manufacturer_warranty_months 
                            ? `${device.manufacturer_warranty_months}m` 
                            : <span className="text-xs italic">Category default</span>}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {device.external_reference || "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setDeviceToEdit(device);
                                setEditDialogOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setDeviceToDelete(device);
                                setDeleteDialogOpen(true);
                              }}
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
            </div>
          </div>
        </CardContent>
      </Card>

      <CreateDeviceDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={fetchDevices}
      />

      <EditDeviceDialog
        device={deviceToEdit}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSuccess={fetchDevices}
      />

      <ManageDeviceCategoriesDialog
        open={manageCategoriesOpen}
        onOpenChange={setManageCategoriesOpen}
        onSuccess={fetchDevices}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Device</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deviceToDelete?.model_name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
