import React from 'react';

interface ProgressBarProps {
  progress: number;
  color?: 'sky' | 'orange' | 'green' | 'purple';
  className?: string;
}

export function ProgressBar({ progress, color = 'sky', className = '' }: ProgressBarProps) {
  const colors = {
    sky: 'bg-sky-500',
    orange: 'bg-orange-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500'
  };

  return (
    <div className={`w-full bg-gray-200 rounded-full h-2 ${className}`}>
      <div 
        className={`h-2 rounded-full transition-all duration-300 ${colors[color]}`}
        style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
      />
    </div>
  );
}