import { supabase } from "@/integrations/supabase/client";

export interface AIAnalysisResult {
  severityLevel: string;
  suggestion: string;
  deviceCategory?: string;
  deviceMismatch?: boolean;
  deviceMismatchWarning?: string;
  hasVisiblePhysicalDamage?: boolean;
  physicalDamageDescription?: string;
}

export async function analyzeDamageWithAI(
  imageFile: File,
  insuredDeviceCategory?: string
): Promise<AIAnalysisResult> {
  try {
    // Convert image to base64 with data URI prefix (required by AI API)
    const reader = new FileReader();
    const imageBase64 = await new Promise<string>((resolve, reject) => {
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result); // Keep full data URI with prefix
      };
      reader.onerror = reject;
      reader.readAsDataURL(imageFile);
    });

    // Call edge function for AI analysis
    const { data, error } = await supabase.functions.invoke('analyze-device', {
      body: {
        imageBase64,
        insuredDeviceCategory
      }
    });

    if (error) {
      console.error('Edge function error:', error);
      throw new Error(error.message || 'AI analysis failed');
    }

    if (!data) {
      throw new Error('No data returned from AI analysis');
    }

    // Edge function already returns normalized severity level
    return {
      severityLevel: data.severityLevel || 'Medium - Some features not working',
      suggestion: data.explanation || 'AI analysis completed',
      deviceCategory: data.deviceCategory,
      deviceMismatch: data.deviceMismatch,
      deviceMismatchWarning: data.mismatchWarning,
      hasVisiblePhysicalDamage: data.hasVisiblePhysicalDamage,
      physicalDamageDescription: data.physicalDamageDescription
    };
  } catch (error) {
    console.error('AI analysis error:', error);
    throw error;
  }
}
