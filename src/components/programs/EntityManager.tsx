import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Check, ChevronsUpDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const COUNTRIES = [
  { value: "US", label: "United States" },
  { value: "GB", label: "United Kingdom" },
  { value: "CA", label: "Canada" },
  { value: "AU", label: "Australia" },
  { value: "DE", label: "Germany" },
  { value: "FR", label: "France" },
  { value: "IT", label: "Italy" },
  { value: "ES", label: "Spain" },
  { value: "NL", label: "Netherlands" },
  { value: "BR", label: "Brazil" },
  { value: "IN", label: "India" },
  { value: "CN", label: "China" },
  { value: "JP", label: "Japan" },
  { value: "MX", label: "Mexico" },
  { value: "AR", label: "Argentina" },
  { value: "BE", label: "Belgium" },
  { value: "CH", label: "Switzerland" },
  { value: "SE", label: "Sweden" },
  { value: "NO", label: "Norway" },
  { value: "DK", label: "Denmark" },
  { value: "FI", label: "Finland" },
  { value: "PL", label: "Poland" },
  { value: "PT", label: "Portugal" },
  { value: "GR", label: "Greece" },
  { value: "AT", label: "Austria" },
  { value: "IE", label: "Ireland" },
  { value: "NZ", label: "New Zealand" },
  { value: "SG", label: "Singapore" },
  { value: "HK", label: "Hong Kong" },
  { value: "KR", label: "South Korea" },
  { value: "ZA", label: "South Africa" },
  { value: "AE", label: "United Arab Emirates" },
  { value: "SA", label: "Saudi Arabia" },
  { value: "TR", label: "Turkey" },
  { value: "RU", label: "Russia" },
  { value: "ID", label: "Indonesia" },
  { value: "TH", label: "Thailand" },
  { value: "MY", label: "Malaysia" },
  { value: "PH", label: "Philippines" },
  { value: "VN", label: "Vietnam" },
  { value: "CL", label: "Chile" },
  { value: "CO", label: "Colombia" },
  { value: "PE", label: "Peru" },
  { value: "CZ", label: "Czech Republic" },
  { value: "HU", label: "Hungary" },
  { value: "RO", label: "Romania" },
  { value: "IL", label: "Israel" },
  { value: "EG", label: "Egypt" },
  { value: "NG", label: "Nigeria" },
  { value: "KE", label: "Kenya" },
];

const DEVICE_CATEGORIES = [
  "Smartphones",
  "Tablets",
  "Laptops",
  "Wearables",
  "Gaming Consoles",
  "Cameras",
  "Audio Equipment",
  "Home Appliances",
];

export interface Entity {
  id: string;
  name: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  postcode: string;
  country: string;
  countries: string[];
  deviceCategories: string[];
}

interface EntityManagerProps {
  title: string;
  description: string;
  entities: Entity[];
  onChange: (entities: Entity[]) => void;
}

export function EntityManager({ title, description, entities, onChange }: EntityManagerProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Entity>>({
    name: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    postcode: "",
    country: "",
    countries: [],
    deviceCategories: [],
  });
  const [countriesOpen, setCountriesOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);

  const handleAdd = () => {
    if (!formData.name?.trim() || !formData.addressLine1?.trim() || !formData.city?.trim() || !formData.country?.trim()) {
      return;
    }

    const newEntity: Entity = {
      id: crypto.randomUUID(),
      name: formData.name,
      addressLine1: formData.addressLine1,
      addressLine2: formData.addressLine2 || "",
      city: formData.city || "",
      postcode: formData.postcode || "",
      country: formData.country,
      countries: formData.countries || [],
      deviceCategories: formData.deviceCategories || [],
    };

    onChange([...entities, newEntity]);
    setFormData({ 
      name: "", 
      addressLine1: "", 
      addressLine2: "", 
      city: "",
      postcode: "", 
      country: "",
      countries: [], 
      deviceCategories: [] 
    });
    setDialogOpen(false);
  };

  const handleEdit = (entity: Entity) => {
    setEditingId(entity.id);
    setFormData(entity);
    setDialogOpen(true);
  };

  const handleUpdate = () => {
    if (!editingId || !formData.name?.trim() || !formData.addressLine1?.trim() || !formData.city?.trim() || !formData.country?.trim()) {
      return;
    }

    onChange(
      entities.map((e) =>
        e.id === editingId
          ? {
              ...e,
              name: formData.name!,
              addressLine1: formData.addressLine1!,
              addressLine2: formData.addressLine2 || "",
              city: formData.city || "",
              postcode: formData.postcode || "",
              country: formData.country!,
              countries: formData.countries || [],
              deviceCategories: formData.deviceCategories || [],
            }
          : e
      )
    );

    setEditingId(null);
    setFormData({ 
      name: "", 
      addressLine1: "", 
      addressLine2: "", 
      city: "",
      postcode: "", 
      country: "",
      countries: [], 
      deviceCategories: [] 
    });
    setDialogOpen(false);
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData({ 
      name: "", 
      addressLine1: "", 
      addressLine2: "", 
      city: "",
      postcode: "", 
      country: "",
      countries: [], 
      deviceCategories: [] 
    });
    setDialogOpen(false);
  };

  const handleRemove = (id: string) => {
    onChange(entities.filter((e) => e.id !== id));
  };

  const toggleCountry = (country: string) => {
    const countries = formData.countries || [];
    if (countries.includes(country)) {
      setFormData({ ...formData, countries: countries.filter((c) => c !== country) });
    } else {
      setFormData({ ...formData, countries: [...countries, country] });
    }
  };

  const toggleDeviceCategory = (category: string) => {
    const categories = formData.deviceCategories || [];
    if (categories.includes(category)) {
      setFormData({ ...formData, deviceCategories: categories.filter((c) => c !== category) });
    } else {
      setFormData({ ...formData, deviceCategories: [...categories, category] });
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <p className="text-sm text-muted-foreground">{description}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add Button */}
          <Button
            type="button"
            onClick={() => setDialogOpen(true)}
            variant="outline"
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add {title}
          </Button>

          {/* List */}
          {entities.length > 0 && (
            <div className="space-y-3">
              {entities.map((entity) => (
                <Card key={entity.id}>
                  <CardContent className="pt-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h4 className="font-semibold">{entity.name}</h4>
                        <div className="text-sm text-muted-foreground mt-1 space-y-0.5">
                          <p>{entity.addressLine1}</p>
                          {entity.addressLine2 && <p>{entity.addressLine2}</p>}
                          <p>{entity.city}{entity.city && entity.postcode ? ", " : ""}{entity.postcode}</p>
                          <p>{COUNTRIES.find(c => c.value === entity.country)?.label}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(entity)}
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemove(entity.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {entity.countries && entity.countries.length > 0 && (
                      <div className="mt-2">
                        <Label className="text-xs">Countries</Label>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {entity.countries.map((countryCode) => (
                            <Badge key={countryCode} variant="secondary" className="text-xs">
                              {COUNTRIES.find((c) => c.value === countryCode)?.label || countryCode}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {entity.deviceCategories && entity.deviceCategories.length > 0 && (
                      <div className="mt-2">
                        <Label className="text-xs">Device Categories</Label>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {entity.deviceCategories.map((category) => (
                            <Badge key={category} variant="secondary" className="text-xs">
                              {category}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Full Screen Dialog for Form */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? `Edit ${title}` : `Add ${title}`}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={formData.name || ""}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter name"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Address Line 1 *</Label>
                <Input
                  value={formData.addressLine1 || ""}
                  onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
                  placeholder="Street address"
                />
              </div>

              <div className="space-y-2">
                <Label>Address Line 2</Label>
                <Input
                  value={formData.addressLine2 || ""}
                  onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
                  placeholder="Apt, suite, etc."
                />
              </div>

              <div className="space-y-2">
                <Label>City *</Label>
                <Input
                  value={formData.city || ""}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="City"
                />
              </div>

              <div className="space-y-2">
                <Label>Postcode</Label>
                <Input
                  value={formData.postcode || ""}
                  onChange={(e) => setFormData({ ...formData, postcode: e.target.value })}
                  placeholder="Postcode"
                />
              </div>

              <div className="space-y-2">
                <Label>Country *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      {formData.country 
                        ? COUNTRIES.find(c => c.value === formData.country)?.label 
                        : "Select country"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search country..." />
                      <CommandEmpty>No country found.</CommandEmpty>
                      <CommandGroup className="max-h-64 overflow-auto">
                        {COUNTRIES.map((country) => (
                          <CommandItem
                            key={country.value}
                            value={country.value}
                            onSelect={() => {
                              setFormData({ ...formData, country: country.value });
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                formData.country === country.value ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {country.label}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Operating Countries (Multi-select)</Label>
              <Popover open={countriesOpen} onOpenChange={setCountriesOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    {formData.countries && formData.countries.length > 0
                      ? `${formData.countries.length} selected`
                      : "Select countries"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search countries..." />
                    <CommandEmpty>No country found.</CommandEmpty>
                    <CommandGroup className="max-h-64 overflow-auto">
                      {COUNTRIES.map((country) => (
                        <CommandItem
                          key={country.value}
                          value={country.value}
                          onSelect={() => toggleCountry(country.value)}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              formData.countries?.includes(country.value) ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {country.label}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
              {formData.countries && formData.countries.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {formData.countries.map((countryCode) => (
                    <Badge key={countryCode} variant="secondary" className="text-xs">
                      {COUNTRIES.find((c) => c.value === countryCode)?.label || countryCode}
                      <X 
                        className="ml-1 h-3 w-3 cursor-pointer" 
                        onClick={() => toggleCountry(countryCode)}
                      />
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Device Categories Covered (Multi-select)</Label>
              <Popover open={categoriesOpen} onOpenChange={setCategoriesOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    {formData.deviceCategories && formData.deviceCategories.length > 0
                      ? `${formData.deviceCategories.length} selected`
                      : "Select categories"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search categories..." />
                    <CommandEmpty>No category found.</CommandEmpty>
                    <CommandGroup className="max-h-64 overflow-auto">
                      {DEVICE_CATEGORIES.map((category) => (
                        <CommandItem
                          key={category}
                          value={category}
                          onSelect={() => toggleDeviceCategory(category)}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              formData.deviceCategories?.includes(category) ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {category}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
              {formData.deviceCategories && formData.deviceCategories.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {formData.deviceCategories.map((category) => (
                    <Badge key={category} variant="secondary" className="text-xs">
                      {category}
                      <X 
                        className="ml-1 h-3 w-3 cursor-pointer" 
                        onClick={() => toggleDeviceCategory(category)}
                      />
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            {editingId ? (
              <Button type="button" onClick={handleUpdate}>
                Update
              </Button>
            ) : (
              <Button type="button" onClick={handleAdd}>
                Add {title}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}