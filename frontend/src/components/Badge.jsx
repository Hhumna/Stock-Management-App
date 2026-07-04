import React from 'react';

/**
 * Reusable Badge component for status markers or counts.
 * 
 * @param {('green'|'amber'|'red'|'blue'|'gray')} variant - Color palette
 */
export default function Badge({ children, variant = 'gray', className = '' }) {
  const styles = {
    green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    gray: 'bg-slate-100 text-slate-700 border-slate-200'
  };

  const selectedStyle = styles[variant] || styles.gray;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${selectedStyle} ${className}`}>
      {children}
    </span>
  );
}
