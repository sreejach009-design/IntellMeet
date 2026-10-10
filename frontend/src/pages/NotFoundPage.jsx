import React from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/common/Button';
import { Video, ArrowLeft } from 'lucide-react';

const NotFoundPage = () => {
  return (
    <div className="min-h-screen bg-[#0b0f19] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-3xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-6">
        <Video className="w-8 h-8" />
      </div>
      <h1 className="text-4xl font-extrabold text-white tracking-tight">404</h1>
      <h2 className="text-lg font-semibold text-slate-300 mt-2">Page Not Found</h2>
      <p className="text-xs text-slate-500 mt-1 max-w-sm">
        The link you followed may be broken or the meeting room may have concluded.
      </p>

      <Link to="/dashboard" className="mt-6">
        <Button variant="primary" size="sm" icon={ArrowLeft}>
          Back to Dashboard
        </Button>
      </Link>
    </div>
  );
};

export default NotFoundPage;
