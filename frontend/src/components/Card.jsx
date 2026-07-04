import React from 'react';

/**
 * Reusable Card component for dashboards.
 */
export default function Card({ children, title, subtitle, action, className = '' }) {
  return (
    <div className={`bg-brand-card border border-brand-border rounded-lg shadow-card p-6 ${className}`}>
      {(title || subtitle || action) && (
        <div className="flex items-center justify-between border-b border-brand-border pb-4 mb-5">
          <div>
            {title && <h3 className="text-lg font-semibold text-brand-textMain leading-6">{title}</h3>}
            {subtitle && <p className="text-sm text-brand-textMuted mt-1">{subtitle}</p>}
          </div>
          {action && <div className="flex-shrink-0">{action}</div>}
        </div>
      )}
      <div>
        {children}
      </div>
    </div>
  );
}
