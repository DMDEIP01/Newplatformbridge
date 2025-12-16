import { supabase } from "@/integrations/supabase/client";

export interface ReceiptAnalysisResult {
  deviceCategory: string | null;
  serialNumber: string | null;
  rrp: string | null;
  dateOfSale: string | null;
  manufacturer: string | null;
  model: string | null;
  confidence: {
    deviceCategory: string;
    serialNumber: string;
    rrp: string;
    dateOfSale: string;
  };
  validation: {
    deviceCategory: { found: boolean; matches: boolean };
    serialNumber: { found: boolean; matches: boolean };
    rrp: { found: boolean; matches: boolean };
    dateOfSale: { found: boolean; matches: boolean };
  };
  allFieldsFound: boolean;
  allFieldsMatch: boolean;
  error?: string;
}

export async function analyzeReceipt(
  imageFile: File,
  expectedDevice?: {
    category?: string;
    serial?: string;
    rrp?: string;
  }
): Promise<ReceiptAnalysisResult> {
  try {
    console.log('analyzeReceipt called with:', { 
      fileName: imageFile.name, 
      fileType: imageFile.type,
      expectedDevice 
    });

    // Convert image to base64 with data URI prefix
    const reader = new FileReader();
    const imageBase64 = await new Promise<string>((resolve, reject) => {
      reader.onload = () => {
        const result = reader.result as string;
        console.log('Image converted to base64, length:', result.length);
        resolve(result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(imageFile);
    });

    console.log('Calling analyze-receipt edge function...');
    // Call edge function for AI analysis
    const { data, error } = await supabase.functions.invoke('analyze-receipt', {
      body: {
        imageBase64,
        expectedDevice
      }
    });

    if (error) {
      console.error('Edge function error:', error);
      throw new Error(error.message || 'Receipt analysis failed');
    }

    if (!data) {
      throw new Error('No data returned from receipt analysis');
    }

    console.log('Receipt analysis successful:', data);
    return data;
  } catch (error) {
    console.error('Receipt analysis error:', error);
    throw error;
  }
}
