// src/components/common/Modal.jsx
import React, { useEffect } from 'react';
import { FiX } from 'react-icons/fi';

const Modal = ({ isOpen, onClose, title, children, size = 'md' }) => {
  useEffect(() => {
    const handleEsc = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl'
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm p-4"
      onClick={onClose} // Close on overlay click
    >
      <div
        className={`bg-navy-light rounded-xl shadow-2xl flex flex-col overflow-hidden w-full ${sizeClasses[size]}`}
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal content
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-blue">
          <h3 className="text-lg font-semibold text-text-primary-dark">{title}</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-text-secondary-dark hover:bg-slate-blue hover:text-text-primary-dark transition-colors"
            aria-label="Close modal"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto max-h-[calc(100vh-10rem)]">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;