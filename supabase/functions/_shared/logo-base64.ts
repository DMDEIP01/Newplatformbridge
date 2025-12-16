// MediaMarkt logo as base64 data URL
// Logo will be rendered white via CSS filter in the email template
export const getLogoBase64 = async (supabaseUrl: string): Promise<string> => {
  try {
    // Fetch the logo from Supabase storage
    const logoUrl = `${supabaseUrl}/storage/v1/object/public/promotion-logos/mediamarkt-logo-email.png`;
    const response = await fetch(logoUrl);
    
    if (!response.ok) {
      console.error('Failed to fetch logo:', response.statusText);
      return logoUrl;
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    
    return `data:image/png;base64,${base64}`;
  } catch (error) {
    console.error('Error converting logo to base64:', error);
    return `${supabaseUrl}/storage/v1/object/public/promotion-logos/mediamarkt-logo-email.png`;
  }
};
