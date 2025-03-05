
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
      
      // Continue retrying for rate limit errors and certain other status codes
      if (i < maxRetries - 1 && 
          (error.status === 429 || error.status === 503 || error.status === 502 || error.status === 504)) {
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

// Helper function to create a timeout promise
export const createTimeout = (ms: number): Promise<never> => {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Operation timed out after ${ms}ms`)), ms);
  });
};

// Helper function to race a promise against a timeout
export const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> => {
  return Promise.race([promise, createTimeout(ms)]);
};
