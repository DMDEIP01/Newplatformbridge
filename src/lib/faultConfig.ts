// Shared fault categories and specific issues configuration
// Used across Customer Portal, Retail Agent, and Claims Agent views

export const faultCategories = [
  "Screen/Display",
  "Battery/Power",
  "Charging",
  "Audio/Sound",
  "Camera",
  "Connectivity",
  "Software/Performance",
  "Physical/Hardware",
  "Other"
] as const;

export type FaultCategory = typeof faultCategories[number];

export const specificIssuesByCategory: Record<FaultCategory, string[]> = {
  "Screen/Display": [
    "Screen won't turn on",
    "Lines/dead pixels on screen",
    "Screen flickering",
    "Touchscreen not responding",
    "Screen color issues",
    "Screen brightness issues",
    "Cracked/broken display",
    "Backlight issues"
  ],
  "Battery/Power": [
    "Battery drains quickly",
    "Device won't turn on",
    "Device shuts down unexpectedly",
    "Battery swollen",
    "Battery percentage incorrect",
    "Power button not working"
  ],
  "Charging": [
    "Device won't charge",
    "Charging port damaged",
    "Wireless charging not working",
    "Slow charging",
    "Charger not recognized"
  ],
  "Audio/Sound": [
    "No sound/audio",
    "Speaker distortion",
    "Microphone not working",
    "Headphone jack issues",
    "Audio cutting out",
    "Volume controls not working"
  ],
  "Camera": [
    "Camera not working",
    "Blurry photos/videos",
    "Camera app crashing",
    "Flash not working",
    "Front/rear camera issues",
    "Video recording issues"
  ],
  "Connectivity": [
    "WiFi not working",
    "Bluetooth issues",
    "Mobile signal problems",
    "GPS not working",
    "NFC issues",
    "SIM card not detected"
  ],
  "Software/Performance": [
    "Slow performance",
    "Device freezing/hanging",
    "Random restarts",
    "Apps crashing",
    "OS not booting",
    "Update failed",
    "Overheating"
  ],
  "Physical/Hardware": [
    "Loose parts",
    "Button stuck/not working",
    "Port damaged",
    "Hinge problem",
    "Build quality issue",
    "Water damage indicators"
  ],
  "Other": [
    "Other issue not listed"
  ]
};

export const severityLevels = [
  "Critical - Device completely unusable",
  "High - Major functionality affected",
  "Medium - Some features not working",
  "Low - Minor inconvenience"
] as const;

export type SeverityLevel = typeof severityLevels[number];
