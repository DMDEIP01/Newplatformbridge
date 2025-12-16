import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CreateRepairerDialog from "./CreateRepairerDialog";
import CreateRepairerUserDialog from "./CreateRepairerUserDialog";
import EditRepairerDialog from "./EditRepairerDialog";

const COUNTRIES = [
  "United Kingdom", "Germany", "France", "Spain", "Italy", "Netherlands", 
  "Belgium", "Austria", "Switzerland", "Poland", "Sweden", "Norway", 
  "Denmark", "Finland", "Ireland", "Portugal", "Greece", "Czech Republic",
  "Hungary", "Romania", "Bulgaria", "Croatia", "Slovakia", "Slovenia",
  "Lithuania", "Latvia", "Estonia", "Luxembourg", "Malta", "Cyprus",
  "United States", "Canada", "Australia", "New Zealand", "Japan",
  "South Korea", "Singapore", "India", "China", "Brazil", "Mexico",
  "Argentina", "South Africa", "Egypt", "United Arab Emirates", "Saudi Arabia",
  "Turkey", "Russia", "Ukraine", "Israel"
];

interface Repairer {
  id: string;
  name: string;
  company_name: string;
  contact_email: string;
  contact_phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  postcode: string | null;
  country: string | null;
  coverage_areas: string[] | null;
  specializations: string[] | null;
  connectivity_type: string | null;
  is_active: boolean;
  created_at: string;
}

export function RepairersManager() {
  const [repairers, setRepairers] = useState<Repairer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [countryFilter, setCountryFilter] = useState<string>("");
  const [selectedRepairer, setSelectedRepairer] = useState<Repairer | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  useEffect(() => {
    loadRepairers();
  }, []);

  const loadRepairers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("repairers")
        .select("*")
        .order("company_name");

      if (error) throw error;
      setRepairers(data || []);
    } catch (error: any) {
      console.error("Error loading repairers:", error);
      toast.error(error.message || "Failed to load repairers");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (repairer: Repairer) => {
    setSelectedRepairer(repairer);
    setEditDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this repairer?")) return;

    try {
      const { error } = await supabase.from("repairers").delete().eq("id", id);

      if (error) throw error;
      toast.success("Repairer deleted successfully");
      loadRepairers();
    } catch (error: any) {
      console.error("Error deleting repairer:", error);
      toast.error(error.message || "Failed to delete repairer");
    }
  };

  const filteredRepairers = repairers.filter(repairer => {
    const search = searchTerm.toLowerCase();
    const matchesSearch = 
      repairer.company_name.toLowerCase().includes(search) ||
      repairer.name.toLowerCase().includes(search) ||
      repairer.contact_email.toLowerCase().includes(search);
    
    const matchesCountry = !countryFilter || repairer.country === countryFilter;
    
    return matchesSearch && matchesCountry;
  });

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Fulfillment Partners</CardTitle>
              <CardDescription>
                Manage repairer companies and their user accounts
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <CreateRepairerDialog onRepairerCreated={loadRepairers} />
              <CreateRepairerUserDialog onUserCreated={loadRepairers} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search repairers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={countryFilter} onValueChange={setCountryFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by country" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" onClick={() => setCountryFilter("")}>All Countries</SelectItem>
                {COUNTRIES.map((country) => (
                  <SelectItem key={country} value={country}>
                    {country}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
              <TableRow>
                <TableHead>Company Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Connectivity</TableHead>
                <TableHead>Coverage Areas</TableHead>
                <TableHead>Specializations</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRepairers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      {searchTerm ? "No repairers found matching your search" : "No repairers yet"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRepairers.map((repairer) => (
                    <TableRow key={repairer.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleEdit(repairer)}>
                      <TableCell className="font-medium">{repairer.company_name}</TableCell>
                      <TableCell>
                        <div>
                          <div>{repairer.name}</div>
                          {repairer.contact_phone && (
                            <div className="text-sm text-muted-foreground">{repairer.contact_phone}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{repairer.contact_email}</TableCell>
                      <TableCell>
                        {repairer.connectivity_type ? (
                          <Badge variant="outline">{repairer.connectivity_type}</Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">Not set</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {repairer.coverage_areas && repairer.coverage_areas.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {repairer.coverage_areas.slice(0, 2).map((area, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {area}
                              </Badge>
                            ))}
                            {repairer.coverage_areas.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{repairer.coverage_areas.length - 2}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {repairer.specializations && repairer.specializations.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {repairer.specializations.slice(0, 2).map((spec, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {spec}
                              </Badge>
                            ))}
                            {repairer.specializations.length > 2 && (
                              <Badge variant="secondary" className="text-xs">
                                +{repairer.specializations.length - 2}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={repairer.is_active ? "default" : "secondary"}>
                          {repairer.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(repairer)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(repairer.id)}
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
        </CardContent>
      </Card>

      <EditRepairerDialog
        repairer={selectedRepairer}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onRepairerUpdated={loadRepairers}
      />
    </div>
  );
}
