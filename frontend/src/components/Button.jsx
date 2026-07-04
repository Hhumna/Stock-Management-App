import React from 'react';

/**
 * Reusable Button component.
 * 
 * @param {('primary'|'secondary'|'danger'|'ghost')} variant - Look of the button
 */
export default function Button({ 
  children, 
  variant = 'primary', 
  type = 'button', 
  onClick, 
  disabled = false, 
  className = '', 
  ...props 
}) {
  const baseStyle = "inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-brand-accent hover:bg-brand-accentHover text-white focus:ring-brand-accent border border-transparent shadow-sm",
    secondary: "bg-white hover:bg-slate-50 text-brand-textMain border border-brand-border shadow-sm focus:ring-brand-accent",
    danger: "bg-red-600 hover:bg-red-700 text-white focus:ring-red-500 border border-transparent shadow-sm",
    ghost: "bg-transparent hover:bg-slate-100 text-brand-textMuted hover:text-brand-textMain focus:ring-brand-accent border border-transparent"
  };

  const selectedVariant = variants[variant] || variants.primary;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyle} ${selectedVariant} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
