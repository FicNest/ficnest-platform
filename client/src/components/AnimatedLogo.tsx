// AnimatedLogo.tsx - Create this new component file
import React, { useEffect, useRef } from "react";

const AnimatedLogo = () => {
  const particlesContainerRef = useRef<HTMLDivElement>(null);

  // Generate particles dynamically when component mounts
  useEffect(() => {
    const particlesContainer = particlesContainerRef.current;
    if (particlesContainer) {
      // Clear existing particles
      particlesContainer.innerHTML = '';
      
      // Create 40 particles with unique animation properties
      for (let i = 0; i < 40; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        
        // Set unique animation parameters as inline styles
        const angle = Math.random() * 360;
        const distance = 50 + Math.random() * 250; // Random distance between 50px and 300px
        const size = 3 + Math.random() * 7; // Random size between 3px and 10px
        const delay = Math.random() * 0.3; // Random delay for explosion variation
        
        // Calculate end position based on angle and distance
        const endX = Math.cos(angle * Math.PI / 180) * distance;
        const endY = Math.sin(angle * Math.PI / 180) * distance;
        
        // Apply custom styles to create unique animation for each particle
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        particle.style.animationDelay = `${delay}s`;
        
        // Set custom animation properties using CSS variables
        particle.style.setProperty('--end-x', `${endX}px`);
        particle.style.setProperty('--end-y', `${endY}px`);
        
        particlesContainer.appendChild(particle);
      }
    }
  }, []);

  return (
    <div className="enhanced-logo-container relative w-full text-center py-16 overflow-hidden min-h-[200px] flex justify-center items-center">
      <div className="text-container relative inline-block z-10">
        <span className="letter text-[3rem] md:text-[4rem] lg:text-[5rem] font-bold inline-block relative origin-center text-[#3498db] animate-letter-1">F</span>
        <span className="letter text-[3rem] md:text-[4rem] lg:text-[5rem] font-bold inline-block relative origin-center text-[#9b59b6] animate-letter-2">i</span>
        <span className="letter text-[3rem] md:text-[4rem] lg:text-[5rem] font-bold inline-block relative origin-center text-[#e74c3c] animate-letter-3">c</span>
        <span className="letter text-[3rem] md:text-[4rem] lg:text-[5rem] font-bold inline-block relative origin-center text-[#f39c12] animate-letter-4">N</span>
        <span className="letter text-[3rem] md:text-[4rem] lg:text-[5rem] font-bold inline-block relative origin-center text-[#2ecc71] animate-letter-5">e</span>
        <span className="letter text-[3rem] md:text-[4rem] lg:text-[5rem] font-bold inline-block relative origin-center text-[#1abc9c] animate-letter-6">s</span>
        <span className="letter text-[3rem] md:text-[4rem] lg:text-[5rem] font-bold inline-block relative origin-center text-[#34495e] animate-letter-7">t</span>
      </div>
      <div ref={particlesContainerRef} className="absolute inset-0 z-5 pointer-events-none"></div>
    </div>
  );
};

export default AnimatedLogo;