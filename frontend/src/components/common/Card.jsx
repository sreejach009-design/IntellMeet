import React from 'react';

const Card = ({
  children,
  className = '',
  hoverEffect = false,
  glass = false,
  ...props
}) => {
  const baseClasses = 'rounded-2xl transition-all duration-200';
  const styleClasses = glass
    ? 'glass-card border border-white/5'
    : 'bg-[#111827] border border-slate-800/80 shadow-xl shadow-black/20';
  const hoverClasses = hoverEffect
    ? 'hover:border-slate-700 hover:shadow-2xl hover:shadow-indigo-500/5 hover:-translate-y-0.5'
    : '';

  return (
    <div
      className={`${baseClasses} ${styleClasses} ${hoverClasses} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;
