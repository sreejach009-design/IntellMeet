import React from 'react';
import Card from '../common/Card';
import Badge from '../common/Badge';
import { Sparkles, Tag } from 'lucide-react';

const SummaryCard = ({ summary, onRegenerate, isLoading = false }) => {
  if (!summary) return null;

  const sentimentVariants = {
    positive: 'success',
    constructive: 'primary',
    neutral: 'info',
    mixed: 'warning',
  };

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">
              Executive AI Summary
            </h3>
            <span className="text-[11px] text-slate-500">
              Generated with {summary.modelUsed || 'OpenAI Intelligence'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {summary.sentiment && (
            <Badge
              variant={sentimentVariants[summary.sentiment] || 'primary'}
              size="sm"
            >
              Tone: {summary.sentiment}
            </Badge>
          )}
        </div>
      </div>

      <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-line space-y-3">
        {summary.overview}
      </div>

      {summary.keywords && summary.keywords.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 mt-5 pt-4 border-t border-slate-800">
          <Tag className="w-3.5 h-3.5 text-slate-500 mr-1" />
          {summary.keywords.map((kw, i) => (
            <span
              key={i}
              className="text-[11px] bg-slate-800/80 text-slate-400 px-2.5 py-0.5 rounded-lg border border-slate-700/50"
            >
              {kw}
            </span>
          ))}
        </div>
      )}
    </Card>
  );
};

export default SummaryCard;
