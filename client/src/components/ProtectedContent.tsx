// ProtectedContent.tsx - A component for displaying copy-protected content
// Add this file to your client/src/components directory

import React, { useEffect, useRef } from 'react';

interface ProtectedContentProps {
  content: string;
  className?: string;
  showWatermark?: boolean;
  watermarkText?: string;
}

/**
 * A component that renders text content with advanced copy protection
 * 
 * Features:
 * - Prevents text selection and copying
 * - Can display a subtle watermark (like username) 
 * - Renders paragraphs properly
 * - Uses CSS to make content harder to scrape
 * 
 * @param {string} content - The text content to display with protection
 * @param {string} className - Additional CSS classes
 * @param {boolean} showWatermark - Whether to show a watermark (default: false)
 * @param {string} watermarkText - The text to use for the watermark
 */
const ProtectedContent: React.FC<ProtectedContentProps> = ({
  content,
  className = '',
  showWatermark = false,
  watermarkText = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Add additional copy protection to this specific component
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Completely prevent selection on this element
    const preventSelection = (e: Event) => {
      e.preventDefault();
      return false;
    };

    container.addEventListener('selectstart', preventSelection);
    container.addEventListener('dragstart', preventSelection);
    
    // Clean up event listeners
    return () => {
      container.removeEventListener('selectstart', preventSelection);
      container.removeEventListener('dragstart', preventSelection);
    };
  }, []);

  // Split content into paragraphs
  const paragraphs = content.split("\n\n");

  return (
    <div 
      ref={containerRef}
      className={`protected-content ${className}`}
      style={{
        userSelect: 'none',
        WebkitUserSelect: 'none',
        MozUserSelect: 'none',
        msUserSelect: 'none',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Actual content */}
      <div className="content">
        {paragraphs.map((paragraph, index) => (
          <p key={index} className="mb-4">{paragraph}</p>
        ))}
      </div>

      {/* Optional watermark */}
      {showWatermark && watermarkText && (
        <div 
          className="watermark"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            opacity: 0.07,
            fontSize: '4rem',
            fontWeight: 'bold',
            color: '#000',
            transform: 'rotate(-30deg)',
            zIndex: 1
          }}
        >
          {watermarkText}
        </div>
      )}
    </div>
  );
};

export default ProtectedContent;