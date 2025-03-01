export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> => {
  let lastError: any;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      if (i > 0) {
        const backoffDelay = baseDelay * Math.pow(2, i - 1);
        console.log(`Retry ${i + 1} with delay ${backoffDelay}ms`);
        await delay(backoffDelay);
      }
      return await fn();
    } catch (error) {
      console.error(`Attempt ${i + 1} failed:`, error);
      lastError = error;
      
      if (i < maxRetries - 1 && (error.status === 429 || error.status === 404)) {
        continue;
      }
      throw error;
    }
  }
  
  throw lastError;
};

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Sanitizes text by removing problematic characters and normalizing whitespace
 */
export function sanitizeText(text: string): string {
  if (!text) return '';
  
  return text
    // Remove any control characters
    .replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Replace tabs with spaces
    .replace(/\t/g, ' ')
    // Replace multiple spaces with a single space
    .replace(/\s+/g, ' ')
    // Remove excessive newlines (keep max 2 consecutive)
    .replace(/\n{3,}/g, '\n\n')
    // Trim whitespace
    .trim();
}

/**
 * Safely attempts to parse a JSON string and returns null if parsing fails
 */
export function safeParseJson<T>(jsonString: string): T | null {
  try {
    return JSON.parse(jsonString) as T;
  } catch (e) {
    console.error('Error parsing JSON:', e);
    return null;
  }
}

/**
 * Removes HTML tags from a string
 */
export function stripHtml(html: string): string {
  return html.replace(/<\/?[^>]+(>|$)/g, '');
}

/**
 * Truncates text to a maximum length and adds ellipsis if truncated
 */
export function truncateText(text: string, maxLength: number = 1000): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

/**
 * Validates that an object has specific required fields
 */
export function validateRequiredFields(obj: Record<string, any>, requiredFields: string[]): boolean {
  for (const field of requiredFields) {
    if (obj[field] === undefined || obj[field] === null || obj[field] === '') {
      return false;
    }
  }
  return true;
}
