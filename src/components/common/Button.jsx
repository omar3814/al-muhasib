import React from 'react';

const Button = ({
  children,
  type = 'button',
  variant = 'primary', 
  size = 'md', 
  isLoading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  className = '',
  ...props
}) => {
  const baseStyles = `
    inline-flex items-center justify-center font-semibold rounded-lg 
    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-pa-dark-bg focus:ring-opacity-70 
    transition-all duration-200 ease-out
    transform 
    hover:-translate-y-1 hover:scale-105
    active:scale-90 active:translate-y-0 active:duration-100
    disabled:opacity-60 disabled:cursor-not-allowed 
    disabled:hover:transform-none disabled:hover:shadow-none
  `;

  const sizeStyles = {
    sm: 'px-3.5 py-2 text-xs',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  const variantStyles = {
    primary: `
      bg-pa-button-bg text-pa-button-text 
      hover:bg-pa-button-hover-bg 
      focus:ring-pa-button-bg
      shadow-card hover:shadow-modal 
      active:shadow-subtle
    `,
    accent: `
      text-white 
      bg-gradient-to-br from-pa-accent-interactive to-blue-600 
      hover:from-pa-accent-interactive-hover hover:to-blue-500 
      focus:ring-pa-accent-interactive
      shadow-card hover:shadow-modal 
      active:shadow-subtle active:from-blue-600 active:to-pa-accent-interactive
    `,
    secondary: `
      bg-pa-dark-surface text-pa-text-primary 
      hover:bg-pa-dark-border hover:text-pa-text-primary
      focus:ring-pa-accent-interactive
      border border-transparent hover:border-pa-dark-border 
      shadow-subtle hover:shadow-card
      active:shadow-none active:bg-opacity-90
    `,
    danger: `
      bg-pa-danger text-white 
      hover:opacity-90 hover:bg-red-700 
      focus:ring-pa-danger 
      shadow-card hover:shadow-modal
      active:shadow-subtle active:bg-red-800
    `,
    outline: `
      bg-transparent border border-pa-accent-interactive text-pa-accent-interactive 
      hover:bg-pa-accent-interactive hover:text-white 
      focus:ring-pa-accent-interactive
      active:bg-opacity-90 active:scale-95
    `,
    ghost: `
      bg-transparent text-pa-text-secondary 
      hover:bg-pa-dark-surface hover:text-pa-text-primary 
      focus:ring-pa-accent-interactive
      active:bg-opacity-70 active:scale-95
    `
  };

  const loadingSpinner = (
    <svg 
      className="animate-spin h-5 w-5 text-current" 
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24"
      style={{ 
        marginLeft: leftIcon || children ? '0' : '-0.125rem',
        marginRight: rightIcon || children ? '0.5rem' : '-0.125rem' 
      }}
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  );
  
  let buttonContent;
  if (isLoading) {
    buttonContent = (
      <>
        {leftIcon && <span className="opacity-0">{leftIcon}</span>}
        {loadingSpinner}
        {children && <span className="opacity-0">{children}</span>}
        {rightIcon && <span className="opacity-0">{rightIcon}</span>}
      </>
    );
  } else {
    buttonContent = (
      <>
        {leftIcon && <span className={children ? "me-2" : ""}>{leftIcon}</span>}
        {children}
        {rightIcon && <span className={children ? "ms-2" : ""}>{rightIcon}</span>}
      </>
    );
  }

  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      className={`
        ${baseStyles} 
        ${sizeStyles[size]} 
        ${variantStyles[variant] || variantStyles.primary} 
        ${isLoading ? 'relative ' : ''} 
        ${className}
      `}
      {...props}
    >
      {isLoading && children && (
        <span className="absolute inset-0 flex items-center justify-center">
            {loadingSpinner}
        </span>
      )}
      <span className={(isLoading && children) ? 'opacity-0' : 'opacity-100'}>
        {buttonContent}
      </span>
    </button>
  );
};

export default Button;