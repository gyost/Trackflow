import React from 'react';
import logoSrc from '../logo.svg';

interface LogoProps {
  className?: string; // Additional classes for the text or layout container
  iconSize?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
}

export default function Logo({ className = '', iconSize = 'md', showText = true }: LogoProps) {
  // Height classes mapping for standard, proportion-matching rendering
  const heightClasses = {
    sm: 'h-8 sm:h-9',
    md: 'h-10 sm:h-11 lg:h-12',
    lg: 'h-14 sm:h-16 lg:h-20',
    xl: 'h-24 sm:h-28 lg:h-32',
  };

  return (
    <div className={`flex items-center justify-center inline-flex ${className}`}>
      {/* Front-end Built-in SVG Image for exact branding style preservation */}
      <img
        src={logoSrc}
        alt="TrackFlow Logo"
        className={`${heightClasses[iconSize]} w-auto object-contain shrink-0 select-none`}
        referrerPolicy="no-referrer"
      />
    </div>
  );
}
