import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import Button from './Button';

/**
 * Reusable Modal component.
 */
export default function Modal({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  footer, 
  maxWidth = 'max-w-lg' 
}) {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop (Dark, Solid/Opaque, No blur) */}
      <div 
        className="fixed inset-0 bg-slate-900/60 transition-opacity" 
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className={`relative bg-brand-card w-full ${maxWidth} rounded-lg shadow-xl border border-brand-border z-10 overflow-hidden transform transition-all flex flex-col`}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-brand-border bg-slate-50">
          <h3 className="text-lg font-semibold text-brand-textMain">{title}</h3>
          <button 
            type="button" 
            onClick={onClose} 
            className="text-brand-textLight hover:text-brand-textMain transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6 overflow-y-auto max-h-[70vh]">
          {children}
        </div>

        {/* Footer */}
        {footer ? (
          <div className="px-6 py-4 border-t border-brand-border bg-slate-50 flex justify-end gap-3">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
