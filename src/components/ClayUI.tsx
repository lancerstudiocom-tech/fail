import React from 'react';
import { cn } from '../lib/utils';
import { motion, HTMLMotionProps } from 'motion/react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  inset?: boolean;
  variant?: 'blue' | 'green' | 'red' | 'purple';
}

export const Card: React.FC<CardProps> = ({ 
  children, 
  className, 
  inset = false, 
  ...props 
}) => {
  return (
    <div
      className={cn(
        inset ? 'glass-card-inset' : 'glass-card',
        'p-6',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

interface ButtonProps extends HTMLMotionProps<"button"> {
  variant?: 'blue' | 'green' | 'red' | 'purple' | 'primary' | 'secondary';
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  className, 
  variant = 'primary',
  ...props 
}) => {
  const variantClasses = {
    primary: 'btn-premium',
    secondary: 'bg-primary/10 text-primary border border-primary/20 backdrop-blur-xl hover:bg-primary/20',
    red: 'bg-rose-500 text-white shadow-[0_10px_20px_rgba(244,63,94,0.3)]',
    blue: 'bg-primary/10 text-primary border border-primary/20 backdrop-blur-xl hover:bg-primary/20', // Remap blue to secondary
    purple: 'btn-premium',
    green: 'btn-premium',
  };

  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      whileHover={{ scale: 1.02, y: -2 }}
      className={cn(
        'relative flex items-center justify-center gap-3 rounded-full font-headline font-bold uppercase tracking-[0.2em] text-[10px] transition-all duration-500',
        variantClasses[variant as keyof typeof variantClasses] || variantClasses.primary,
        'px-8 py-4',
        className
      )}
      {...props}
    >
      {children}
    </motion.button>
  );
};

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input: React.FC<InputProps> = ({ className, ...props }) => {
  return (
    <input
      className={cn('input-premium w-full text-primary font-bold placeholder:text-primary/30', className)}
      {...props}
    />
  );
};
