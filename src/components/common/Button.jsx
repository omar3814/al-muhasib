// src/components/common/Button.jsx
import React from 'react';

const Button = ({
  children,
  type = 'button',
  variant = 'primary', // 'primary', 'secondary', 'danger', 'outline'
  size = 'md', // 'sm', 'md', 'lg'
  isLoading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  className = '',
  ...props
}) => {
  const baseStyles = "inline-flex items-center justify-center font-semibold rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-opacity-60 transition-all duration-150 ease-in-out";

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-7 py-3 text-base',
  };

  const variantStyles = {
    primary: `bg-accent-blue text-white hover:bg-blue-500 focus:ring-accent-blue ${disabled || isLoading ? '' : 'active:bg-blue-600'}`,
    secondary: `bg-slate-blue text-text-primary-dark hover:bg-opacity-80 focus:ring-slate-blue ${disabled || isLoading ? '' : 'active:bg-opacity-70'}`,
    danger: `bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 ${disabled || isLoading ? '' : 'active:bg-red-800'}`,
    outline: `bg-transparent border border-accent-blue text-accent-blue hover:bg-accent-blue hover:text-white focus:ring-accent-blue ${disabled || isLoading ? '' : 'active:bg-blue-700'}`,
  };

  const loadingSpinner = (
    <svg 
      className="animate-spin h-5 w-5 text-current" 
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24"
      style={{ marginLeft: leftIcon ? '0.5rem' : '-0.25rem', marginRight: rightIcon || children ? '0.5rem' : '-0.25rem' }}
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  );

  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${disabled || isLoading ? 'opacity-60 cursor-not-allowed' : ''} ${className}`}
      {...props}
    >
      {isLoading && !leftIcon && loadingSpinner}
      {leftIcon && !isLoading && <span className="me-2">{leftIcon}</span>}
      {children}
      {rightIcon && !isLoading && <span className="ms-2">{rightIcon}</span>}
      {isLoading && rightIcon && loadingSpinner}
    </button>
  );
};

export default Button;