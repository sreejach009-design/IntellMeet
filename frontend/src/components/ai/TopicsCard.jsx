import React from 'react';
import Card from '../common/Card';
import { Layers } from 'lucide-react';

const TopicsCard = ({ topics = [] }) => {
  if (!topics || topics.length === 0) return null;

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
          <Layers className="w-4 h-4" />
        </div>
        <h3 className="text-base font-semibold text-white">
          Key Discussion Topics ({topics.length})
        </h3>
      </div>

      <div className="space-y-3.5">
        {topics.map((t, idx) => (
          <div
            key={idx}
            className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80"
          >
            <h4 className="text-xs font-semibold text-indigo-300">
              {t.topic}
            </h4>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              {t.summary}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default TopicsCard;
