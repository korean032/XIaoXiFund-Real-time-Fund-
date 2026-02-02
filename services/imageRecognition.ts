/**
 * AI Image Recognition Service
 * Uses internal Cloudflare Pages Function API to extract portfolio data
 */

export interface RecognizedPortfolioData {
  amount?: number;      // 总投入金额
  costPrice?: number;   // 买入均价/成本价
  shares?: number;      // 持有份额
  confidence: number;   // 识别置信度 0-1
  rawText?: string;     // AI返回的原始文本
}

/**
 * Convert image file to base64 data URL
 */
async function imageToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Recognize portfolio data from image using internal API
 */
export async function recognizePortfolioImage(imageFile: File): Promise<RecognizedPortfolioData> {
  const base64Image = await imageToBase64(imageFile);
  
  try {
      console.log('Sending image to internal API...');
      
      const response = await fetch('/api/recognize', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
          },
          body: JSON.stringify({ image: base64Image })
      });

      if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;
      
      if (!content) {
        throw new Error('No content in response');
      }

      // Parse JSON response - handle both plain JSON and markdown code blocks
      let jsonText = content.trim();
      
      // Remove markdown code block if present
      if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/```json?\n?/g, '').replace(/```$/g, '').trim();
      }
      
      // Extract JSON object
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Invalid JSON format in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      console.log('Successfully recognized via internal API');
      
      return {
        amount: parsed.amount || undefined,
        costPrice: parsed.costPrice || undefined,
        shares: parsed.shares || undefined,
        confidence: 0.8,
        rawText: parsed.note
      };

  } catch (error) {
      console.error('Recognition error:', error);
      throw error instanceof Error ? error : new Error('Unknown error during recognition');
  }
}
