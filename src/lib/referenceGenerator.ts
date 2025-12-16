import { supabase } from "@/integrations/supabase/client";

interface ReferenceFormat {
  format: string;
  description: string;
}

interface ProgramFormats {
  policy_number?: ReferenceFormat;
  claim_number?: ReferenceFormat;
  complaint_reference?: ReferenceFormat;
  service_request_reference?: ReferenceFormat;
}

/**
 * Gets the product prefix based on product name
 */
function getProductPrefix(productName: string): string {
  if (productName.match(/extended.*warranty|EW/i)) {
    return 'EW';
  } else if (productName.match(/insurance.*lite|IL/i)) {
    return 'IL';
  } else if (productName.match(/insurance.*max|IM/i)) {
    return 'IM';
  }
  return 'EW'; // Default
}

/**
 * Generates a reference number based on program format configuration
 */
export async function generateReferenceNumber(
  programId: string,
  referenceType: 'claim_number' | 'policy_number' | 'complaint_reference' | 'service_request_reference',
  productName?: string
): Promise<string> {
  try {
    // Fetch program reference formats
    const { data: program, error } = await supabase
      .from('programs')
      .select('reference_formats')
      .eq('id', programId)
      .single();

    if (error) throw error;

    const formats = program.reference_formats as ProgramFormats;
    const formatConfig = formats?.[referenceType];

    if (!formatConfig?.format) {
      // Fallback to default database function if no format configured
      if (referenceType === 'claim_number' && productName) {
        const { data } = await supabase.rpc('generate_claim_number', { product_name: productName });
        return data || `CLM-${Date.now()}`;
      } else if (referenceType === 'policy_number' && productName) {
        const { data } = await supabase.rpc('generate_policy_number', { product_name: productName });
        return data || `POL-${Date.now()}`;
      }
      return `REF-${Date.now()}`;
    }

    // Parse and generate reference based on format
    let reference = formatConfig.format;
    const now = new Date();

    // Replace date/time variables
    reference = reference.replace(/{YYYY}/g, now.getFullYear().toString());
    reference = reference.replace(/{YY}/g, now.getFullYear().toString().slice(-2));
    reference = reference.replace(/{MM}/g, String(now.getMonth() + 1).padStart(2, '0'));
    reference = reference.replace(/{DD}/g, String(now.getDate()).padStart(2, '0'));

    // Replace product prefix if product name provided
    if (productName) {
      const prefix = getProductPrefix(productName);
      reference = reference.replace(/{product_prefix}/g, prefix);
    }

    // Replace program code (first 3 chars of program ID)
    reference = reference.replace(/{program_code}/g, programId.slice(0, 3).toUpperCase());

    // Replace sequences with padded numbers
    const sequenceMatches = reference.match(/{sequence:(\d+)}/g);
    if (sequenceMatches) {
      for (const match of sequenceMatches) {
        const padding = parseInt(match.match(/\d+/)?.[0] || '6');
        // Generate a random sequence number (in production, this should use a proper sequence)
        const sequenceNum = Math.floor(Math.random() * Math.pow(10, padding));
        reference = reference.replace(match, sequenceNum.toString().padStart(padding, '0'));
      }
    }

    // Replace random numbers
    const randomMatches = reference.match(/{random:(\d+)}/g);
    if (randomMatches) {
      for (const match of randomMatches) {
        const length = parseInt(match.match(/\d+/)?.[0] || '6');
        const randomNum = Math.floor(Math.random() * Math.pow(10, length));
        reference = reference.replace(match, randomNum.toString().padStart(length, '0'));
      }
    }

    return reference;
  } catch (error) {
    console.error('Error generating reference number:', error);
    // Fallback to timestamp-based reference
    return `${referenceType.toUpperCase().slice(0, 3)}-${Date.now()}`;
  }
}
