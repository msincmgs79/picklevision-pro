import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
      children?: React.ReactNode;
      }

      export function Button({
        variant = 'default',
          size = 'md',
            className,
              children,
                ...props
                }: ButtonProps) {
                  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

                    const variantStyles = {
                        default: 'bg-green-700 text-white hover:bg-green-800 focus:ring-green-500',
                            outline: 'border-2 border-green-700 text-green-700 hover:bg-green-50 focus:ring-green-500',
                                ghost: 'text-green-700 hover:bg-green-50 focus:ring-green-500',
                                  };

                                    const sizeStyles = {
                                        sm: 'px-3 py-1.5 text-sm',
                                            md: 'px-4 py-2 text-base',
                                                lg: 'px-6 py-3 text-lg',
                                                  };

                                                    return (
                                                        <button
                                                              className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className || ''}`}
                                                                    {...props}
                                                                        >
                                                                              {children}
                                                                                  </button>
                                                                                    );
                                                                                    }
