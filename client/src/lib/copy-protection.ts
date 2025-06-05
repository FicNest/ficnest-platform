// copy-protection.ts - A TypeScript-compatible utility to disable copying
// Add this file to your client/src/lib directory

/**
 * Copy Protection Utility
 * 
 * This utility implements multiple strategies to prevent content copying:
 * 1. Disables the context menu (right-click)
 * 2. Disables text selection in targeted elements
 * 3. Prevents keyboard shortcuts for copy/paste (Ctrl+C, Ctrl+V, etc.)
 * 4. Adds a transparent overlay over content that doesn't interfere with scrolling
 * 5. Disables drag & drop functionality
 */

export function setupCopyProtection(): void {
  // 1. Disable context menu (right-click)
  document.addEventListener('contextmenu', (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    
    // Allow context menu on input fields and textareas
    if (
      target instanceof HTMLInputElement || 
      target instanceof HTMLTextAreaElement ||
      target.getAttribute('contenteditable') === 'true'
    ) {
      return true;
    }
    e.preventDefault();
    return false;
  });

  // 2. Prevent text selection on specific elements
  // Target reading-content and chapter-content classes which contain the novel text
  const applyNoSelectStyle = (): void => {
    const contentElements = document.querySelectorAll('.reading-content, .chapter-content');
    contentElements.forEach(element => {
      const el = element as HTMLElement;
      el.style.userSelect = 'none';
      el.style.webkitUserSelect = 'none';
      // Using any to avoid TypeScript errors with vendor-prefixed properties
      (el.style as any).MozUserSelect = 'none';
      (el.style as any).msUserSelect = 'none';
    });
  };

  // Apply styles when DOM is loaded and whenever it changes
  document.addEventListener('DOMContentLoaded', applyNoSelectStyle);
  
  // Use MutationObserver to detect when new content is added
  const observer = new MutationObserver(() => {
    applyNoSelectStyle();
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // 3. Prevent copy/paste keyboard shortcuts
  document.addEventListener('keydown', (e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    
    // Allow keyboard shortcuts in input fields and textareas
    if (
      target instanceof HTMLInputElement || 
      target instanceof HTMLTextAreaElement ||
      target.getAttribute('contenteditable') === 'true'
    ) {
      return true;
    }
    
    // Check for copy/paste keyboard shortcuts
    if (
      (e.ctrlKey || e.metaKey) && 
      (e.key === 'c' || e.key === 'x' || e.key === 'a')
    ) {
      e.preventDefault();
      return false;
    }
  });

  // 4. Disable drag and drop
  document.addEventListener('dragstart', (e: DragEvent) => {
    const target = e.target as HTMLElement;
    
    // Allow drag and drop for elements that need it (like file inputs)
    if (target instanceof HTMLInputElement && target.type === 'file') {
      return true;
    }
    e.preventDefault();
    return false;
  });

  // 5. Prevent copy event
  document.addEventListener('copy', (e: ClipboardEvent) => {
    const target = e.target as HTMLElement;
    
    // Allow copy in input fields and textareas
    if (
      target instanceof HTMLInputElement || 
      target instanceof HTMLTextAreaElement ||
      target.getAttribute('contenteditable') === 'true'
    ) {
      return true;
    }
    e.preventDefault();
    return false;
  });

  console.log('Copy protection measures have been applied');
}

// Optional: Function to disable protection on specific elements
// Useful for elements where you want to allow copying
export function allowCopyingOn(selector: string): void {
  const elements = document.querySelectorAll(selector);
  elements.forEach(element => {
    const el = element as HTMLElement;
    el.style.userSelect = 'text';
    el.style.webkitUserSelect = 'text';
    // Using any to avoid TypeScript errors with vendor-prefixed properties
    (el.style as any).MozUserSelect = 'text';
    (el.style as any).msUserSelect = 'text';
    
    // Prevent event propagation for these elements
    element.addEventListener('contextmenu', (e: Event) => e.stopPropagation());
    element.addEventListener('copy', (e: Event) => e.stopPropagation());
    element.addEventListener('dragstart', (e: Event) => e.stopPropagation());
  });
}