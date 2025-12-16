import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, ArrowLeft } from "lucide-react";
import PaymentDetailsForm from "@/components/PaymentDetailsForm";

export default function RetailSales() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [retrievalCode, setRetrievalCode] = useState("");
  const [retrieving, setRetrieving] = useState(false);
  
  const [formData, setFormData] = useState({
    customerEmail: "",
    customerName: "",
    customerPhone: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    postcode: "",
    // Device being protected
    deviceCategory: "",
    deviceSubcategory: "",
    deviceBrand: "",
    deviceModel: "",
    deviceStorage: "",
    serialNumber: "",
    purchasedProduct: "",
    purchasePrice: "",
    devicePurchaseDate: "", // When the device was purchased
    // Warranty product
    productId: "",
    deviceName: "",
    paymentMethod: "",
    paymentReference: "",
    paymentDebitDate: "1", // Day of month for direct debit
    // EU fields
    iban: "",
    bic: "",
    // Card fields
    cardNumber: "",
    expiryDate: "",
    cvv: "",
    cardholderName: "",
    // Bank Transfer fields
    bankTransferReference: "",
    // Excess payment options
    useMainPaymentForExcess: true,
    excessPaymentMethod: "",
    excessIban: "",
    excessBic: "",
    excessCardNumber: "",
    excessExpiryDate: "",
    excessCvv: "",
    excessCardholderName: "",
    paymentConfirmed: false,
  });

  const [suggestedProducts, setSuggestedProducts] = useState<any[]>([]);

  // Device categories that have storage options
  const categoriesWithStorage = ["smartphone", "tablet", "laptop", "camera"];

  // Storage options by category
  const storageOptions: Record<string, string[]> = {
    smartphone: ["64GB", "128GB", "256GB", "512GB", "1TB"],
    tablet: ["64GB", "128GB", "256GB", "512GB", "1TB", "2TB"],
    laptop: ["256GB", "512GB", "1TB", "2TB"],
    camera: ["No Storage", "32GB", "64GB", "128GB", "256GB"],
  };

  // Brand options by category
  const brandsByCategory: Record<string, string[]> = {
    smartphone: ["Apple", "Samsung", "Google", "OnePlus", "Xiaomi", "Huawei", "Sony", "Motorola", "Other"],
    tablet: ["Apple", "Samsung", "Microsoft", "Amazon", "Lenovo", "Huawei", "Other"],
    laptop: ["Apple", "Dell", "HP", "Lenovo", "Asus", "Acer", "Microsoft", "MSI", "Other"],
    smartwatch: ["Apple", "Samsung", "Garmin", "Fitbit", "Huawei", "Fossil", "Other"],
    headphones: ["Apple", "Sony", "Bose", "Sennheiser", "JBL", "Samsung", "Beats", "Other"],
    camera: ["Canon", "Nikon", "Sony", "Fujifilm", "Panasonic", "Olympus", "GoPro", "Other"],
    gaming_console: ["Sony PlayStation", "Microsoft Xbox", "Nintendo", "Other"],
    tv: ["Samsung", "LG", "Sony", "Panasonic", "Philips", "Hisense", "TCL", "Other"],
    home_appliance: ["Samsung", "LG", "Bosch", "Siemens", "Whirlpool", "Dyson", "Beko", "Hotpoint", "Miele", "Other"],
    other: ["Other"],
  };

  // Home appliance subcategories
  const homeApplianceTypes = [
    "Washing Machine", "Dryer", "American Fridge", "Fridge", "Freezer",
    "Dishwasher", "Microwave", "Oven", "Cooker", "Hob", "Extractor Fan",
    "Vacuum Cleaner", "Other"
  ];

  // Model options by category and brand
  const modelsByBrand: Record<string, string[]> = {
    // Smartphones
    "Apple-smartphone": ["iPhone 15 Pro Max", "iPhone 15 Pro", "iPhone 15 Plus", "iPhone 15", "iPhone 14 Pro Max", "iPhone 14 Pro", "iPhone 14", "iPhone SE", "Other"],
    "Samsung-smartphone": ["Galaxy S24 Ultra", "Galaxy S24+", "Galaxy S24", "Galaxy S23", "Galaxy Z Fold 5", "Galaxy Z Flip 5", "Galaxy A54", "Other"],
    "Google-smartphone": ["Pixel 8 Pro", "Pixel 8", "Pixel 7a", "Pixel Fold", "Other"],
    "OnePlus-smartphone": ["OnePlus 12", "OnePlus 11", "OnePlus Nord 3", "Other"],
    "Xiaomi-smartphone": ["Xiaomi 14 Pro", "Xiaomi 13", "Redmi Note 13", "Other"],
    "Huawei-smartphone": ["P60 Pro", "Mate 50", "Nova 11", "Other"],
    "Sony-smartphone": ["Xperia 1 V", "Xperia 5 V", "Xperia 10 V", "Other"],
    "Motorola-smartphone": ["Edge 40 Pro", "Edge 40", "Moto G", "Other"],
    
    // Tablets
    "Apple-tablet": ["iPad Pro 12.9\"", "iPad Pro 11\"", "iPad Air", "iPad 10th Gen", "iPad mini", "Other"],
    "Samsung-tablet": ["Galaxy Tab S9 Ultra", "Galaxy Tab S9+", "Galaxy Tab S9", "Galaxy Tab A9", "Other"],
    "Microsoft-tablet": ["Surface Pro 9", "Surface Go 3", "Other"],
    "Amazon-tablet": ["Fire HD 10", "Fire HD 8", "Fire 7", "Other"],
    "Lenovo-tablet": ["Tab P12", "Tab M10", "Tab M8", "Other"],
    "Huawei-tablet": ["MatePad Pro", "MatePad", "Other"],
    
    // Laptops
    "Apple-laptop": ["MacBook Pro 16\"", "MacBook Pro 14\"", "MacBook Air 15\"", "MacBook Air 13\"", "Other"],
    "Dell-laptop": ["XPS 15", "XPS 13", "Inspiron 15", "Latitude 14", "Precision", "Other"],
    "HP-laptop": ["Spectre x360", "Envy 15", "Pavilion", "EliteBook", "Other"],
    "Lenovo-laptop": ["ThinkPad X1", "IdeaPad", "Legion", "Yoga", "Other"],
    "Asus-laptop": ["ZenBook", "VivoBook", "ROG", "TUF Gaming", "Other"],
    "Acer-laptop": ["Swift", "Aspire", "Predator", "Nitro", "Other"],
    "Microsoft-laptop": ["Surface Laptop 5", "Surface Laptop Studio", "Other"],
    "MSI-laptop": ["GE", "GS", "GL", "Prestige", "Other"],
    
    // Smartwatches
    "Apple-smartwatch": ["Apple Watch Ultra 2", "Apple Watch Series 9", "Apple Watch SE", "Other"],
    "Samsung-smartwatch": ["Galaxy Watch 6 Classic", "Galaxy Watch 6", "Galaxy Watch FE", "Other"],
    "Garmin-smartwatch": ["Fenix 7", "Epix", "Forerunner", "Venu", "Other"],
    "Fitbit-smartwatch": ["Sense 2", "Versa 4", "Charge 6", "Other"],
    "Huawei-smartwatch": ["Watch GT 4", "Watch Fit", "Other"],
    "Fossil-smartwatch": ["Gen 6", "Sport", "Other"],
    
    // Headphones
    "Apple-headphones": ["AirPods Max", "AirPods Pro 2", "AirPods 3", "AirPods 2", "Other"],
    "Sony-headphones": ["WH-1000XM5", "WH-1000XM4", "WF-1000XM5", "LinkBuds", "Other"],
    "Bose-headphones": ["QuietComfort Ultra", "QuietComfort 45", "Sport", "Other"],
    "Sennheiser-headphones": ["Momentum 4", "HD 660S", "IE 600", "Other"],
    "JBL-headphones": ["Live Pro 2", "Tune", "Reflect", "Other"],
    "Samsung-headphones": ["Galaxy Buds2 Pro", "Galaxy Buds2", "Galaxy Buds FE", "Other"],
    "Beats-headphones": ["Studio Pro", "Solo 4", "Fit Pro", "Other"],
    
    // Cameras
    "Canon-camera": ["EOS R5", "EOS R6", "EOS R10", "PowerShot", "Other"],
    "Nikon-camera": ["Z9", "Z8", "Z6 III", "Z5", "Other"],
    "Sony-camera": ["Alpha 1", "A7 IV", "A7C", "ZV-E10", "Other"],
    "Fujifilm-camera": ["X-T5", "X-S20", "X-H2", "X100V", "Other"],
    "Panasonic-camera": ["Lumix GH6", "Lumix S5", "G100", "Other"],
    "Olympus-camera": ["OM-1", "E-M10", "Other"],
    "GoPro-camera": ["Hero 12", "Hero 11", "Hero 10", "Other"],
    
    // Gaming Consoles
    "Sony PlayStation-gaming_console": ["PlayStation 5", "PlayStation 5 Digital", "PlayStation 4", "Other"],
    "Microsoft Xbox-gaming_console": ["Xbox Series X", "Xbox Series S", "Xbox One", "Other"],
    "Nintendo-gaming_console": ["Switch OLED", "Switch", "Switch Lite", "Other"],
    
    // TVs
    "Samsung-tv": ["QN95C Neo QLED", "S95C OLED", "QN90C", "Crystal UHD", "The Frame", "Other"],
    "LG-tv": ["OLED G3", "OLED C3", "QNED", "NanoCell", "Other"],
    "Sony-tv": ["Bravia XR A95K", "X95K", "X90K", "X85K", "Other"],
    "Panasonic-tv": ["MZ2000 OLED", "LZ2000", "MX950", "Other"],
    "Philips-tv": ["OLED+908", "OLED808", "The One", "Other"],
    "Hisense-tv": ["U8K ULED", "U7K", "A7K", "Other"],
    "TCL-tv": ["C845 Mini LED", "C745", "P745", "Other"],
    
    // Home Appliances
    "Samsung-home_appliance": ["Bespoke Fridge", "QuickDrive Washer", "PowerGrill", "Other"],
    "LG-home_appliance": ["InstaView Fridge", "TurboWash", "Microwave", "Other"],
    "Bosch-home_appliance": ["Serie 8", "Serie 6", "Serie 4", "Other"],
    "Siemens-home_appliance": ["iQ700", "iQ500", "iQ300", "Other"],
    "Whirlpool-home_appliance": ["6th Sense", "Supreme Care", "Other"],
    "Dyson-home_appliance": ["V15", "V12", "Purifier", "Airwrap", "Other"],
    
    // Default fallback
    "Other": ["Other"],
  };

  // Helper function to calculate discounted price
  const calculateDiscountedPrice = (originalPrice: number, promo: any) => {
    if (!promo) return null;
    
    if (promo.promo_type === 'percentage_discount' && promo.discount_value) {
      return originalPrice * (1 - promo.discount_value / 100);
    }
    if (promo.promo_type === 'fixed_discount' && promo.discount_value) {
      return Math.max(0, originalPrice - promo.discount_value);
    }
    if (promo.promo_type === 'free_months' && promo.free_months) {
      // For free months, price stays same but we show the benefit differently
      return null;
    }
    return null;
  };

  // Helper function to get discount description
  const getDiscountDescription = (promo: any) => {
    if (!promo) return null;
    
    if (promo.promo_type === 'percentage_discount' && promo.discount_value) {
      return `${promo.discount_value}% off`;
    }
    if (promo.promo_type === 'fixed_discount' && promo.discount_value) {
      return `€${promo.discount_value.toFixed(2)} off`;
    }
    if (promo.promo_type === 'free_months' && promo.free_months) {
      return `${promo.free_months} month${promo.free_months > 1 ? 's' : ''} free`;
    }
    return promo.promo_name;
  };

  useEffect(() => {
    const fetchProducts = async (retryCount = 0) => {
      console.log("Fetching products... (attempt", retryCount + 1, ")");
      try {
        const { data, error } = await supabase
          .from("products")
          .select(`
            *,
            product_promotions!inner(
              promotion_id,
              promotions(
                id,
                promo_name,
                promo_code,
                promo_type,
                discount_value,
                free_months,
                logo_url
              )
            )
          `)
          .eq('product_promotions.is_active', true)
          .eq('is_active', true)
          .order("tier");
        
        // Also fetch active products without promotions
        const { data: noPromoData, error: noPromoError } = await supabase
          .from("products")
          .select("*")
          .eq('is_active', true)
          .not('id', 'in', `(${data?.map(p => p.id).join(',') || 'null'})`)
          .order("tier");
        
        const allProducts = [
          ...(data || []).map(p => ({
            ...p,
            promotion_details: p.product_promotions?.[0]?.promotions || null
          })),
          ...(noPromoData || []).map(p => ({
            ...p,
            promotion_details: null
          }))
        ].sort((a, b) => a.tier - b.tier);
        
        console.log("Products response:", { data: allProducts, error, dataCount: allProducts?.length });
        
        if (error || noPromoError) {
          console.error("Error loading products:", error || noPromoError);
          if (retryCount < 2) {
            console.log("Retrying in 1 second...");
            setTimeout(() => fetchProducts(retryCount + 1), 1000);
            return;
          }
          toast.error("Error loading products: " + (error?.message || noPromoError?.message));
          setLoading(false);
        } else if (allProducts && allProducts.length > 0) {
          console.log("Products loaded successfully:", allProducts.length, "products");
          console.log("First product:", allProducts[0]);
          setProducts(allProducts);
          setLoading(false);
        } else {
          console.warn("No products returned from database");
          if (retryCount < 2) {
            console.log("Retrying in 1 second...");
            setTimeout(() => fetchProducts(retryCount + 1), 1000);
            return;
          }
          toast.error("No products found in database");
          setLoading(false);
        }
      } catch (err) {
        console.error("Exception fetching products:", err);
        if (retryCount < 2) {
          console.log("Retrying in 1 second...");
          setTimeout(() => fetchProducts(retryCount + 1), 1000);
          return;
        }
        toast.error("Failed to connect to database. Please refresh the page.");
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // Suggest products based on purchase price
  useEffect(() => {
    console.log("Purchase price changed:", formData.purchasePrice, "Products count:", products.length);
    if (formData.purchasePrice && products.length > 0) {
      const price = parseFloat(formData.purchasePrice);
      console.log("Parsed price:", price);
      if (!isNaN(price)) {
        const suitable = products.filter(p => {
          const min = parseFloat(p.rrp_min);
          const max = p.rrp_max ? parseFloat(p.rrp_max) : Infinity;
          console.log(`Checking ${p.name}: min=${min}, max=${max}, match=${price >= min && price <= max}`);
          return price >= min && price <= max;
        });
        console.log("Suitable products:", suitable);
        setSuggestedProducts(suitable);
      }
    } else {
      console.log("Clearing suggested products");
      setSuggestedProducts([]);
    }
  }, [formData.purchasePrice, products]);

  // Mock function to generate random German customer details
  const generateMockGermanCustomer = () => {
    const germanNames = [
      { first: "Hans", last: "Müller" },
      { first: "Anna", last: "Schmidt" },
      { first: "Klaus", last: "Fischer" },
      { first: "Maria", last: "Weber" },
      { first: "Thomas", last: "Meyer" },
      { first: "Sabine", last: "Wagner" },
      { first: "Michael", last: "Becker" },
      { first: "Julia", last: "Schulz" },
      { first: "Stefan", last: "Hoffmann" },
      { first: "Petra", last: "Koch" },
    ];

    const germanStreets = [
      "Hauptstraße", "Bahnhofstraße", "Kirchstraße", "Gartenstraße",
      "Bergstraße", "Schulstraße", "Marktplatz", "Lindenstraße",
      "Mozartstraße", "Goethestraße"
    ];

    const germanCities = [
      { name: "Berlin", postcode: "10115" },
      { name: "München", postcode: "80331" },
      { name: "Hamburg", postcode: "20095" },
      { name: "Frankfurt", postcode: "60311" },
      { name: "Köln", postcode: "50667" },
      { name: "Stuttgart", postcode: "70173" },
      { name: "Düsseldorf", postcode: "40210" },
      { name: "Dortmund", postcode: "44135" },
      { name: "Essen", postcode: "45127" },
      { name: "Leipzig", postcode: "04109" },
    ];

    const name = germanNames[Math.floor(Math.random() * germanNames.length)];
    const street = germanStreets[Math.floor(Math.random() * germanStreets.length)];
    const city = germanCities[Math.floor(Math.random() * germanCities.length)];
    const streetNumber = Math.floor(Math.random() * 200) + 1;
    const phone = `+49 ${Math.floor(Math.random() * 900) + 100} ${Math.floor(Math.random() * 9000000) + 1000000}`;

    return {
      customerName: `${name.first} ${name.last}`,
      customerEmail: `${name.first.toLowerCase()}.${name.last.toLowerCase()}@example.de`,
      customerPhone: phone,
      addressLine1: `${street} ${streetNumber}`,
      addressLine2: Math.random() > 0.5 ? `Apartment ${Math.floor(Math.random() * 20) + 1}` : "",
      city: city.name,
      postcode: city.postcode,
    };
  };

  const handleRetrieveSale = async () => {
    if (!retrievalCode.trim()) {
      toast.error("Please enter a retrieval code");
      return;
    }

    setRetrieving(true);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const mockCustomer = generateMockGermanCustomer();
    
    setFormData({
      ...formData,
      ...mockCustomer,
    });

    toast.success("Customer details retrieved successfully");
    setRetrieving(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.paymentConfirmed) {
      toast.error("Please confirm payment has been processed");
      return;
    }
    
    setSubmitting(true);

    try {
      // For now, we'll create a policy without a customer account
      // Later, we'll send invitation email for customer to create account
      
      const selectedProduct = products.find(p => p.id === formData.productId);
      
      // Calculate promotional pricing if applicable
      const originalPremium = selectedProduct?.monthly_premium || 0;
      let promotionalPremium: number | null = null;
      const promoDetails = selectedProduct?.promotion_details;
      
      if (promoDetails) {
        const discountedPrice = calculateDiscountedPrice(originalPremium, promoDetails);
        if (discountedPrice !== null) {
          promotionalPremium = discountedPrice;
        }
      }
      
      // Generate policy number using database function
      const { data: policyNumberData, error: policyNumberError } = await supabase
        .rpc('generate_policy_number', { product_name: selectedProduct?.name || 'Extended Warranty' });
      
      if (policyNumberError) {
        console.error('Policy number generation error:', policyNumberError);
        throw policyNumberError;
      }
      
      const policyNumber = policyNumberData;
      const startDate = new Date();
      const renewalDate = new Date(startDate);
      renewalDate.setFullYear(renewalDate.getFullYear() + 1);

      // Insert policy with customer information and promotion details
      const { data: policy, error: policyError }: any = await supabase
        .from("policies")
        .insert({
          policy_number: policyNumber,
          product_id: formData.productId,
          consultant_id: user?.id,
          start_date: startDate.toISOString().split('T')[0],
          renewal_date: renewalDate.toISOString().split('T')[0],
          status: "active",
          user_id: user?.id, // Temporary, will be updated when customer creates account
          customer_name: formData.customerName,
          customer_email: formData.customerEmail,
          customer_phone: formData.customerPhone,
          customer_address_line1: formData.addressLine1,
          customer_address_line2: formData.addressLine2,
          customer_city: formData.city,
          customer_postcode: formData.postcode,
          // Store promotion details
          promotion_id: promoDetails?.id || null,
          original_premium: originalPremium,
          promotional_premium: promotionalPremium,
        })
        .select()
        .single();

      if (policyError) throw policyError;

      // Insert covered item with device purchase date
      const { error: itemError } = await supabase
        .from("covered_items")
        .insert({
          policy_id: policy.id,
          product_name: formData.deviceName,
          model: formData.deviceModel,
          serial_number: formData.serialNumber,
          purchase_price: parseFloat(formData.purchasePrice),
          purchase_date: formData.devicePurchaseDate || new Date().toISOString().split('T')[0],
        });

      if (itemError) throw itemError;

      // Create payment record with the actual premium (promotional if applicable)
      const actualPremium = promotionalPremium !== null ? promotionalPremium : originalPremium;
      const paymentRef = formData.paymentReference || `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      const { error: paymentError } = await supabase
        .from("payments")
        .insert([{
          user_id: user?.id || "",
          policy_id: policy.id,
          payment_type: "premium",
          amount: actualPremium,
          reference_number: paymentRef,
          status: "paid",
          payment_date: new Date().toISOString(),
        }]);

      if (paymentError) throw paymentError;

      // Policy documents are automatically generated by database trigger
      
      // Send welcome email with policy details
      try {
        const { error: emailError } = await supabase.functions.invoke('send-templated-email', {
          body: {
            policyId: policy.id,
            templateId: '73180f11-76fb-43aa-a601-ddd2e35e4eda', // Active policy template
            status: 'active'
          }
        });

        if (emailError) {
          console.error('Error sending welcome email:', emailError);
          toast.warning('Policy created but email notification failed');
        }
      } catch (emailError: any) {
        console.error('Email sending error:', emailError);
      }

      toast.success(`Policy ${policyNumber} created successfully!`);
      
      // Navigate to policy detail page
      navigate(`/retail/policies/${policy.id}`);
    } catch (error: any) {
      toast.error(error.message || "Failed to create policy");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">New Sale</h1>
          <p className="text-muted-foreground">Create a new extended warranty policy</p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate("/retail/dashboard")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Cancel
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Sale Retrieval</CardTitle>
            <CardDescription>Enter a code to retrieve existing sale information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1 space-y-2">
                <Label htmlFor="retrievalCode">Retrieval Code</Label>
                <Input
                  id="retrievalCode"
                  placeholder="Enter alphanumeric code"
                  value={retrievalCode}
                  onChange={(e) => setRetrievalCode(e.target.value)}
                  disabled={retrieving}
                />
              </div>
              <div className="flex items-end">
                <Button
                  type="button"
                  onClick={handleRetrieveSale}
                  disabled={retrieving || !retrievalCode.trim()}
                >
                  {retrieving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Retrieve
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Customer Information</CardTitle>
            <CardDescription>Enter the customer's details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="customerName">Full Name *</Label>
              <Input
                id="customerName"
                value={formData.customerName}
                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customerEmail">Email *</Label>
              <Input
                id="customerEmail"
                type="email"
                value={formData.customerEmail}
                onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customerPhone">Phone Number</Label>
              <Input
                id="customerPhone"
                type="tel"
                value={formData.customerPhone}
                onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="addressLine1">Address Line 1 *</Label>
              <Input
                id="addressLine1"
                value={formData.addressLine1}
                onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="addressLine2">Address Line 2</Label>
              <Input
                id="addressLine2"
                value={formData.addressLine2}
                onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="postcode">Postcode *</Label>
                <Input
                  id="postcode"
                  value={formData.postcode}
                  onChange={(e) => setFormData({ ...formData, postcode: e.target.value })}
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Device Being Protected</CardTitle>
            <CardDescription>Select the device the customer wants to protect</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="deviceCategory">Device Category *</Label>
              <Select 
                value={formData.deviceCategory} 
                onValueChange={(value) => {
                  setFormData({ 
                    ...formData, 
                    deviceCategory: value,
                    deviceSubcategory: "",
                    purchasedProduct: value !== "other" ? "" : formData.purchasedProduct,
                    deviceName: value !== "other" ? "" : formData.deviceName
                  });
                }}
                required
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select device type" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="smartphone">Smartphone</SelectItem>
                  <SelectItem value="tablet">Tablet</SelectItem>
                  <SelectItem value="laptop">Laptop</SelectItem>
                  <SelectItem value="smartwatch">Smartwatch</SelectItem>
                  <SelectItem value="headphones">Headphones/Earbuds</SelectItem>
                  <SelectItem value="camera">Camera</SelectItem>
                  <SelectItem value="gaming_console">Gaming Console</SelectItem>
                  <SelectItem value="tv">TV</SelectItem>
                  <SelectItem value="home_appliance">Home Appliance</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.deviceCategory === "home_appliance" && (
              <div className="space-y-2">
                <Label htmlFor="deviceSubcategory">Appliance Type *</Label>
                <Select 
                  value={formData.deviceSubcategory} 
                  onValueChange={(value) => {
                    setFormData({ 
                      ...formData, 
                      deviceSubcategory: value
                    });
                  }}
                  required
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select appliance type" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    {homeApplianceTypes.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {formData.deviceCategory && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="deviceBrand">Brand *</Label>
                  <Select 
                    value={formData.deviceBrand} 
                    onValueChange={(value) => {
                      setFormData({ 
                        ...formData, 
                        deviceBrand: value,
                        deviceModel: "",
                        purchasedProduct: ""
                      });
                    }}
                    required
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Select brand" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      {brandsByCategory[formData.deviceCategory]?.map((brand) => (
                        <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {formData.deviceBrand && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="deviceModel">Model *</Label>
                      <Select 
                        value={formData.deviceModel} 
                        onValueChange={(value) => {
                          const displayName = value === "Other" ? "" : `${formData.deviceBrand} ${value}`;
                          setFormData({ 
                            ...formData, 
                            deviceModel: value,
                            purchasedProduct: displayName,
                            deviceName: displayName
                          });
                        }}
                        required
                      >
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="Select model" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover z-50">
                          {(modelsByBrand[`${formData.deviceBrand}-${formData.deviceCategory}`] || 
                            modelsByBrand[formData.deviceBrand] || 
                            ["Other"]).map((model) => (
                            <SelectItem key={model} value={model}>{model}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {(formData.deviceModel === "Other" || formData.deviceBrand === "Other") && (
                      <div className="space-y-2">
                        <Label htmlFor="purchasedProduct">Specify Device *</Label>
                        <Input
                          id="purchasedProduct"
                          placeholder="Enter brand and model"
                          value={formData.purchasedProduct}
                          onChange={(e) => setFormData({ ...formData, purchasedProduct: e.target.value, deviceName: e.target.value })}
                          required
                        />
                      </div>
                    )}

                    {categoriesWithStorage.includes(formData.deviceCategory) && (
                      <div className="space-y-2">
                        <Label htmlFor="deviceStorage">Storage Capacity *</Label>
                        <Select 
                          value={formData.deviceStorage} 
                          onValueChange={(value) => setFormData({ ...formData, deviceStorage: value })}
                          required
                        >
                          <SelectTrigger className="bg-background">
                            <SelectValue placeholder="Select storage" />
                          </SelectTrigger>
                          <SelectContent className="bg-popover z-50">
                            {storageOptions[formData.deviceCategory]?.map((storage) => (
                              <SelectItem key={storage} value={storage}>{storage}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="serialNumber">Serial Number / IMEI</Label>
                      <Input
                        id="serialNumber"
                        placeholder="Enter serial or IMEI number"
                        value={formData.serialNumber}
                        onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground">
                        Required for warranty activation
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="devicePurchaseDate">Device Purchase Date *</Label>
                      <Input
                        id="devicePurchaseDate"
                        type="date"
                        value={formData.devicePurchaseDate}
                        onChange={(e) => setFormData({ ...formData, devicePurchaseDate: e.target.value })}
                        max={new Date().toISOString().split('T')[0]}
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        Date the device was originally purchased (for warranty period calculation)
                      </p>
                    </div>
                  </>
                )}

                {formData.deviceBrand && formData.deviceModel && (
                <div className="space-y-2">
                  <Label htmlFor="purchasePrice">Retail Price (€) *</Label>
                  <Input
                    id="purchasePrice"
                    type="number"
                    step="0.01"
                    placeholder="e.g., 999.99"
                    value={formData.purchasePrice}
                    onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter the retail price - this will filter available warranty options
                  </p>
                </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cover Selection</CardTitle>
            <CardDescription>Choose the appropriate insurance cover based on retail price and customer needs</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="productId">Available Products *</Label>
              <Select 
                value={formData.productId} 
                onValueChange={(value) => setFormData({ ...formData, productId: value })} 
                required
                disabled={!formData.purchasePrice}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder={formData.purchasePrice ? "Select cover" : "Enter retail price first"} />
                </SelectTrigger>
                <SelectContent className="bg-background border z-[100] max-h-[400px]">
                  {formData.purchasePrice && suggestedProducts.length > 0 ? (
                    <>
                      {/* Extended Warranty */}
                      {suggestedProducts.filter(p => p.type === "extended_warranty").length > 0 && (
                        <>
                          <div className="px-2 py-2 text-sm font-bold bg-primary/10 text-primary border-b">
                            Extended Warranty - Parts & Labor
                          </div>
                          {suggestedProducts
                            .filter(p => p.type === "extended_warranty")
                            .map((product) => {
                              const discountedPrice = calculateDiscountedPrice(product.monthly_premium, product.promotion_details);
                              const discountDesc = getDiscountDescription(product.promotion_details);
                              return (
                                <SelectItem key={product.id} value={product.id}>
                                  <div className="flex items-center gap-2 w-full">
                                    {product.promotion_details?.logo_url && (
                                      <img 
                                        src={product.promotion_details.logo_url} 
                                        alt={product.promotion_details.promo_name}
                                        className="w-6 h-6 object-contain flex-shrink-0"
                                      />
                                    )}
                                    <span className="font-semibold">{product.name}</span>
                                    {product.promotion_details && discountDesc && (
                                      <span className="text-xs bg-success/20 text-success px-2 py-0.5 rounded font-medium">
                                        {discountDesc}
                                      </span>
                                    )}
                                    <span className="text-xs text-muted-foreground ml-auto flex items-center gap-1">
                                      {discountedPrice !== null ? (
                                        <>
                                          <span className="line-through text-destructive/60">€{product.monthly_premium.toFixed(2)}</span>
                                          <span className="text-success font-semibold">€{discountedPrice.toFixed(2)}</span>
                                        </>
                                      ) : (
                                        <span>€{product.monthly_premium.toFixed(2)}</span>
                                      )}
                                      <span>/month • €{product.excess_1} excess</span>
                                    </span>
                                  </div>
                                </SelectItem>
                              );
                            })}
                        </>
                      )}

                      {/* Insurance Lite */}
                      {suggestedProducts.filter(p => p.type === "insurance_lite").length > 0 && (
                        <>
                          <div className="px-2 py-2 text-sm font-bold bg-warning/10 text-warning border-b border-t mt-1">
                            Insurance Lite - Accidental Damage Only
                          </div>
                          {suggestedProducts
                            .filter(p => p.type === "insurance_lite")
                            .map((product) => {
                              const discountedPrice = calculateDiscountedPrice(product.monthly_premium, product.promotion_details);
                              const discountDesc = getDiscountDescription(product.promotion_details);
                              return (
                                <SelectItem key={product.id} value={product.id}>
                                  <div className="flex items-center gap-2 w-full">
                                    {product.promotion_details?.logo_url && (
                                      <img 
                                        src={product.promotion_details.logo_url} 
                                        alt={product.promotion_details.promo_name}
                                        className="w-6 h-6 object-contain flex-shrink-0"
                                      />
                                    )}
                                    <span className="font-semibold">{product.name}</span>
                                    {product.promotion_details && discountDesc && (
                                      <span className="text-xs bg-success/20 text-success px-2 py-0.5 rounded font-medium">
                                        {discountDesc}
                                      </span>
                                    )}
                                    <span className="text-xs text-muted-foreground ml-auto flex items-center gap-1">
                                      {discountedPrice !== null ? (
                                        <>
                                          <span className="line-through text-destructive/60">€{product.monthly_premium.toFixed(2)}</span>
                                          <span className="text-success font-semibold">€{discountedPrice.toFixed(2)}</span>
                                        </>
                                      ) : (
                                        <span>€{product.monthly_premium.toFixed(2)}</span>
                                      )}
                                      <span>/month • €{product.excess_1} excess</span>
                                    </span>
                                  </div>
                                </SelectItem>
                              );
                            })}
                        </>
                      )}

                      {/* Insurance Max */}
                      {suggestedProducts.filter(p => p.type === "insurance_max").length > 0 && (
                        <>
                          <div className="px-2 py-2 text-sm font-bold bg-success/10 text-success border-b border-t mt-1">
                            Insurance Max - Damage + Loss + Theft
                          </div>
                          {suggestedProducts
                            .filter(p => p.type === "insurance_max")
                            .map((product) => {
                              const discountedPrice = calculateDiscountedPrice(product.monthly_premium, product.promotion_details);
                              const discountDesc = getDiscountDescription(product.promotion_details);
                              return (
                                <SelectItem key={product.id} value={product.id}>
                                  <div className="flex items-center gap-2 w-full">
                                    {product.promotion_details?.logo_url && (
                                      <img 
                                        src={product.promotion_details.logo_url} 
                                        alt={product.promotion_details.promo_name}
                                        className="w-6 h-6 object-contain flex-shrink-0"
                                      />
                                    )}
                                    <span className="font-semibold">{product.name}</span>
                                    {product.promotion_details && discountDesc && (
                                      <span className="text-xs bg-success/20 text-success px-2 py-0.5 rounded font-medium">
                                        {discountDesc}
                                      </span>
                                    )}
                                    <span className="text-xs text-muted-foreground ml-auto flex items-center gap-1">
                                      {discountedPrice !== null ? (
                                        <>
                                          <span className="line-through text-destructive/60">€{product.monthly_premium.toFixed(2)}</span>
                                          <span className="text-success font-semibold">€{discountedPrice.toFixed(2)}</span>
                                        </>
                                      ) : (
                                        <span>€{product.monthly_premium.toFixed(2)}</span>
                                      )}
                                      <span>/month • €{product.excess_1} excess</span>
                                    </span>
                                  </div>
                                </SelectItem>
                              );
                            })}
                        </>
                      )}
                    </>
                  ) : formData.purchasePrice ? (
                    <div className="px-2 py-3 text-sm text-muted-foreground text-center">
                      No insurance covers match this price range
                    </div>
                  ) : null}
                </SelectContent>
              </Select>
              {formData.purchasePrice && suggestedProducts.length === 0 && (
                <p className="text-xs text-warning">No insurance covers available for this price range</p>
              )}
            </div>
          </CardContent>
        </Card>

        <PaymentDetailsForm
          paymentMethod={formData.paymentMethod}
          onPaymentMethodChange={(method) => setFormData({ ...formData, paymentMethod: method })}
          paymentDebitDate={formData.paymentDebitDate}
          onPaymentDebitDateChange={(value) => setFormData({ ...formData, paymentDebitDate: value })}
          iban={formData.iban}
          bic={formData.bic}
          onIbanChange={(value) => setFormData({ ...formData, iban: value })}
          onBicChange={(value) => setFormData({ ...formData, bic: value })}
          cardNumber={formData.cardNumber}
          expiryDate={formData.expiryDate}
          cvv={formData.cvv}
          cardholderName={formData.cardholderName}
          onCardNumberChange={(value) => setFormData({ ...formData, cardNumber: value })}
          onExpiryDateChange={(value) => setFormData({ ...formData, expiryDate: value })}
          onCvvChange={(value) => setFormData({ ...formData, cvv: value })}
          onCardholderNameChange={(value) => setFormData({ ...formData, cardholderName: value })}
          paymentReference={formData.paymentReference}
          onPaymentReferenceChange={(value) => setFormData({ ...formData, paymentReference: value })}
          showTitle={true}
          showRegionSelector={true}
          availableMethods={["card", "sepa_debit"]}
          showExcessPaymentOptions
          useMainPaymentForExcess={formData.useMainPaymentForExcess}
          onUseMainPaymentForExcessChange={(value) => setFormData({ ...formData, useMainPaymentForExcess: value })}
          excessPaymentMethod={formData.excessPaymentMethod}
          onExcessPaymentMethodChange={(value) => setFormData({ ...formData, excessPaymentMethod: value })}
          excessIban={formData.excessIban}
          excessBic={formData.excessBic}
          onExcessIbanChange={(value) => setFormData({ ...formData, excessIban: value })}
          onExcessBicChange={(value) => setFormData({ ...formData, excessBic: value })}
          excessCardNumber={formData.excessCardNumber}
          excessExpiryDate={formData.excessExpiryDate}
          excessCvv={formData.excessCvv}
          excessCardholderName={formData.excessCardholderName}
          onExcessCardNumberChange={(value) => setFormData({ ...formData, excessCardNumber: value })}
          onExcessExpiryDateChange={(value) => setFormData({ ...formData, excessExpiryDate: value })}
          onExcessCvvChange={(value) => setFormData({ ...formData, excessCvv: value })}
          onExcessCardholderNameChange={(value) => setFormData({ ...formData, excessCardholderName: value })}
          required={true}
        />

        <Card>
          <CardContent className="pt-6">
            {formData.paymentMethod && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="paymentConfirmed"
                    checked={formData.paymentConfirmed}
                    onChange={(e) => setFormData({ ...formData, paymentConfirmed: e.target.checked })}
                    className="mt-1 h-4 w-4"
                    required
                  />
                  <div>
                    <Label htmlFor="paymentConfirmed" className="cursor-pointer font-semibold">
                      Confirm Payment Processed *
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      I confirm that the payment details have been collected/verified and the transaction is authorized
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Button type="submit" className="w-full" disabled={submitting || !formData.paymentConfirmed}>
          {submitting ? "Creating Policy..." : "Complete Sale"}
        </Button>
      </form>
    </div>
  );
}
