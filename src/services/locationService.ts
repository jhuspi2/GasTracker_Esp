export interface IPLocation {
  city: string;
  latitude: number;
  longitude: number;
}

export async function getApproximateLocation(): Promise<IPLocation | null> {
  try {
    // Using a public, no-key-needed IP geolocation service
    const response = await fetch('https://ipapi.co/json/');
    const data = await response.json();
    
    if (data.latitude && data.longitude) {
      return {
        city: data.city || 'Desconocida',
        latitude: data.latitude,
        longitude: data.longitude
      };
    }
    return null;
  } catch (error) {
    console.warn('IP Geolocation failed:', error);
    return null;
  }
}
