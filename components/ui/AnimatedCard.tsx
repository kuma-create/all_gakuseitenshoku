import React from 'react';
import { motion } from 'motion/react';
import { Card } from './Card';

interface AnimatedCardProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
  hover?: boolean;
  tap?: boolean;
}

export function AnimatedCard({ 
  children, 
  className = '', 
  delay = 0, 
  direction = 'up', 
  hover = true,
  tap = true 
}: AnimatedCardProps) {
  const directionVariants = {
    up: { opacity: 0, y: 20 },
    down: { opacity: 0, y: -20 },
    left: { opacity: 0, x: 20 },
    right: { opacity: 0, x: -20 }
  };

  const hoverVariant = hover ? { scale: 1.02, y: -2 } : {};
  const tapVariant = tap ? { scale: 0.98 } : {};

  return (
    <motion.div
      initial={directionVariants[direction]}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ 
        duration: 0.5, 
        delay,
        type: "spring",
        stiffness: 100
      }}
      whileHover={hoverVariant}
      whileTap={tapVariant}
      className={className}
    >
      <Card className="transition-shadow duration-300 hover:shadow-lg">
        {children}
      </Card>
    </motion.div>
  );
}