// use-copy-protection.tsx - React hook for copy protection
// Add this file to your client/src/hooks directory

import { useEffect } from 'react';
import { setupCopyProtection, allowCopyingOn } from '@/lib/copy-protection';

/**
 * A React hook that sets up copy protection on mount
 * 
 * @param {Object} options - Configuration options
 * @param {string[]} options.allowSelectors - CSS selectors for elements where copying should be allowed
 * @param {boolean} options.enabled - Whether copy protection is enabled (default: true)
 * @returns {void}
 * 
 * @example
 * // Basic usage
 * useCopyProtection();
 * 
 * // With allowed selectors
 * useCopyProtection({ allowSelectors: ['.code-block', '.quote-citation'] });
 * 
 * // Conditionally enabled
 * useCopyProtection({ enabled: user?.isPremium === false });
 */
export function useCopyProtection({ 
  allowSelectors = [], 
  enabled = true 
}: { 
  allowSelectors?: string[],
  enabled?: boolean
} = {}) {
  useEffect(() => {
    if (!enabled) return;
    
    // Set up copy protection
    setupCopyProtection();
    
    // Allow copying on specified elements
    if (allowSelectors.length > 0) {
      allowSelectors.forEach(selector => {
        allowCopyingOn(selector);
      });
    }
  }, [enabled, allowSelectors]);
}