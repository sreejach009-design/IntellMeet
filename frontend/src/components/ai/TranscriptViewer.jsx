import React, { useState } from 'react';
import Card from '../common/Card';
import Button from '../common/Button';
import { FileText, Copy, Check } from 'lucide-react';

const TranscriptViewer = ({ transcript }) => {
  const [copied, setCopied] = useState(false);

  if (!transcript || !transcript.rawText) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(transcript.rawText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Full Transcript</h3>
            <span className="text-[11px] text-slate-500">
              {transcript.wordCount || 0} words &bull; Source: {transcript.source || 'speech-to-text'}
            </span>
          </div>
        </div>

        <Button
          variant="outline"
          size="xs"
          onClick={handleCopy}
          icon={copied ? Check : Copy}
        >
          {copied ? 'Copied' : 'Copy Text'}
        </Button>
      </div>

      <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800/80 max-h-96 overflow-y-auto text-xs text-slate-300 font-mono leading-relaxed whitespace-pre-wrap">
        {transcript.rawText}
      </div>
    </Card>
  );
};

export default TranscriptViewer;
