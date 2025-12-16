import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle } from "lucide-react";
import { deviceCategories, brandsByCategory, modelsByCategoryAndBrand, colorOptions, screenSizeOptions } from "@/lib/deviceConfig";

interface CoveredDevice {
  product_name: string;
  model: string;
  serial_number: string;
}

interface BreakdownStep2DeviceProps {
  insuredDevice: CoveredDevice | null;
  deviceInfoConfirmed: "" | "correct" | "incorrect";
  setDeviceInfoConfirmed: (value: "" | "correct" | "incorrect") => void;
  claimedDeviceName: string;
  setClaimedDeviceName: (value: string) => void;
  claimedDeviceModel: string;
  setClaimedDeviceModel: (value: string) => void;
  itemCategory: string;
  setItemCategory: (value: string) => void;
  itemMake: string;
  setItemMake: (value: string) => void;
  itemModel: string;
  setItemModel: (value: string) => void;
  itemColor: string;
  setItemColor: (value: string) => void;
  itemColorOther: string;
  setItemColorOther: (value: string) => void;
  itemSerialNumber: string;
  setItemSerialNumber: (value: string) => void;
  purchasePrice?: string;
  setPurchasePrice?: (value: string) => void;
  onBack: () => void;
  onContinue: () => void;
}

export default function BreakdownStep2Device({
  insuredDevice,
  deviceInfoConfirmed,
  setDeviceInfoConfirmed,
  claimedDeviceName,
  setClaimedDeviceName,
  claimedDeviceModel,
  setClaimedDeviceModel,
  itemCategory,
  setItemCategory,
  itemMake,
  setItemMake,
  itemModel,
  setItemModel,
  itemColor,
  setItemColor,
  itemColorOther,
  setItemColorOther,
  itemSerialNumber,
  setItemSerialNumber,
  purchasePrice,
  setPurchasePrice,
  onBack,
  onContinue,
}: BreakdownStep2DeviceProps) {
  const availableBrands = itemCategory ? (brandsByCategory[itemCategory] || ["Other"]) : [];
  const availableModels = itemCategory && itemMake ? (modelsByCategoryAndBrand[itemCategory]?.[itemMake] || ["Other"]) : [];
  
  const isOtherBrand = itemMake === "Other";
  const isOtherModel = itemModel === "Other";
  const isOtherColor = itemColor === "Other";

  const handleCategoryChange = (value: string) => {
    setItemCategory(value);
    setItemMake("");
    setItemModel("");
    setClaimedDeviceName("");
    setClaimedDeviceModel("");
  };

  const handleBrandChange = (value: string) => {
    setItemMake(value);
    setItemModel("");
    setClaimedDeviceModel("");
    if (value !== "Other") {
      setClaimedDeviceName("");
    }
  };

  const handleModelChange = (value: string) => {
    setItemModel(value);
    if (value !== "Other") {
      setClaimedDeviceModel("");
    }
  };

  const handleColorChange = (value: string) => {
    setItemColor(value);
  };

  return (
    <div className="space-y-6">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Please confirm the device you're claiming for matches your policy
        </AlertDescription>
      </Alert>

      {insuredDevice ? (
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Device on Policy</CardTitle>
            <CardDescription>
              Please confirm if this is the device you're claiming for
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 p-4 bg-background rounded-lg">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">Device Name:</span>
                <span className="font-medium">{insuredDevice.product_name}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">Model:</span>
                <span className="font-medium">{insuredDevice.model}</span>
              </div>
              {insuredDevice.serial_number && (
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-muted-foreground">Serial Number:</span>
                  <span className="font-medium">{insuredDevice.serial_number}</span>
                </div>
              )}
            </div>

            <div>
              <Label className="text-base font-semibold mb-3 block">
                Is this information correct?
              </Label>
              <RadioGroup value={deviceInfoConfirmed} onValueChange={(value) => setDeviceInfoConfirmed(value as "" | "correct" | "incorrect")}>
                <div className="flex items-center space-x-3 rounded-lg border p-4 cursor-pointer hover:bg-background">
                  <RadioGroupItem value="correct" id="device-correct" />
                  <Label htmlFor="device-correct" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="font-medium">Yes, this is correct</span>
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-3 rounded-lg border p-4 cursor-pointer hover:bg-background">
                  <RadioGroupItem value="incorrect" id="device-incorrect" />
                  <Label htmlFor="device-incorrect" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-600" />
                      <span className="font-medium">No, I need to update the details</span>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription>
            No device information found on your policy. Please provide device details below.
          </AlertDescription>
        </Alert>
      )}

      {(!insuredDevice || deviceInfoConfirmed === "incorrect") && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Device Details</CardTitle>
            <CardDescription>
              Please provide information about the device you're claiming for
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Device Category */}
            <div>
              <Label htmlFor="itemCategory">Device Category</Label>
              <Select value={itemCategory} onValueChange={handleCategoryChange}>
                <SelectTrigger id="itemCategory" className="mt-2">
                  <SelectValue placeholder="Select device category" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  {deviceCategories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Brand/Manufacturer */}
            <div>
              <Label htmlFor="itemMake">Manufacturer/Brand</Label>
              <Select value={itemMake} onValueChange={handleBrandChange} disabled={!itemCategory}>
                <SelectTrigger id="itemMake" className="mt-2">
                  <SelectValue placeholder="Select brand" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  {availableBrands.map((brand) => (
                    <SelectItem key={brand} value={brand}>
                      {brand}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isOtherBrand && (
                <Input
                  placeholder="Enter brand name"
                  value={claimedDeviceName}
                  onChange={(e) => setClaimedDeviceName(e.target.value)}
                  className="mt-2"
                />
              )}
            </div>

            {/* Model */}
            <div>
              <Label htmlFor="itemModel">Model</Label>
              <Select value={itemModel} onValueChange={handleModelChange} disabled={!itemMake}>
                <SelectTrigger id="itemModel" className="mt-2">
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  {availableModels.map((model) => (
                    <SelectItem key={model} value={model}>
                      {model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isOtherModel && (
                <Input
                  placeholder="Enter model name"
                  value={claimedDeviceModel}
                  onChange={(e) => setClaimedDeviceModel(e.target.value)}
                  className="mt-2"
                />
              )}
            </div>

            {/* Color or Screen Size based on category */}
            <div>
              <Label htmlFor="itemColor">
                {itemCategory === "Television" ? "Screen Size" : "Color"}
              </Label>
              <Select value={itemColor} onValueChange={handleColorChange}>
                <SelectTrigger id="itemColor" className="mt-2">
                  <SelectValue placeholder={itemCategory === "Television" ? "Select screen size" : "Select color"} />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  {(itemCategory === "Television" ? screenSizeOptions : colorOptions).map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isOtherColor && (
                <Input
                  placeholder={itemCategory === "Television" ? "Enter screen size" : "Enter color"}
                  value={itemColorOther}
                  onChange={(e) => setItemColorOther(e.target.value)}
                  className="mt-2"
                />
              )}
            </div>

            {/* Purchase Price / Retail Value */}
            <div>
              <Label htmlFor="purchasePrice">Purchase Price / Retail Value (€)</Label>
              <Input
                id="purchasePrice"
                type="number"
                placeholder="Enter purchase price"
                value={purchasePrice || ""}
                onChange={(e) => setPurchasePrice?.(e.target.value)}
                className="mt-2"
              />
            </div>

            {/* Serial Number */}
            <div>
              <Label htmlFor="itemSerialNumber">Serial Number (Optional)</Label>
              <Input
                id="itemSerialNumber"
                placeholder="If available"
                value={itemSerialNumber}
                onChange={(e) => setItemSerialNumber(e.target.value)}
                className="mt-2"
              />
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button 
          onClick={onContinue}
          disabled={
            deviceInfoConfirmed === "" || 
            (deviceInfoConfirmed === "incorrect" && (
              !itemCategory || 
              !itemMake || 
              !itemModel || 
              !itemColor ||
              (isOtherBrand && !claimedDeviceName) ||
              (isOtherModel && !claimedDeviceModel)
            ))
          }
          className="flex-1"
        >
          Continue
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
