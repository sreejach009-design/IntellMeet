import React from 'react';
import Card from '../common/Card';
import { CheckCircle2 } from 'lucide-react';

const DecisionsCard = ({ decisions = [] }) => {
  if (!decisions || decisions.length === 0) return null;

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
          <CheckCircle2 className="w-4 h-4" />
        </div>
        <h3 className="text-base font-semibold text-white">
          Decisions Agreed ({decisions.length})
        </h3>
      </div>

      <div className="space-y-3">
        {decisions.map((d, idx) => (
          <div
            key={idx}
            className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-start gap-3"
          >
            <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-[10px] font-bold">{idx + 1}</span>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-slate-100">
                {d.decision}
              </h4>
              {d.context && (
                <p className="text-xs text-slate-400 mt-0.5">{d.context}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default DecisionsCard;
