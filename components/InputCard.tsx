
import React from 'react';

interface InputCardProps {
  title: string;
  description?: string;
  placeholder: string;
  value: string;
  onChange: (val: string) => void;
  onClear: () => void;
  onAction?: () => void;
  actionLabel?: string;
  isLoading?: boolean;
  count: number;
}

export const InputCard: React.FC<InputCardProps> = ({
  title, description, placeholder, value, onChange, onClear, onAction, actionLabel, isLoading, count
}) => {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">{title}</h2>
          {description && <p className="text-xs text-slate-500 mt-1">{description}</p>}
        </div>
        <span className="text-sm font-bold px-3 py-1 rounded-full bg-green-50 text-green-700 border border-green-200 whitespace-nowrap ml-2">
          {count.toLocaleString()} {count === 1 ? 'item' : 'itens'}
        </span>
      </div>
      
      <textarea
        className="w-full h-32 p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all font-mono text-xs bg-white text-black placeholder:text-slate-400"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      
      <div className="mt-3 flex gap-2">
        {onAction && (
          <button
            onClick={onAction}
            disabled={isLoading || !value.trim()}
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 text-white py-2 px-4 rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : actionLabel}
          </button>
        )}
        <button
          onClick={onClear}
          className="bg-slate-100 hover:bg-slate-200 text-slate-500 py-2 px-4 rounded-lg font-semibold text-sm transition-colors ml-auto"
        >
          Limpar
        </button>
      </div>
    </div>
  );
};
