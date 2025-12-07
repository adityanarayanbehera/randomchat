// Auto-retry utility for failed API calls
// frontend/src/lib/fetchWithRetry.js

/**
 * Fetch with automatic retry logic and exponential backoff
 * @param {string} url - The URL to fetch
 * @param {object} options - Fetch options
 * @param {number} retries - Number of retries (default: 3)
 * @returns {Promise<Response>} - Fetch response
 */
export const fetchWithRetry = async (url, options = {}, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      
      // Success - return immediately
      if (response.ok) {
        return response;
      }
      
      // Don't retry 4xx errors (client errors - bad request, unauthorized, etc.)
      if (response.status >= 400 && response.status < 500) {
        console.warn(`❌ Client error ${response.status}, not retrying: ${url}`);
        return response;
      }
      
      // Retry 5xx errors (server errors) and network errors
      if (i < retries - 1) {
        const delay = 1000 * Math.pow(2, i); // Exponential backoff: 1s, 2s, 4s
        console.warn(`⚠️ Request failed (attempt ${i + 1}/${retries}), retrying in ${delay}ms: ${url}`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        console.error(`❌ Request failed after ${retries} attempts: ${url}`);
        return response;
      }
    } catch (error) {
      // Network error or fetch failed
      if (i === retries - 1) {
        console.error(`❌ Network error after ${retries} attempts:`, error);
        throw error;
      }
      
      const delay = 1000 * Math.pow(2, i);
      console.warn(`⚠️ Network error (attempt ${i + 1}/${retries}), retrying in ${delay}ms:`, error.message);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

/**
 * Fetch JSON with retry logic
 * @param {string} url - The URL to fetch
 * @param {object} options - Fetch options
 * @param {number} retries - Number of retries
 * @returns {Promise<any>} - Parsed JSON response
 */
export const fetchJSONWithRetry = async (url, options = {}, retries = 3) => {
  const response = await fetchWithRetry(url, options, retries);
  
  if (!response.ok) {
    const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
    error.response = response;
    throw error;
  }
  
  return response.json();
};

// Usage examples:
// 
// Basic usage:
// const response = await fetchWithRetry('/api/chats/recent', { credentials: 'include' });
// const data = await response.json();
//
// JSON shorthand:
// const data = await fetchJSONWithRetry('/api/chats/recent', { credentials: 'include' });
//
// Custom retry count:
// const response = await fetchWithRetry('/api/critical-endpoint', { credentials: 'include' }, 5);
