import { forwardRef, type ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'destructive' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  loading?: boolean;
}

const variantClass: Record<Variant, string> = {
  // PAN: 검정 배경 + 흰 글자, hover 시 살짝 밝게
  primary: 'bg-gray-900 text-white hover:bg-gray-800 active:bg-black disabled:bg-gray-200 disabled:text-gray-500',
  secondary: 'bg-white text-gray-900 border border-gray-300 hover:border-gray-900 hover:bg-gray-50 active:bg-gray-100 disabled:bg-gray-50 disabled:text-gray-600',
  destructive: 'bg-coral text-white hover:bg-red-700 active:bg-red-800 disabled:bg-gray-200 disabled:text-gray-500',
  ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 active:bg-gray-200',
};

const sizeClass: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-lg',
  md: 'px-4 py-2.5 text-sm rounded-lg',
  lg: 'px-5 py-3 text-sm rounded-lg font-bold tracking-tight',
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', fullWidth, loading, disabled, className = '', children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`font-bold transition-colors active:scale-[0.98] disabled:cursor-not-allowed ${variantClass[variant]} ${sizeClass[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
        {...props}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
            {children}
          </span>
        ) : children}
      </button>
    );
  }
);
Button.displayName = 'Button';

export default Button;
