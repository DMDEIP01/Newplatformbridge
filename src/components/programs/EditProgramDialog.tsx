import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Upload, X, Check, ChevronsUpDown } from "lucide-react";
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


interface Program {
  id: string;
  name: string;
  description: string | null;
  data_isolation_enabled: boolean;
  settings?: any;
}

interface EditProgramDialogProps {
  program: Program;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditProgramDialog({ program, open, onOpenChange, onSuccess }: EditProgramDialogProps) {
  const [activeTab, setActiveTab] = useState("details");
  const [name, setName] = useState(program.name);
  const [description, setDescription] = useState(program.description || "");
  const [dataIsolation, setDataIsolation] = useState(program.data_isolation_enabled);
  const [loading, setLoading] = useState(false);

  // Fees
  const [insurerFee, setInsurerFee] = useState(program.settings?.insurerFee || "");
  const [tpaFee, setTpaFee] = useState(program.settings?.tpaFee || "");
  const [storeFee, setStoreFee] = useState(program.settings?.storeFee || "");

  // Portal Capabilities
  const [retailPortalEnabled, setRetailPortalEnabled] = useState(program.settings?.retailPortalEnabled || false);
  const [customerPortalEnabled, setCustomerPortalEnabled] = useState(program.settings?.customerPortalEnabled || false);

  // Advanced Modules
  const [commsModuleEnabled, setCommsModuleEnabled] = useState(program.settings?.commsModuleEnabled || false);
  const [powerBIEnabled, setPowerBIEnabled] = useState(program.settings?.powerBIEnabled || false);
  const [dynamicFulfillmentEnabled, setDynamicFulfillmentEnabled] = useState(program.settings?.dynamicFulfillmentEnabled || false);

  // Countries, Languages, Currencies
  const [countries, setCountries] = useState<string[]>(program.settings?.countries || []);
  const [languages, setLanguages] = useState<string[]>(program.settings?.languages || []);
  const [currencies, setCurrencies] = useState<string[]>(program.settings?.currencies || []);

  // Entity Management
  const [underwriters, setUnderwriters] = useState<any[]>(program.settings?.underwriters || []);
  const [tpas, setTpas] = useState<any[]>(program.settings?.tpas || []);

  // Language
  const [defaultLanguage, setDefaultLanguage] = useState(program.settings?.defaultLanguage || "en");
  const [previewLanguage, setPreviewLanguage] = useState("en");
  const [countriesOpen, setCountriesOpen] = useState(false);
  const [languagesOpen, setLanguagesOpen] = useState(false);
  const [currenciesOpen, setCurrenciesOpen] = useState(false);

  useEffect(() => {
    setName(program.name);
    setDescription(program.description || "");
    setDataIsolation(program.data_isolation_enabled);
    setInsurerFee(program.settings?.insurerFee || "");
    setTpaFee(program.settings?.tpaFee || "");
    setStoreFee(program.settings?.storeFee || "");
    setRetailPortalEnabled(program.settings?.retailPortalEnabled || false);
    setCustomerPortalEnabled(program.settings?.customerPortalEnabled || false);
    setCommsModuleEnabled(program.settings?.commsModuleEnabled || false);
    setPowerBIEnabled(program.settings?.powerBIEnabled || false);
    setDynamicFulfillmentEnabled(program.settings?.dynamicFulfillmentEnabled || false);
    setUnderwriters(program.settings?.underwriters || []);
    setTpas(program.settings?.tpas || []);
    setDefaultLanguage(program.settings?.defaultLanguage || "en");
    setPreviewLanguage("en");
    setCountries(program.settings?.countries || []);
    setLanguages(program.settings?.languages || []);
    setCurrencies(program.settings?.currencies || []);
  }, [program]);

  const handleDownloadTranslations = () => {
    const translations = {
      retailPortal: {
        navigation: {
          dashboard: "Dashboard",
          sales: "Sales",
          policySearch: "Policy Search",
          makeClaim: "Make Claim",
          claims: "Claims",
          claimsManagement: "Claims Management",
          complaintsManagement: "Complaints Management",
          repairerJobs: "Repairer Jobs",
          serviceRequest: "Service Request",
          reports: "Reports",
          consultants: "Consultants"
        },
        common: {
          search: "Search",
          save: "Save",
          cancel: "Cancel",
          submit: "Submit",
          edit: "Edit",
          delete: "Delete"
        }
      },
      customerPortal: {
        navigation: {
          policies: "Policies",
          claims: "Claims",
          payments: "Payments",
          documents: "Documents",
          complaints: "Complaints"
        },
        common: {
          viewDetails: "View Details",
          downloadDocument: "Download Document",
          submitClaim: "Submit Claim"
        }
      },
      programConfiguration: {
        sections: {
          programs: "Programs",
          productManagement: "Product Management",
          deviceManagement: "Device Management",
          userGroups: "User Groups",
          userManagement: "User Management"
        }
      }
    };

    const blob = new Blob([JSON.stringify(translations, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name.replace(/\s+/g, "-").toLowerCase()}-translations-${defaultLanguage}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Translation file downloaded");
  };

  const handleUploadTranslations = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const translations = JSON.parse(event.target?.result as string);
        console.log("Uploaded translations:", translations);
        toast.success("Translations uploaded successfully");
      } catch (error) {
        toast.error("Invalid translation file format");
      }
    };
    reader.readAsText(file);
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

  const toggleLanguage = (language: string) => {
    if (languages.includes(language)) {
      setLanguages(languages.filter((l) => l !== language));
    } else {
      setLanguages([...languages, language]);
    }
  };

  const toggleCurrency = (currency: string) => {
    if (currencies.includes(currency)) {
      setCurrencies(currencies.filter((c) => c !== currency));
    } else {
      setCurrencies([...currencies, currency]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const settings = {
      insurerFee,
      tpaFee,
      storeFee,
      retailPortalEnabled,
      customerPortalEnabled,
      commsModuleEnabled,
      powerBIEnabled,
      dynamicFulfillmentEnabled,
      underwriters,
      tpas,
      defaultLanguage,
      countries,
      languages,
      currencies
    };

    const { error } = await supabase
      .from("programs")
      .update({
        name,
        description: description || null,
        data_isolation_enabled: dataIsolation,
        settings
      })
      .eq("id", program.id);

    setLoading(false);

    if (error) {
      toast.error("Failed to update program");
      console.error(error);
    } else {
      toast.success("Program updated successfully");
      onSuccess();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full h-[95vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Program</DialogTitle>
            <DialogDescription>
              Update program configuration and settings
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-4">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="fees">Fees</TabsTrigger>
              <TabsTrigger value="capability">Capability</TabsTrigger>
              <TabsTrigger value="localization">Localization</TabsTrigger>
              <TabsTrigger value="language">Language</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Program Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., MediaMarkt UK Program"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Brief description of the program..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
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

              <div className="space-y-2">
                <Label>Languages *</Label>
                <p className="text-sm text-muted-foreground mb-2">Select all supported languages (click to toggle)</p>
                <Popover open={languagesOpen} onOpenChange={setLanguagesOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      {languages.length > 0
                        ? `${languages.length} languages selected`
                        : "Select languages"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search languages..." />
                      <CommandEmpty>No language found.</CommandEmpty>
                      <CommandGroup className="max-h-64 overflow-auto">
                        {LANGUAGES.map((language) => (
                          <CommandItem
                            key={language.value}
                            value={language.value}
                            onSelect={() => toggleLanguage(language.value)}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                languages.includes(language.value) ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {language.label}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
                {languages.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {languages.map(lang => (
                      <Badge key={lang} variant="secondary" className="gap-1">
                        {LANGUAGES.find(l => l.value === lang)?.label}
                        <X
                          className="h-3 w-3 cursor-pointer"
                          onClick={() => toggleLanguage(lang)}
                        />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Currencies *</Label>
                <p className="text-sm text-muted-foreground mb-2">Select all accepted currencies (click to toggle)</p>
                <Popover open={currenciesOpen} onOpenChange={setCurrenciesOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      {currencies.length > 0
                        ? `${currencies.length} currencies selected`
                        : "Select currencies"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search currencies..." />
                      <CommandEmpty>No currency found.</CommandEmpty>
                      <CommandGroup className="max-h-64 overflow-auto">
                        {CURRENCIES.map((currency) => (
                          <CommandItem
                            key={currency.value}
                            value={currency.value}
                            onSelect={() => toggleCurrency(currency.value)}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                currencies.includes(currency.value) ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {currency.label}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
                {currencies.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {currencies.map(curr => (
                      <Badge key={curr} variant="secondary" className="gap-1">
                        {CURRENCIES.find(c => c.value === curr)?.label}
                        <X
                          className="h-3 w-3 cursor-pointer"
                          onClick={() => toggleCurrency(curr)}
                        />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="data-isolation" className="text-base">
                    Data Isolation
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Keep this program's data separate from other programs
                  </p>
                </div>
                <Switch
                  id="data-isolation"
                  checked={dataIsolation}
                  onCheckedChange={setDataIsolation}
                />
              </div>
            </TabsContent>

            <TabsContent value="fees" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Fee Structure</CardTitle>
                  <CardDescription>
                    Configure the fee percentages for this program
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="insurer-fee">Insurer Fee (%)</Label>
                    <Input
                      id="insurer-fee"
                      type="number"
                      step="0.01"
                      placeholder="e.g., 5.5"
                      value={insurerFee}
                      onChange={(e) => setInsurerFee(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tpa-fee">TPA Fee (%)</Label>
                    <Input
                      id="tpa-fee"
                      type="number"
                      step="0.01"
                      placeholder="e.g., 3.0"
                      value={tpaFee}
                      onChange={(e) => setTpaFee(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="store-fee">Store Fee (%)</Label>
                    <Input
                      id="store-fee"
                      type="number"
                      step="0.01"
                      placeholder="e.g., 2.5"
                      value={storeFee}
                      onChange={(e) => setStoreFee(e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="capability" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Portal Capabilities</CardTitle>
                  <CardDescription>
                    Enable or disable portal access for different user types
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <Label htmlFor="retail-portal" className="text-base">
                        Retail Portal
                      </Label>
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
                  <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <Label htmlFor="customer-portal" className="text-base">
                        Customer Portal
                      </Label>
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
                  <CardDescription>
                    Optional features and integrations
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <Label htmlFor="comms-module" className="text-base">
                        Communications Module
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Automated email and SMS notifications
                      </p>
                    </div>
                    <Switch
                      id="comms-module"
                      checked={commsModuleEnabled}
                      onCheckedChange={setCommsModuleEnabled}
                    />
                  </div>
                  <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <Label htmlFor="power-bi" className="text-base">
                        Power BI Integration
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Advanced analytics and reporting dashboards
                      </p>
                    </div>
                    <Switch
                      id="power-bi"
                      checked={powerBIEnabled}
                      onCheckedChange={setPowerBIEnabled}
                    />
                  </div>
                  <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <Label htmlFor="dynamic-fulfillment" className="text-base">
                        Dynamic Fulfillment
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Intelligent routing and automated fulfillment workflows
                      </p>
                    </div>
                    <Switch
                      id="dynamic-fulfillment"
                      checked={dynamicFulfillmentEnabled}
                      onCheckedChange={setDynamicFulfillmentEnabled}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="localization" className="space-y-4 mt-4">
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

              <Card>
                <CardHeader>
                  <CardTitle>Translation Management</CardTitle>
                  <CardDescription>
                    Download and upload translation files for localization
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleDownloadTranslations}
                      className="flex-1"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download Translations
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById("upload-translations")?.click()}
                      className="flex-1"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Translations
                    </Button>
                    <input
                      id="upload-translations"
                      type="file"
                      accept=".json"
                      onChange={handleUploadTranslations}
                      className="hidden"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Download the translation template, translate the text, and upload it back to apply translations.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="language" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Language Settings</CardTitle>
                  <CardDescription>
                    Configure the default language for this program
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="default-language">Default Language</Label>
                    <Select value={defaultLanguage} onValueChange={(value) => {
                      console.log('Language changed to:', value);
                      setDefaultLanguage(value);
                      setPreviewLanguage("en"); // Reset preview to English when changing language
                    }}>
                      <SelectTrigger id="default-language" className="bg-background">
                        <SelectValue placeholder="Select language" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover">
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="de">German (Deutsch)</SelectItem>
                        <SelectItem value="fr">French (Français)</SelectItem>
                        <SelectItem value="es">Spanish (Español)</SelectItem>
                        <SelectItem value="it">Italian (Italiano)</SelectItem>
                        <SelectItem value="nl">Dutch (Nederlands)</SelectItem>
                        <SelectItem value="pt">Portuguese (Português)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground">Current: {defaultLanguage}</p>
                  </div>

                  {defaultLanguage !== "en" && (
                    <div className="space-y-4 pt-4 border-t">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="language-preview-toggle">Language Preview</Label>
                          <p className="text-sm text-muted-foreground">
                            Toggle between English and {defaultLanguage === "de" ? "German" : 
                              defaultLanguage === "fr" ? "French" : 
                              defaultLanguage === "es" ? "Spanish" : 
                              defaultLanguage === "it" ? "Italian" : 
                              defaultLanguage === "nl" ? "Dutch" : "Portuguese"} to preview interface
                          </p>
                        </div>
                        <Switch
                          id="language-preview-toggle"
                          checked={previewLanguage === defaultLanguage}
                          onCheckedChange={(checked) => setPreviewLanguage(checked ? defaultLanguage : "en")}
                        />
                      </div>
                      
                      <div className="p-4 bg-muted rounded-lg space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Current Preview Language:</span>
                          <span className="text-sm font-semibold">
                            {previewLanguage === "en" ? "English" : 
                              previewLanguage === "de" ? "German (Deutsch)" : 
                              previewLanguage === "fr" ? "French (Français)" : 
                              previewLanguage === "es" ? "Spanish (Español)" : 
                              previewLanguage === "it" ? "Italian (Italiano)" : 
                              previewLanguage === "nl" ? "Dutch (Nederlands)" : "Portuguese (Português)"}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          This language preview will be applied to:
                        </p>
                        <ul className="text-xs text-muted-foreground list-disc list-inside space-y-1">
                          <li>Program Configuration Interface</li>
                          <li>Retail Portal</li>
                          <li>Customer Portal</li>
                        </ul>
                      </div>

                      <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <p className="text-sm text-blue-900 dark:text-blue-100">
                          <strong>Note:</strong> To fully enable multi-language support, download the translation file, 
                          translate the text to your selected language, and upload it back using the Translation Management 
                          in the Localization tab.
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !name.trim()}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
