/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Type } from "@google/genai";
import { PriceHistory, PricePrediction, FuelType } from "../types";
import { addDays, format } from "date-fns";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function parseSearchIntent(query: string): Promise<{ fuel?: FuelType; city?: string; isCheap?: boolean }> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Extract search intent from this query: "${query}". 
      Available fuels: G95E5 (Gasolina 95), G98E5 (Gasolina 98), GOA (Diesel/Gasóleo A), GPR (Diesel Premium), GLP.
      Return JSON with fields: fuel (code), city (string), isCheap (boolean if looking for cheap/lowest prices).`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            fuel: { type: Type.STRING, description: "Fuel type code if mentioned" },
            city: { type: Type.STRING, description: "City or location name if mentioned" },
            isCheap: { type: Type.BOOLEAN, description: "True if user wants cheap/best price" },
          }
        }
      }
    });

    return JSON.parse(response.text?.trim() || '{}');
  } catch (err) {
    console.error("AI Search Error:", err);
    return {};
  }
}

const MARKET_TREND_CACHE = new Map<string, { timestamp: number; data: Record<string, number[]> }>();
const TREND_TTL = 1000 * 60 * 60 * 4; // 4 hours

/**
 * Gets a global trend index for all fuel types based on Brent and News.
 * Returns an object where each fuel key has an array of 3 multipliers (day1, day2, day3).
 */
async function getMarketTrendIndex(): Promise<Record<string, number[]>> {
  const cacheKey = 'global-market-trend';
  const cached = MARKET_TREND_CACHE.get(cacheKey);
  
  if (cached && (Date.now() - cached.timestamp < TREND_TTL)) {
    return cached.data;
  }

  const prompt = `
    Como analista experto en hidrocarburos en España, realiza un análisis de mercado.
    CONSIDERA: Precio barril Brent, noticias de energía hoy en España, y estructura de impuestos (IEH fijo + IVA 21%).
    
    TAREA: Predice la variación porcentual esperada del PRECIO FINAL AL CONSUMIDOR para los próximos 3 días.
    Combustibles: G95E5, G98E5, GOA, GPR.
    
    RESPUESTA: JSON con multiplicadores (ej: 1.002 = +0.2%).
    {
      "G95E5": [1.002, 1.005, 1.008],
      "G98E5": [1.002, 1.004, 1.007],
      "GOA": [0.998, 0.995, 0.992],
      "GPR": [0.998, 0.996, 0.993]
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json"
      }
    });

    const trendData = JSON.parse(response.text?.replace(/```json|```/g, '').trim() || '{}');
    MARKET_TREND_CACHE.set(cacheKey, { timestamp: Date.now(), data: trendData });
    return trendData;
  } catch (error) {
    console.error('Error fetching market trend:', error);
    // Fallback based on typical daily variations if search fails
    return {
      "G95E5": [1.001, 1.002, 1.003], 
      "G98E5": [1.001, 1.002, 1.003], 
      "GOA": [0.999, 0.998, 0.997], 
      "GPR": [0.999, 0.998, 0.997]
    };
  }
}

export async function predictPrices(
  currentPrice: number,
  fuelType: string,
  _history: PriceHistory[]
): Promise<PricePrediction[]> {
  try {
    const trends = await getMarketTrendIndex();
    const fuelTrend = trends[fuelType] || [1, 1, 1];
    
    return fuelTrend.map((multiplier, i) => ({
      date: format(addDays(new Date(), i + 1), 'yyyy-MM-dd'),
      predictedPrice: parseFloat((currentPrice * multiplier).toFixed(3)),
      confidence: 0.85 - (i * 0.05)
    }));
  } catch (error) {
    console.error('Prediction calculation error:', error);
    return [1, 2, 3].map(i => ({
      date: format(addDays(new Date(), i), 'yyyy-MM-dd'),
      predictedPrice: currentPrice,
      confidence: 0.5
    }));
  }
}

export async function getRealTimeBrentPrice(): Promise<{ current: number; previousClose: number; change: number; advice: string } | null> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Search for the current price of Brent Oil Crude today and its previous day's closing price. 
      You can check reliable financial sources like Investing.com (es.investing.com/commodities/brent-oil) or similar.
      Calculate the percentage variation between today's price and yesterday's close.
      Return EXACTLY a JSON with: 
      - current (number, e.g. 85.5)
      - previousClose (number, e.g. 80.0)
      - change (number, percentage change like 6.8 or -2.1)
      - advice (string, a short advice for the user based on this variation and its impact on gas prices in Spain).`,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            current: { type: Type.NUMBER },
            previousClose: { type: Type.NUMBER },
            change: { type: Type.NUMBER },
            advice: { type: Type.STRING }
          },
          required: ["current", "previousClose", "change", "advice"]
        }
      }
    });

    return JSON.parse(response.text?.replace(/```json|```/g, '').trim() || 'null');
  } catch (err) {
    console.error("Brent Search Error:", err);
    return null;
  }
}

// Helper to generate fake history for the demo
export async function getStationReviews(name: string, location: string): Promise<Review[]> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Find the 5 most representative real reviews from Google Maps for this gas station: ${name} in ${location}. 
      Focus on recent feedback about price, service, and infrastructure.
      Return EXACTLY a JSON array of objects with fields: id (string), author, rating (number 1-5), date, text.`,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              author: { type: Type.STRING },
              rating: { type: Type.NUMBER },
              date: { type: Type.STRING },
              text: { type: Type.STRING }
            },
            required: ["id", "author", "rating", "date", "text"]
          }
        }
      }
    });

    return JSON.parse(response.text?.trim() || '[]');
  } catch (err) {
    console.error("AI Reviews Error:", err);
    return [];
  }
}

export async function getSmartAdvice(fuelType: FuelType, prices: number[]): Promise<string> {
  const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const savings = max - min;

  const prompt = `
    Como asesor experto en ahorro de combustible en España.
    Datos actuales para ${fuelType}:
    - Precio Medio: ${avg.toFixed(3)}€
    - Precio Mínimo: ${min.toFixed(3)}€
    - Ahorro Potencial: ${savings.toFixed(3)}€ por litro.
    
    Genera un único consejo (máximo 15 palabras) directo y motivador para el usuario. 
    Usa un tono profesional pero cercano. No menciones los datos técnicos exactos a menos que sea necesario.
    RESPUESTA: Solo el texto del consejo.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    return response.text?.trim() || "Ahorra hoy eligiendo la estación más barata cerca de ti.";
  } catch (error) {
    return "Llena el depósito en las estaciones marcadas en verde para maximizar tu ahorro.";
  }
}

interface Review {
  id: string;
  author: string;
  rating: number;
  date: string;
  text: string;
}

export function generateMockHistory(currentPrice: number): PriceHistory[] {
  const history: PriceHistory[] = [];
  for (let i = 20; i >= 1; i--) {
    const date = format(addDays(new Date(), -i), 'yyyy-MM-dd');
    // Random walk with trend
    const noise = (Math.random() - 0.5) * 0.05;
    const trend = -0.002 * i;
    history.push({
      date,
      price: parseFloat((currentPrice + noise + trend).toFixed(3))
    });
  }
  return history;
}
