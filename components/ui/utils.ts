import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Badge用のバリアント関数を代替実装
export function cva(base: string, config?: any) {
  return ({ ...props }: any = {}) => {
    const variants = config?.variants || {};
    const defaultVariants = config?.defaultVariants || {};
    
    let classes = base;
    
    Object.keys(variants).forEach(key => {
      const variant = props[key] || defaultVariants[key];
      if (variant && variants[key][variant]) {
        classes += ' ' + variants[key][variant];
      }
    });
    
    return classes;
  };
}

export type VariantProps<T extends (...args: any) => any> = {
  [K in keyof Parameters<T>[0]]?: Parameters<T>[0][K]
}