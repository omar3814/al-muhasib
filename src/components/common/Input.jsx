import React from 'react';

const Input = React.forwardRef(
  ({ id, label, type = 'text', error, required = false, className = '', labelClassName = '', inputClassName = '', leftIcon, ...props }, ref) => {
    const hasIcon = !!leftIcon;
    return (
      <div className={`mb-4 ${className}`}>
        {label && (
          <label htmlFor={id} className={`block text-sm font-medium text-brand-dark-text-secondary mb-1.5 ${labelClassName}`}>
            {label} {required && <span className="text-brand-danger">*</span>}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none">
              {React.cloneElement(leftIcon, { className: `w-4 h-4 ${error ? 'text-brand-danger' : 'text-brand-dark-text-placeholder group-focus-within:text-brand-accent'}`})}
            </div>
          )}
          <input
            type={type}
            id={id}
            name={id}
            ref={ref}
            required={required}
            className={`w-full px-3.5 py-2.5 bg-brand-dark-card border border-brand-dark-border rounded-lg shadow-sm 
                        focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-brand-accent 
                        text-brand-dark-text-primary placeholder-brand-dark-text-placeholder 
                        disabled:opacity-60 disabled:cursor-not-allowed group
                        ${error ? 'border-brand-danger ring-brand-danger' : 'border-brand-dark-border'}
                        ${hasIcon ? 'ps-10' : ''} 
                        ${inputClassName}`}
            {...props}
          />
        </div>
        {error && <p className="mt-1.5 text-xs text-brand-danger">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
export default Input;