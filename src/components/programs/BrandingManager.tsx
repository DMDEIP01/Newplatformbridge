import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Palette, Globe, Check, RefreshCw, Eye, Code, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface BrandColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  foreground: string;
  muted?: string;
  success?: string;
  warning?: string;
  destructive?: string;
}

interface BrandFonts {
  primary: string;
  heading?: string;
}

interface BrandingData {
  colors: BrandColors;
  fonts: BrandFonts;
  borderRadius?: string;
  logoUrl?: string | null;
}

export function BrandingManager() {
  const { toast } = useToast();
  const [url, setUrl] = useState("");
  const [htmlContent, setHtmlContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [extractedBranding, setExtractedBranding] = useState<BrandingData | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("url");

  const handleExtractFromUrl = async () => {
    if (!url) {
      toast({
        title: "URL Required",
        description: "Please enter a website URL to extract branding from.",
        variant: "destructive",
      });
      return;
    }

    try {
      new URL(url);
    } catch {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid website URL (e.g., https://example.com)",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setExtractedBranding(null);
    setExtractionError(null);

    try {
      const { data, error } = await supabase.functions.invoke("extract-branding", {
        body: { url },
      });

      if (error) throw error;

      if (data.error) {
        // Check if it's a bot protection error
        if (data.errorCode === "BOT_PROTECTION" || data.error.includes("403") || data.error.includes("blocked")) {
          setExtractionError("This website has bot protection. Use the 'Paste HTML' method instead - right-click the page, select 'View Page Source', copy the HTML, and paste it below.");
          setActiveTab("html");
          return;
        }
        throw new Error(data.error);
      }

      setExtractedBranding(data.branding);
      toast({
        title: "Branding Extracted",
        description: "Successfully extracted brand colors, fonts, and styles.",
      });
    } catch (error) {
      console.error("Error extracting branding:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to extract branding";
      
      if (errorMessage.includes("403") || errorMessage.includes("Failed to fetch")) {
        setExtractionError("This website has bot protection. Try the 'Paste HTML' method instead.");
        setActiveTab("html");
      } else {
        toast({
          title: "Extraction Failed",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleExtractFromHtml = async () => {
    if (!htmlContent.trim()) {
      toast({
        title: "HTML Required",
        description: "Please paste the website's HTML source code.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setExtractedBranding(null);
    setExtractionError(null);

    try {
      const { data, error } = await supabase.functions.invoke("extract-branding", {
        body: { html: htmlContent, sourceUrl: url || "pasted-html" },
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      setExtractedBranding(data.branding);
      toast({
        title: "Branding Extracted",
        description: "Successfully extracted brand colors, fonts, and styles from HTML.",
      });
    } catch (error) {
      console.error("Error extracting branding:", error);
      toast({
        title: "Extraction Failed",
        description: error instanceof Error ? error.message : "Failed to extract branding from HTML.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const applyBrandingPreview = () => {
    if (!extractedBranding) return;

    const root = document.documentElement;
    const { colors } = extractedBranding;

    if (colors.primary) root.style.setProperty("--primary", colors.primary);
    if (colors.secondary) root.style.setProperty("--secondary", colors.secondary);
    if (colors.accent) root.style.setProperty("--accent", colors.accent);
    if (colors.background) root.style.setProperty("--background", colors.background);
    if (colors.foreground) root.style.setProperty("--foreground", colors.foreground);
    if (colors.muted) root.style.setProperty("--muted", colors.muted);
    if (colors.success) root.style.setProperty("--success", colors.success);
    if (colors.warning) root.style.setProperty("--warning", colors.warning);
    if (colors.destructive) root.style.setProperty("--destructive", colors.destructive);

    if (extractedBranding.borderRadius) {
      root.style.setProperty("--radius", extractedBranding.borderRadius);
    }

    setPreviewMode(true);
    toast({
      title: "Preview Applied",
      description: "Branding preview is now active. Refresh the page to reset.",
    });
  };

  const resetPreview = () => {
    const root = document.documentElement;
    root.style.removeProperty("--primary");
    root.style.removeProperty("--secondary");
    root.style.removeProperty("--accent");
    root.style.removeProperty("--background");
    root.style.removeProperty("--foreground");
    root.style.removeProperty("--muted");
    root.style.removeProperty("--success");
    root.style.removeProperty("--warning");
    root.style.removeProperty("--destructive");
    root.style.removeProperty("--radius");

    setPreviewMode(false);
    toast({
      title: "Preview Reset",
      description: "Branding has been reset to defaults.",
    });
  };

  const generateCSSVariables = () => {
    if (!extractedBranding) return "";

    const { colors, fonts, borderRadius } = extractedBranding;
    
    let css = `:root {\n`;
    css += `  /* Extracted Brand Colors */\n`;
    if (colors.primary) css += `  --primary: ${colors.primary};\n`;
    if (colors.secondary) css += `  --secondary: ${colors.secondary};\n`;
    if (colors.accent) css += `  --accent: ${colors.accent};\n`;
    if (colors.background) css += `  --background: ${colors.background};\n`;
    if (colors.foreground) css += `  --foreground: ${colors.foreground};\n`;
    if (colors.muted) css += `  --muted: ${colors.muted};\n`;
    if (colors.success) css += `  --success: ${colors.success};\n`;
    if (colors.warning) css += `  --warning: ${colors.warning};\n`;
    if (colors.destructive) css += `  --destructive: ${colors.destructive};\n`;
    if (borderRadius) css += `  --radius: ${borderRadius};\n`;
    css += `}\n\n`;
    
    if (fonts.primary || fonts.heading) {
      css += `/* Font Families */\n`;
      css += `body {\n`;
      if (fonts.primary) css += `  font-family: '${fonts.primary}', sans-serif;\n`;
      css += `}\n`;
      if (fonts.heading && fonts.heading !== fonts.primary) {
        css += `h1, h2, h3, h4, h5, h6 {\n`;
        css += `  font-family: '${fonts.heading}', sans-serif;\n`;
        css += `}\n`;
      }
    }

    return css;
  };

  const copyCSS = () => {
    const css = generateCSSVariables();
    navigator.clipboard.writeText(css);
    toast({
      title: "Copied!",
      description: "CSS variables copied to clipboard.",
    });
  };

  const ColorSwatch = ({ label, value }: { label: string; value?: string }) => {
    if (!value) return null;
    return (
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-md border shadow-sm"
          style={{ backgroundColor: `hsl(${value})` }}
        />
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground font-mono">{value}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Brand Extraction
          </CardTitle>
          <CardDescription>
            Extract brand colors, fonts, and styles from any website using AI analysis.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 max-w-md">
              <TabsTrigger value="url" className="gap-2">
                <Globe className="h-4 w-4" />
                From URL
              </TabsTrigger>
              <TabsTrigger value="html" className="gap-2">
                <Code className="h-4 w-4" />
                Paste HTML
              </TabsTrigger>
            </TabsList>

            <TabsContent value="url" className="space-y-4 mt-4">
              <div className="flex gap-3">
                <div className="flex-1">
                  <Label htmlFor="website-url" className="sr-only">Website URL</Label>
                  <Input
                    id="website-url"
                    type="url"
                    placeholder="https://example.com"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                <Button onClick={handleExtractFromUrl} disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Globe className="mr-2 h-4 w-4" />
                      Extract
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Enter a website URL. The AI will fetch and analyze the site's HTML/CSS.
              </p>
            </TabsContent>

            <TabsContent value="html" className="space-y-4 mt-4">
              {extractionError && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{extractionError}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-3">
                <div>
                  <Label htmlFor="html-content">HTML Source Code</Label>
                  <Textarea
                    id="html-content"
                    placeholder="Paste the website's HTML source code here...&#10;&#10;How to get it:&#10;1. Open the website in your browser&#10;2. Right-click → 'View Page Source'&#10;3. Select all (Ctrl+A) and copy (Ctrl+C)&#10;4. Paste here"
                    value={htmlContent}
                    onChange={(e) => setHtmlContent(e.target.value)}
                    disabled={isLoading}
                    className="min-h-[200px] font-mono text-xs"
                  />
                </div>
                <Button onClick={handleExtractFromHtml} disabled={isLoading || !htmlContent.trim()}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Code className="mr-2 h-4 w-4" />
                      Extract from HTML
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {extractedBranding && (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Extracted Brand Identity</CardTitle>
                  <CardDescription>
                    Colors and fonts extracted successfully
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  {previewMode ? (
                    <Button variant="outline" size="sm" onClick={resetPreview}>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Reset Preview
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" onClick={applyBrandingPreview}>
                      <Eye className="mr-2 h-4 w-4" />
                      Preview
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-medium mb-3">Colors</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  <ColorSwatch label="Primary" value={extractedBranding.colors.primary} />
                  <ColorSwatch label="Secondary" value={extractedBranding.colors.secondary} />
                  <ColorSwatch label="Accent" value={extractedBranding.colors.accent} />
                  <ColorSwatch label="Background" value={extractedBranding.colors.background} />
                  <ColorSwatch label="Foreground" value={extractedBranding.colors.foreground} />
                  <ColorSwatch label="Muted" value={extractedBranding.colors.muted} />
                  <ColorSwatch label="Success" value={extractedBranding.colors.success} />
                  <ColorSwatch label="Warning" value={extractedBranding.colors.warning} />
                  <ColorSwatch label="Destructive" value={extractedBranding.colors.destructive} />
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-3">Typography</h4>
                <div className="flex flex-wrap gap-4">
                  {extractedBranding.fonts.primary && (
                    <Badge variant="secondary" className="text-sm py-1.5 px-3">
                      Primary: {extractedBranding.fonts.primary}
                    </Badge>
                  )}
                  {extractedBranding.fonts.heading && (
                    <Badge variant="secondary" className="text-sm py-1.5 px-3">
                      Headings: {extractedBranding.fonts.heading}
                    </Badge>
                  )}
                  {extractedBranding.borderRadius && (
                    <Badge variant="outline" className="text-sm py-1.5 px-3">
                      Border Radius: {extractedBranding.borderRadius}
                    </Badge>
                  )}
                </div>
              </div>

              {extractedBranding.logoUrl && (
                <div>
                  <h4 className="font-medium mb-3">Logo</h4>
                  <div className="bg-muted rounded-lg p-4 inline-block">
                    <img
                      src={extractedBranding.logoUrl}
                      alt="Extracted logo"
                      className="max-h-16 object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Generated CSS Variables</CardTitle>
              <CardDescription>
                Copy these CSS variables to apply the branding to your application
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <pre className="bg-muted p-4 rounded-lg text-xs overflow-auto max-h-64 font-mono">
                  {generateCSSVariables()}
                </pre>
                <Button
                  size="sm"
                  variant="secondary"
                  className="absolute top-2 right-2"
                  onClick={copyCSS}
                >
                  <Check className="mr-2 h-3 w-3" />
                  Copy
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
