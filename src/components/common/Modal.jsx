import React, { useEffect } from 'react';
import { FiX } from 'react-icons/fi';

const Modal = ({ isOpen, onClose, title, children, size = 'md', footer }) => {
  useEffect(() => {
    const handleEsc = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden'; // Prevent background scroll
      document.addEventListener('keydown', handleEsc);
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-brand-dark-bg bg-opacity-80 backdrop-blur-sm p-4 transition-opacity duration-300 ease-in-out"
      onClick={onClose} 
    >
      <div
        className={`bg-brand-dark-card rounded-xl shadow-modal flex flex-col overflow-hidden w-full ${sizeClasses[size]} transform transition-all duration-300 ease-in-out scale-95 group-hover:scale-100`} // Added transform for subtle animation
        onClick={(e) => e.stopPropagation()} 
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-brand-dark-border">
          <h3 className="text-lg font-semibold text-brand-dark-text-primary">{title}</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-brand-dark-text-secondary hover:bg-brand-surface-alt hover:text-brand-dark-text-primary transition-colors"
            aria-label="Close modal"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto max-h-[calc(100vh-12rem)]"> {/* Adjusted max-h */}
          {children}
        </div>

        {/* Optional Modal Footer */}
        {footer && (
          <div className="flex items-center justify-end p-4 sm:p-5 border-t border-brand-dark-border space-s-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;