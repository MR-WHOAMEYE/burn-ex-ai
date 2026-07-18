/**
 * Nutrition AI Controller — Gemini Vision food analysis
 *
 * Accepts a base64 food image, sends it to Gemini for detection,
 * and returns structured nutrition data.
 */
import type { Request, Response } from 'express';
import { ENV } from '../config/env.js';

interface GeminiNutritionResult {
  detectedFoods: string[];
  cal: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber: number;
  sugar: number;
  sodium: number;
  confidence: number;
  healthScore: number;
  suggestions: string;
}

const NUTRITION_PROMPT = `You are a nutrition analysis AI. Analyze this food image and return a JSON object with these exact fields:

{
  "detectedFoods": ["list of detected food items"],
  "cal": <total calories as number>,
  "protein": <grams of protein as number>,
  "carbs": <grams of carbohydrates as number>,
  "fats": <grams of fat as number>,
  "fiber": <grams of dietary fiber as number>,
  "sugar": <grams of sugar as number>,
  "sodium": <milligrams of sodium as number>,
  "confidence": <detection confidence 0-100 as number>,
  "healthScore": <overall health score 0-100 as number>,
  "suggestions": "<one or two sentences of dietary advice based on this meal>"
}

Rules:
- Estimate realistic portion sizes from the image
- Use standard USDA nutrition database values
- Be specific with food names (e.g. "Grilled Chicken Breast" not just "chicken")
- Return ONLY the JSON object, no markdown, no backticks, no explanation`;

export const nutritionController = {
  async analyzeMeal(req: Request, res: Response) {
    try {
      const { imageBase64, mimeType } = req.body as {
        imageBase64?: string;
        mimeType?: string;
      };

      if (!imageBase64) {
        return res.status(400).json({ error: 'imageBase64 is required' });
      }

      if (!ENV.GEMINI_API_KEY) {
        return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
      }

      const mime = mimeType || 'image/jpeg';

      // Call Gemini Vision API
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemma-4-26b-a4b-it:generateContent?key=${ENV.GEMINI_API_KEY}`;

      const geminiRes = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: NUTRITION_PROMPT },
                {
                  inlineData: {
                    mimeType: mime,
                    data: imageBase64,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 1024,
          },
        }),
      });

      if (!geminiRes.ok) {
        const errText = await geminiRes.text();
        console.error('[Nutrition AI] Gemini error:', geminiRes.status, errText);
        return res.status(502).json({ error: 'Gemini API error', detail: errText });
      }

      const geminiData = (await geminiRes.json()) as any;
      // Extract text from the last part (thinking models put text in the final part)
      const parts = geminiData?.candidates?.[0]?.content?.parts || [];
      const rawText = parts.filter((p: any) => p.text).pop()?.text || '';

      // Parse JSON from response (strip any markdown fences)
      const jsonStr = rawText
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '')
        .trim();

      const result: GeminiNutritionResult = JSON.parse(jsonStr);

      // Normalize confidence to 0-100 range (model sometimes returns 0-1)
      if (result.confidence > 0 && result.confidence <= 1) {
        result.confidence = Math.round(result.confidence * 100);
      }
      // Normalize healthScore to 0-100 range (model sometimes returns 0-10)
      if (result.healthScore > 0 && result.healthScore <= 10) {
        result.healthScore = Math.round(result.healthScore * 10);
      }

      return res.json({ success: true, data: result });
    } catch (err: any) {
      console.error('[Nutrition AI] Error:', err.message);
      return res.status(500).json({ error: 'Failed to analyze meal', detail: err.message });
    }
  },
};
