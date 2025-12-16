// Device configuration for claim forms - shared across retail and customer portals

export const deviceCategories = [
  "Smartphone",
  "Tablet",
  "Laptop",
  "Desktop Computer",
  "Smartwatch",
  "Headphones/Earbuds",
  "Gaming Console",
  "Camera",
  "Television",
  "Home Appliance",
  "Other Electronics"
];

export const brandsByCategory: Record<string, string[]> = {
  "Smartphone": ["Apple", "Samsung", "Google", "OnePlus", "Xiaomi", "Huawei", "Sony", "Motorola", "Nokia", "Other"],
  "Tablet": ["Apple", "Samsung", "Microsoft", "Lenovo", "Amazon", "Huawei", "Other"],
  "Laptop": ["Apple", "Dell", "HP", "Lenovo", "ASUS", "Acer", "Microsoft", "MSI", "Razer", "Other"],
  "Desktop Computer": ["Apple", "Dell", "HP", "Lenovo", "ASUS", "Acer", "Custom Build", "Other"],
  "Smartwatch": ["Apple", "Samsung", "Garmin", "Fitbit", "Google", "Huawei", "Amazfit", "Other"],
  "Headphones/Earbuds": ["Apple", "Sony", "Bose", "Samsung", "Jabra", "Sennheiser", "JBL", "Beats", "Other"],
  "Gaming Console": ["Sony PlayStation", "Microsoft Xbox", "Nintendo", "Valve", "Other"],
  "Camera": ["Canon", "Nikon", "Sony", "Fujifilm", "Panasonic", "Olympus", "GoPro", "Other"],
  "Television": ["Samsung", "LG", "Sony", "TCL", "Hisense", "Panasonic", "Philips", "Vizio", "Other"],
  "Home Appliance": ["Samsung", "LG", "Bosch", "Siemens", "Dyson", "Miele", "Whirlpool", "Electrolux", "Other"],
  "Other Electronics": ["Other"]
};

export const modelsByCategoryAndBrand: Record<string, Record<string, string[]>> = {
  "Smartphone": {
    "Apple": ["iPhone 15 Pro Max", "iPhone 15 Pro", "iPhone 15 Plus", "iPhone 15", "iPhone 14 Pro Max", "iPhone 14 Pro", "iPhone 14", "iPhone 13", "iPhone SE", "Other"],
    "Samsung": ["Galaxy S24 Ultra", "Galaxy S24+", "Galaxy S24", "Galaxy S23 Ultra", "Galaxy S23", "Galaxy Z Fold 5", "Galaxy Z Flip 5", "Galaxy A54", "Other"],
    "Google": ["Pixel 8 Pro", "Pixel 8", "Pixel 7a", "Pixel 7 Pro", "Pixel 7", "Pixel Fold", "Other"],
    "OnePlus": ["12", "11", "Open", "Nord 3", "Other"],
    "Xiaomi": ["14 Ultra", "14", "13T Pro", "Redmi Note 13", "Other"],
    "Huawei": ["Mate 60 Pro", "P60 Pro", "Other"],
    "Sony": ["Xperia 1 V", "Xperia 5 V", "Xperia 10 V", "Other"],
    "Motorola": ["Edge 40 Pro", "Razr 40 Ultra", "Moto G84", "Other"],
    "Nokia": ["XR21", "G42", "C32", "Other"],
    "Other": ["Other"]
  },
  "Tablet": {
    "Apple": ["iPad Pro 12.9", "iPad Pro 11", "iPad Air", "iPad", "iPad mini", "Other"],
    "Samsung": ["Galaxy Tab S9 Ultra", "Galaxy Tab S9+", "Galaxy Tab S9", "Galaxy Tab A9", "Other"],
    "Microsoft": ["Surface Pro 9", "Surface Pro 8", "Surface Go 3", "Other"],
    "Lenovo": ["Tab P11 Pro", "Tab P11", "Tab M10", "Other"],
    "Amazon": ["Fire HD 10", "Fire HD 8", "Fire 7", "Other"],
    "Huawei": ["MatePad Pro", "MatePad 11", "Other"],
    "Other": ["Other"]
  },
  "Laptop": {
    "Apple": ["MacBook Pro 16", "MacBook Pro 14", "MacBook Air 15", "MacBook Air 13", "Other"],
    "Dell": ["XPS 15", "XPS 13", "Inspiron", "Latitude", "Alienware", "Other"],
    "HP": ["Spectre x360", "Envy", "Pavilion", "EliteBook", "Omen", "Other"],
    "Lenovo": ["ThinkPad X1 Carbon", "ThinkPad T14", "IdeaPad", "Legion", "Yoga", "Other"],
    "ASUS": ["ZenBook", "ROG Strix", "TUF Gaming", "VivoBook", "ProArt", "Other"],
    "Acer": ["Swift", "Aspire", "Predator", "Nitro", "Chromebook", "Other"],
    "Microsoft": ["Surface Laptop 5", "Surface Book 3", "Other"],
    "MSI": ["Stealth", "Raider", "Creator", "Prestige", "Other"],
    "Razer": ["Blade 15", "Blade 14", "Blade 17", "Book 13", "Other"],
    "Other": ["Other"]
  },
  "Desktop Computer": {
    "Apple": ["iMac 24", "Mac Studio", "Mac Pro", "Mac mini", "Other"],
    "Dell": ["XPS Desktop", "Inspiron Desktop", "OptiPlex", "Alienware Aurora", "Other"],
    "HP": ["Pavilion Desktop", "ENVY Desktop", "Omen Desktop", "EliteDesk", "Other"],
    "Lenovo": ["ThinkCentre", "IdeaCentre", "Legion Tower", "Other"],
    "ASUS": ["ROG Strix", "ProArt Station", "ExpertCenter", "Other"],
    "Acer": ["Aspire Desktop", "Predator Orion", "Nitro Desktop", "Other"],
    "Custom Build": ["Custom Desktop", "Other"],
    "Other": ["Other"]
  },
  "Smartwatch": {
    "Apple": ["Apple Watch Ultra 2", "Apple Watch Series 9", "Apple Watch SE", "Other"],
    "Samsung": ["Galaxy Watch 6 Classic", "Galaxy Watch 6", "Galaxy Watch 5 Pro", "Other"],
    "Garmin": ["Fenix 7", "Forerunner 965", "Venu 3", "Instinct 2", "Other"],
    "Fitbit": ["Sense 2", "Versa 4", "Charge 6", "Inspire 3", "Other"],
    "Google": ["Pixel Watch 2", "Pixel Watch", "Other"],
    "Huawei": ["Watch GT 4", "Watch 4 Pro", "Watch Fit 3", "Other"],
    "Amazfit": ["GTR 4", "GTS 4", "T-Rex 2", "Bip 3", "Other"],
    "Other": ["Other"]
  },
  "Headphones/Earbuds": {
    "Apple": ["AirPods Pro 2", "AirPods 3", "AirPods Max", "Other"],
    "Sony": ["WH-1000XM5", "WH-1000XM4", "WF-1000XM5", "LinkBuds", "Other"],
    "Bose": ["QuietComfort Ultra", "QuietComfort 45", "SoundLink", "Sport Earbuds", "Other"],
    "Samsung": ["Galaxy Buds 2 Pro", "Galaxy Buds FE", "Galaxy Buds Live", "Other"],
    "Jabra": ["Elite 85t", "Elite 75t", "Elite 7 Pro", "Other"],
    "Sennheiser": ["Momentum 4", "HD 660S", "IE 600", "Other"],
    "JBL": ["Tour One M2", "Live Pro 2", "Flip 6", "Charge 5", "Other"],
    "Beats": ["Studio Pro", "Fit Pro", "Solo 4", "Powerbeats Pro", "Other"],
    "Other": ["Other"]
  },
  "Gaming Console": {
    "Sony PlayStation": ["PlayStation 5", "PlayStation 5 Digital", "PlayStation 4 Pro", "PlayStation 4", "PS VR2", "Other"],
    "Microsoft Xbox": ["Xbox Series X", "Xbox Series S", "Xbox One X", "Xbox One S", "Other"],
    "Nintendo": ["Switch OLED", "Switch", "Switch Lite", "3DS", "Other"],
    "Valve": ["Steam Deck 512GB", "Steam Deck 256GB", "Steam Deck 64GB", "Other"],
    "Other": ["Other"]
  },
  "Camera": {
    "Canon": ["EOS R5", "EOS R6", "EOS 5D Mark IV", "PowerShot G7X", "Other"],
    "Nikon": ["Z8", "Z6 III", "D850", "Z50", "Other"],
    "Sony": ["Alpha A7 IV", "Alpha A7R V", "Alpha A6700", "ZV-E10", "Other"],
    "Fujifilm": ["X-T5", "X-S20", "X100VI", "GFX 100S", "Other"],
    "Panasonic": ["Lumix S5 II", "Lumix GH6", "Lumix G9", "Other"],
    "Olympus": ["OM-1", "E-M1 Mark III", "PEN E-P7", "Other"],
    "GoPro": ["Hero 12 Black", "Hero 11 Black", "Hero 10 Black", "Max", "Other"],
    "Other": ["Other"]
  },
  "Television": {
    "Samsung": ["Neo QLED 8K", "Neo QLED 4K", "OLED S95C", "Crystal UHD", "The Frame", "The Serif", "Other"],
    "LG": ["OLED C3", "OLED G3", "QNED", "NanoCell", "UHD TV", "Other"],
    "Sony": ["BRAVIA XR A95L", "BRAVIA XR X95L", "BRAVIA XR A80L", "BRAVIA X85L", "Other"],
    "TCL": ["6-Series", "5-Series", "4-Series", "Other"],
    "Hisense": ["U8K", "U7K", "A6", "Other"],
    "Panasonic": ["MZ2000", "MZ1500", "MX800", "Other"],
    "Philips": ["OLED 807", "OLED 707", "PUS8807", "Other"],
    "Vizio": ["P-Series", "M-Series", "V-Series", "Other"],
    "Other": ["Other"]
  },
  "Home Appliance": {
    "Samsung": ["Bespoke Refrigerator", "Bespoke Washer", "Bespoke Dryer", "Robot Vacuum", "Other"],
    "LG": ["InstaView Refrigerator", "WashTower", "CordZero Vacuum", "PuriCare Air Purifier", "Other"],
    "Bosch": ["Series 8 Washing Machine", "Series 6 Dishwasher", "Series 4 Oven", "Other"],
    "Siemens": ["iQ700 Washing Machine", "iQ500 Dishwasher", "iQ300 Oven", "Other"],
    "Dyson": ["V15 Detect", "V12 Detect", "Airwrap", "Supersonic", "Purifier", "Other"],
    "Miele": ["W1 Washing Machine", "T1 Dryer", "Complete C3 Vacuum", "Triflex", "Other"],
    "Whirlpool": ["Supreme Care Washer", "FreshCare Dryer", "6th Sense Dishwasher", "Other"],
    "Electrolux": ["PureQ9 Vacuum", "UltimateHome Washer", "PerfectCare Dryer", "Other"],
    "Other": ["Other"]
  },
  "Other Electronics": {
    "Other": ["Other"]
  }
};

export const colorOptions = [
  "Black",
  "White", 
  "Silver/Gray",
  "Gold",
  "Rose Gold",
  "Blue",
  "Red",
  "Green",
  "Purple",
  "Pink",
  "Other"
];

export const screenSizeOptions = [
  "32 inch",
  "40 inch",
  "43 inch",
  "50 inch",
  "55 inch",
  "58 inch",
  "65 inch",
  "70 inch",
  "75 inch",
  "77 inch",
  "83 inch",
  "85 inch",
  "Other"
];
