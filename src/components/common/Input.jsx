// src/components/common/Input.jsx
import React from 'react';

const Input = React.forwardRef(
  ({ id, label, type = 'text', error, required = false, className = '', labelClassName = '', inputClassName = '', ...props }, ref) => {
    return (
      <div className={`mb-4 ${className}`}>
        {label && (
          <label htmlFor={id} className={`block text-sm font-medium text-text-secondary-dark mb-1 ${labelClassName}`}>
            {label} {required && <span className="text-red-400">*</span>}
          </label>
        )}
        <input
          type={type}
          id={id}
          name={id}
          ref={ref}
          required={required}
          className={`w-full px-3 py-2.5 bg-navy-light border border-slate-blue rounded-lg shadow-sm 
                    focus:outline-none focus:ring-2 focus:ring-accent-blue focus:border-accent-blue 
                    text-text-primary-dark placeholder-text-secondary-dark 
                    disabled:opacity-50 disabled:cursor-not-allowed
                    ${error ? 'border-red-500 ring-red-500' : 'border-slate-blue'}
                    ${inputClassName}`}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input'; // for better debugging
export default Input;