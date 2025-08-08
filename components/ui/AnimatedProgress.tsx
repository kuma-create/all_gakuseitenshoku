import React from 'react';
import { motion } from 'motion/react';
import { CheckCircle } from 'lucide-react';

interface AnimatedProgressProps {
  value: number;
  max?: number;
  showPercentage?: boolean;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'green' | 'blue' | 'purple' | 'orange';
  animated?: boolean;
}

export function AnimatedProgress({ 
  value, 
  max = 100, 
  showPercentage = true, 
  showIcon = true,
  size = 'md',
  color = 'primary',
  animated = true
}: AnimatedProgressProps) {
  const percentage = Math.min(100, (value / max) * 100);
  const isComplete = percentage >= 100;

  const sizeClasses = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4'
  };

  const colorClasses = {
    primary: 'bg-primary',
    green: 'bg-green-500',
    blue: 'bg-blue-500',
    purple: 'bg-purple-500',
    orange: 'bg-orange-500'
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        {showPercentage && (
          <motion.span 
            className="text-sm font-medium text-foreground"
            animate={{ scale: isComplete ? [1, 1.1, 1] : 1 }}
            transition={{ duration: 0.3 }}
          >
            {Math.round(percentage)}%
          </motion.span>
        )}
        {showIcon && isComplete && (
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
          >
            <CheckCircle className="w-4 h-4 text-green-500" />
          </motion.div>
        )}
      </div>
      
      <div className={`w-full ${sizeClasses[size]} bg-muted rounded-full overflow-hidden`}>
        <motion.div
          className={`h-full ${colorClasses[color]} rounded-full relative`}
          initial={{ width: animated ? "0%" : `${percentage}%` }}
          animate={{ width: `${percentage}%` }}
          transition={{ 
            duration: animated ? 1.2 : 0,
            ease: "easeInOut",
            delay: 0.3
          }}
        >
          {size === 'lg' && (
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
              animate={{
                x: ['-100%', '100%']
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                repeatDelay: 3,
                ease: "linear"
              }}
            />
          )}
        </motion.div>
      </div>
    </div>
  );
}