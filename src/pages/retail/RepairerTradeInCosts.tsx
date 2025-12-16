import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Download, Upload, Search, RefreshCw } from "lucide-react";

interface Device {
  id: string;
  manufacturer: string;
  device_category: string;
  model_name: string;
  rrp: number;
  trade_in_faulty: number | null;
  refurb_buy: number | null;
  price_expiry: string | null;
}

export default function RepairerTradeInCosts() {
  const { user } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [filteredDevices, setFilteredDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [repairerCategories, setRepairerCategories] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      fetchRepairerCategories();
    }
  }, [user]);

  useEffect(() => {
    filterDevices();
  }, [devices, searchTerm]);

  const fetchRepairerCategories = async () => {
    try {
      // Get the user's repairer_id
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("repairer_id")
        .eq("id", user?.id)
        .single();

      if (profileError) throw profileError;

      if (!profileData?.repairer_id) {
        toast.error("No repairer assigned to your profile");
        setLoading(false);
        return;
      }

      // Get repairer's specializations (categories they support)
      const { data: repairerData, error: repairerError } = await supabase
        .from("repairers")
        .select("specializations")
        .eq("id", profileData.repairer_id)
        .single();

      if (repairerError) throw repairerError;

      const categories = repairerData?.specializations || [];
      setRepairerCategories(categories);
      
      // Fetch devices for these categories
      fetchDevices(categories);
    } catch (error: any) {
      toast.error("Failed to load repairer info: " + error.message);
      setLoading(false);
    }
  };

  const fetchDevices = async (categories: string[]) => {
    try {
      // Filter for smartphone, tablet, smartwatch categories
      const targetCategories = categories.filter(cat => 
        cat.toLowerCase().includes('phone') ||
        cat.toLowerCase().includes('tablet') ||
        cat.toLowerCase().includes('watch') ||
        cat.toLowerCase().includes('smartphone') ||
        cat.toLowerCase().includes('smartwatch')
      );

      if (targetCategories.length === 0) {
        // If no matching specializations, show all phone/tablet/watch devices
        const { data, error } = await supabase
          .from("devices")
          .select("id, manufacturer, device_category, model_name, rrp, trade_in_faulty, refurb_buy, price_expiry")
          .or('device_category.ilike.%phone%,device_category.ilike.%tablet%,device_category.ilike.%watch%')
          .order("manufacturer", { ascending: true })
          .order("model_name", { ascending: true });

        if (error) throw error;
        setDevices(data || []);
      } else {
        // Build filter for categories
        const categoryFilters = targetCategories.map(cat => `device_category.ilike.%${cat}%`).join(',');
        
        const { data, error } = await supabase
          .from("devices")
          .select("id, manufacturer, device_category, model_name, rrp, trade_in_faulty, refurb_buy, price_expiry")
          .or(categoryFilters)
          .order("manufacturer", { ascending: true })
          .order("model_name", { ascending: true });

        if (error) throw error;
        setDevices(data || []);
      }
    } catch (error: any) {
      toast.error("Failed to load devices: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const filterDevices = () => {
    if (!searchTerm) {
      setFilteredDevices(devices);
      return;
    }

    const filtered = devices.filter(d =>
      d.model_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.manufacturer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.device_category.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredDevices(filtered);
  };

  const handleDownloadCSV = () => {
    const headers = ['manufacturer', 'device_category', 'model_name', 'rrp', 'trade_in_faulty', 'refurb_buy', 'price_expiry'];
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
    a.download = `trade-in-costs-${new Date().toISOString().split('T')[0]}.csv`;
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

        let updatedCount = 0;
        for (let i = 1; i < lines.length; i++) {
          if (!lines[i].trim()) continue;

          const values = lines[i].split(',').map(v => v.trim());
          const rowData: Record<string, any> = {};

          headers.forEach((header, index) => {
            rowData[header] = values[index];
          });

          // Find the device by manufacturer, category, and model
          const device = devices.find(d =>
            d.manufacturer === rowData.manufacturer &&
            d.device_category === rowData.device_category &&
            d.model_name === rowData.model_name
          );

          if (device) {
            const updateData: Record<string, any> = {};
            
            if (rowData.trade_in_faulty && rowData.trade_in_faulty !== '') {
              updateData.trade_in_faulty = parseFloat(rowData.trade_in_faulty);
            }
            if (rowData.refurb_buy && rowData.refurb_buy !== '') {
              updateData.refurb_buy = parseFloat(rowData.refurb_buy);
            }
            if (rowData.price_expiry && rowData.price_expiry !== '') {
              updateData.price_expiry = rowData.price_expiry;
            }

            if (Object.keys(updateData).length > 0) {
              const { error } = await supabase
                .from("devices")
                .update(updateData)
                .eq("id", device.id);

              if (!error) updatedCount++;
            }
          }
        }

        toast.success(`Successfully updated ${updatedCount} devices`);
        fetchRepairerCategories();
      } catch (error: any) {
        toast.error("Failed to upload CSV: " + error.message);
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const isExpired = (date: string | null) => {
    if (!date) return false;
    return new Date(date) < new Date();
  };

  const isExpiringSoon = (date: string | null) => {
    if (!date) return false;
    const expiryDate = new Date(date);
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    return expiryDate <= threeDaysFromNow && expiryDate >= new Date();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Trade-In & Refurb Costs</h1>
        <p className="text-muted-foreground">
          View and update trade-in faulty and refurbished buy prices for devices
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Device Pricing</CardTitle>
              <CardDescription>
                {repairerCategories.length > 0 
                  ? `Devices for your categories: ${repairerCategories.join(', ')}`
                  : 'All smartphone, tablet and smartwatch devices'
                }
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleDownloadCSV}>
                <Download className="mr-2 h-4 w-4" />
                Download CSV
              </Button>
              <Input
                type="file"
                accept=".csv"
                onChange={handleCSVUpload}
                className="hidden"
                id="csv-upload"
              />
              <Button variant="outline" onClick={() => document.getElementById('csv-upload')?.click()}>
                <Upload className="mr-2 h-4 w-4" />
                Upload CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search devices..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Manufacturer</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead className="text-right">RRP</TableHead>
                    <TableHead className="text-right">Trade-In Faulty</TableHead>
                    <TableHead className="text-right">Refurb Buy</TableHead>
                    <TableHead>Price Expiry</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDevices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
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
                        <TableCell className="text-right">
                          {device.trade_in_faulty ? `£${device.trade_in_faulty.toFixed(2)}` : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          {device.refurb_buy ? `£${device.refurb_buy.toFixed(2)}` : '-'}
                        </TableCell>
                        <TableCell>
                          {device.price_expiry ? (
                            <span className={
                              isExpired(device.price_expiry) 
                                ? 'text-destructive font-medium'
                                : isExpiringSoon(device.price_expiry)
                                  ? 'text-orange-500 font-medium'
                                  : ''
                            }>
                              {new Date(device.price_expiry).toLocaleDateString()}
                              {isExpired(device.price_expiry) && ' (Expired)'}
                              {isExpiringSoon(device.price_expiry) && ' (Soon)'}
                            </span>
                          ) : '-'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <p className="text-sm text-muted-foreground">
              Total devices: {filteredDevices.length}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}