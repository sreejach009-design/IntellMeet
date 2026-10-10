import React from 'react';

const Loader = ({ label = 'Loading...', size = 'md', className = '' }) => {
  const sizes = {
    sm: 'w-5 h-5 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  };

  return (
    <div className={`flex flex-col items-center justify-center py-12 gap-3 text-slate-400 ${className}`}>
      <div
        className={`${sizes[size]} rounded-full border-indigo-500/20 border-t-indigo-500 animate-spin`}
      />
      {label && <p className="text-sm font-medium text-slate-400">{label}</p>}
    </div>
  );
};

export default Loader;
