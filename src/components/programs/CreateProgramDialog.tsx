import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Info, Download, Upload, Check, ChevronsUpDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { EntityManager, Entity } from "./EntityManager";

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "it", label: "Italian" },
  { value: "pt", label: "Portuguese" },
  { value: "nl", label: "Dutch" },
  { value: "pl", label: "Polish" },
  { value: "ru", label: "Russian" },
  { value: "zh", label: "Chinese" },
  { value: "ja", label: "Japanese" },
  { value: "ar", label: "Arabic" },
];

const CURRENCIES = [
  { value: "USD", label: "USD - US Dollar" },
  { value: "EUR", label: "EUR - Euro" },
  { value: "GBP", label: "GBP - British Pound" },
  { value: "JPY", label: "JPY - Japanese Yen" },
  { value: "AUD", label: "AUD - Australian Dollar" },
  { value: "CAD", label: "CAD - Canadian Dollar" },
  { value: "CHF", label: "CHF - Swiss Franc" },
  { value: "CNY", label: "CNY - Chinese Yuan" },
  { value: "INR", label: "INR - Indian Rupee" },
  { value: "BRL", label: "BRL - Brazilian Real" },
];

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

interface CreateProgramDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateProgramDialog({ open, onOpenChange, onSuccess }: CreateProgramDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [dataIsolation, setDataIsolation] = useState(true);
  const [languages, setLanguages] = useState<string[]>([]);
  const [currencies, setCurrencies] = useState<string[]>([]);
  const [countries, setCountries] = useState<string[]>([]);
  const [defaultLanguage, setDefaultLanguage] = useState<string>("en");
  const [retailPortalEnabled, setRetailPortalEnabled] = useState(false);
  const [customerPortalEnabled, setCustomerPortalEnabled] = useState(false);
  const [insurerFee, setInsurerFee] = useState<number>(0);
  const [tpaFee, setTpaFee] = useState<number>(0);
  const [storeFee, setStoreFee] = useState<number>(0);
  
  // Entity Management
  const [underwriters, setUnderwriters] = useState<any[]>([]);
  const [tpas, setTpas] = useState<any[]>([]);
  
  // Portal modules
  const [commsModuleEnabled, setCommsModuleEnabled] = useState(true);
  const [powerBIEnabled, setPowerBIEnabled] = useState(false);
  const [dynamicFulfillmentEnabled, setDynamicFulfillmentEnabled] = useState(false);
  
  const [countriesOpen, setCountriesOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const settings = {
      languages,
      currencies,
      countries,
      defaultLanguage,
      retailPortalEnabled,
      customerPortalEnabled,
      insurerFee,
      tpaFee,
      storeFee,
      underwriters,
      tpas,
      commsModuleEnabled,
      powerBIEnabled,
      dynamicFulfillmentEnabled,
    };

    const { error } = await supabase
      .from("programs")
      .insert({
        name,
        description: description || null,
        data_isolation_enabled: dataIsolation,
        settings: {
          languages,
          currencies,
          countries,
          underwriters,
          tpas,
          retail_portal_enabled: retailPortalEnabled,
          customer_portal_enabled: customerPortalEnabled,
          portal_modules: {
            comms: commsModuleEnabled,
            powerBI: powerBIEnabled,
            dynamicFulfillment: dynamicFulfillmentEnabled,
          },
          fees: {
            insurer: insurerFee,
            tpa: tpaFee,
            store: storeFee,
          },
        },
      });

    setLoading(false);

    if (error) {
      toast.error("Failed to create program");
      console.error(error);
    } else {
      toast.success("Program created successfully");
      setName("");
      setDescription("");
      setDataIsolation(true);
      setLanguages([]);
      setCurrencies([]);
      setCountries([]);
      setRetailPortalEnabled(false);
      setCustomerPortalEnabled(false);
      setUnderwriters([]);
      setTpas([]);
      setCommsModuleEnabled(true);
      setPowerBIEnabled(false);
      setDynamicFulfillmentEnabled(false);
      setInsurerFee(0);
      setTpaFee(0);
      setStoreFee(0);
      onSuccess();
      onOpenChange(false);
    }
  };

  const removeItem = (array: string[], setter: (arr: string[]) => void, value: string) => {
    setter(array.filter(item => item !== value));
  };

  const addItem = (array: string[], setter: (arr: string[]) => void, value: string) => {
    if (!array.includes(value)) {
      setter([...array, value]);
    }
  };

  const toggleCountry = (country: string) => {
    if (countries.includes(country)) {
      setCountries(countries.filter((c) => c !== country));
    } else {
      setCountries([...countries, country]);
    }
  };

  const handleDownloadTranslations = (portal: 'retail' | 'customer' | 'config') => {
    const translations = {
      portal,
      language: "en",
      translations: {
        "common.save": "Save",
        "common.cancel": "Cancel",
        "common.delete": "Delete",
        "dashboard.title": "Dashboard",
        "policies.title": "Policies",
      }
    };
    
    const blob = new Blob([JSON.stringify(translations, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${portal}-portal-translations-en.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success(`${portal} portal translations downloaded`);
  };

  const handleUploadTranslations = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        try {
          const text = await file.text();
          const data = JSON.parse(text);
          toast.success("Translations uploaded successfully");
        } catch (error) {
          toast.error("Failed to upload translations");
        }
      }
    };
    input.click();
  };

  const totalFees = insurerFee + tpaFee + storeFee;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Create New Program</DialogTitle>
          <DialogDescription>
            Configure a new deployment program with localization, portal settings, and fee structure
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col">
          <Tabs defaultValue="basic" className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="insurer">Insurer</TabsTrigger>
              <TabsTrigger value="localization">Localization</TabsTrigger>
              <TabsTrigger value="language">Language</TabsTrigger>
              <TabsTrigger value="capability">Capability</TabsTrigger>
              <TabsTrigger value="fees">Fees</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto py-4">
              <TabsContent value="basic" className="space-y-4 mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>Program Details</CardTitle>
                    <CardDescription>Basic information about the program</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="name">Program Name *</Label>
                      <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g., EU Retail Program"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Brief description of the program"
                        rows={3}
                      />
                    </div>

                    <div>
                      <Label>Countries Covered *</Label>
                      <p className="text-sm text-muted-foreground mb-2">Select all operational countries (click to toggle)</p>
                      <Popover open={countriesOpen} onOpenChange={setCountriesOpen}>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-between">
                            {countries.length > 0
                              ? `${countries.length} countries selected`
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
                                      countries.includes(country.value) ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {country.label}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      {countries.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {countries.map(country => (
                            <Badge key={country} variant="secondary" className="gap-1">
                              {COUNTRIES.find(c => c.value === country)?.label}
                              <X
                                className="h-3 w-3 cursor-pointer"
                                onClick={() => toggleCountry(country)}
                              />
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="data-isolation">Data Isolation</Label>
                          <Info className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Enable strict data isolation for this program's policies and claims
                        </p>
                      </div>
                      <Switch
                        id="data-isolation"
                        checked={dataIsolation}
                        onCheckedChange={setDataIsolation}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="insurer" className="space-y-4 mt-0">
                <EntityManager
                  title="Underwriter"
                  description="Manage underwriter information, addresses, countries, and device categories covered"
                  entities={underwriters}
                  onChange={setUnderwriters}
                />

                <EntityManager
                  title="TPA (Third Party Administrator)"
                  description="Manage TPA information, addresses, countries, and device categories covered"
                  entities={tpas}
                  onChange={setTpas}
                />
              </TabsContent>

              <TabsContent value="localization" className="space-y-4 mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>Regional Settings</CardTitle>
                    <CardDescription>Configure supported languages and currencies</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <Label>Languages *</Label>
                      <p className="text-sm text-muted-foreground mb-2">Select all supported languages</p>
                      <div className="flex gap-2 mb-3">
                        <Select
                          value={undefined}
                          onValueChange={(value) => addItem(languages, setLanguages, value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Add language" />
                          </SelectTrigger>
                          <SelectContent>
                            {LANGUAGES.filter(lang => !languages.includes(lang.value)).map(lang => (
                              <SelectItem key={lang.value} value={lang.value}>
                                {lang.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {languages.map(lang => (
                          <Badge key={lang} variant="secondary" className="gap-1">
                            {LANGUAGES.find(l => l.value === lang)?.label}
                            <X
                              className="h-3 w-3 cursor-pointer"
                              onClick={() => removeItem(languages, setLanguages, lang)}
                            />
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label>Currencies *</Label>
                      <p className="text-sm text-muted-foreground mb-2">Select all accepted currencies</p>
                      <div className="flex gap-2 mb-3">
                        <Select
                          value={undefined}
                          onValueChange={(value) => addItem(currencies, setCurrencies, value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Add currency" />
                          </SelectTrigger>
                          <SelectContent>
                            {CURRENCIES.filter(curr => !currencies.includes(curr.value)).map(curr => (
                              <SelectItem key={curr.value} value={curr.value}>
                                {curr.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {currencies.map(curr => (
                          <Badge key={curr} variant="secondary" className="gap-1">
                            {CURRENCIES.find(c => c.value === curr)?.label}
                            <X
                              className="h-3 w-3 cursor-pointer"
                              onClick={() => removeItem(currencies, setCurrencies, curr)}
                            />
                          </Badge>
                        ))}
                      </div>
                    </div>

                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Translation Management</CardTitle>
                    <CardDescription>
                      Download, translate, and upload portal text content
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <p className="font-medium">Retail Portal Translations</p>
                          <p className="text-sm text-muted-foreground">All text content from the retail portal</p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadTranslations('retail')}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      </div>

                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <p className="font-medium">Customer Portal Translations</p>
                          <p className="text-sm text-muted-foreground">All text content from the customer portal</p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadTranslations('customer')}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      </div>

                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <p className="font-medium">Program Configuration Translations</p>
                          <p className="text-sm text-muted-foreground">All text content from configuration pages</p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadTranslations('config')}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      </div>

                      <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                        <div>
                          <p className="font-medium">Upload Translated Content</p>
                          <p className="text-sm text-muted-foreground">Upload your translated JSON files</p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleUploadTranslations}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Upload
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="language" className="space-y-4 mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>Language Settings</CardTitle>
                    <CardDescription>Configure default language and language preferences</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="defaultLanguage">Default Language</Label>
                      <p className="text-sm text-muted-foreground mb-2">
                        The default language for this program
                      </p>
                      <Select value={defaultLanguage} onValueChange={setDefaultLanguage}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select default language" />
                        </SelectTrigger>
                        <SelectContent>
                          {LANGUAGES.map(lang => (
                            <SelectItem key={lang.value} value={lang.value}>
                              {lang.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="p-4 border rounded-lg bg-muted/30">
                      <p className="text-sm text-muted-foreground">
                        <Info className="h-4 w-4 inline mr-2" />
                        Users can change the displayed language based on their capability settings.
                        Make sure to configure languages in the Localization tab first.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="capability" className="space-y-4 mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>Portal Capabilities</CardTitle>
                    <CardDescription>Enable or disable portal access for different user types</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-0.5">
                        <Label htmlFor="retail-portal">Retail Portal</Label>
                        <p className="text-sm text-muted-foreground">
                          Enable access to the retail agent portal
                        </p>
                      </div>
                      <Switch
                        id="retail-portal"
                        checked={retailPortalEnabled}
                        onCheckedChange={setRetailPortalEnabled}
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-0.5">
                        <Label htmlFor="customer-portal">Customer Portal</Label>
                        <p className="text-sm text-muted-foreground">
                          Enable access to the customer self-service portal
                        </p>
                      </div>
                      <Switch
                        id="customer-portal"
                        checked={customerPortalEnabled}
                        onCheckedChange={setCustomerPortalEnabled}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Advanced Modules</CardTitle>
                    <CardDescription>Optional features and integrations</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-0.5">
                        <Label htmlFor="comms">Communications Module</Label>
                        <p className="text-sm text-muted-foreground">
                          Automated email and SMS notifications
                        </p>
                      </div>
                      <Switch
                        id="comms"
                        checked={commsModuleEnabled}
                        onCheckedChange={setCommsModuleEnabled}
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-0.5">
                        <Label htmlFor="powerbi">Power BI Integration</Label>
                        <p className="text-sm text-muted-foreground">
                          Advanced analytics and reporting dashboards
                        </p>
                      </div>
                      <Switch
                        id="powerbi"
                        checked={powerBIEnabled}
                        onCheckedChange={setPowerBIEnabled}
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-0.5">
                        <Label htmlFor="dynamicFulfillment">Dynamic Fulfillment</Label>
                        <p className="text-sm text-muted-foreground">
                          Intelligent routing and automated fulfillment workflows
                        </p>
                      </div>
                      <Switch
                        id="dynamicFulfillment"
                        checked={dynamicFulfillmentEnabled}
                        onCheckedChange={setDynamicFulfillmentEnabled}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="fees" className="space-y-4 mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>Fee Structure</CardTitle>
                    <CardDescription>Define fee percentages for each party in the insurance ecosystem</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="insurer-fee">Insurer Fee (%)</Label>
                        <Input
                          id="insurer-fee"
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={insurerFee}
                          onChange={(e) => setInsurerFee(parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                        />
                        <p className="text-xs text-muted-foreground">
                          Percentage retained by the insurer
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="tpa-fee">TPA Fee (%)</Label>
                        <Input
                          id="tpa-fee"
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={tpaFee}
                          onChange={(e) => setTpaFee(parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                        />
                        <p className="text-xs text-muted-foreground">
                          Percentage paid to Third Party Administrator
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="store-fee">Store Fee (%)</Label>
                        <Input
                          id="store-fee"
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={storeFee}
                          onChange={(e) => setStoreFee(parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                        />
                        <p className="text-xs text-muted-foreground">
                          Percentage paid to retail store
                        </p>
                      </div>
                    </div>

                    <div className="p-4 bg-muted/50 rounded-lg border">
                      <div className="flex items-center gap-2 mb-2">
                        <Info className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Total Fees</span>
                      </div>
                      <p className="text-2xl font-bold">
                        {totalFees.toFixed(2)}%
                      </p>
                      {totalFees > 100 && (
                        <p className="text-sm text-destructive mt-2">
                          Warning: Total fees exceed 100%
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </Tabs>

          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !name || languages.length === 0 || currencies.length === 0 || countries.length === 0}
            >
              {loading ? "Creating..." : "Create Program"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
