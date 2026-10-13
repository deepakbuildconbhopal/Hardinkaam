import React, { useState, useEffect } from 'react';
import { Clock, Play, CheckCircle2 } from 'lucide-react';

interface WorkServiceTimerProps {
  workStartedAt?: string;
  workCompletedAt?: string;
  workEndedAt?: string;
  status?: string;
  workDurationFormatted?: string;
  compact?: boolean;
  className?: string;
}

/**
 * Live Work Timer component
 * Calculates elapsed time from server-authoritative timestamp workStartedAt.
 * Service Professional cannot manually manipulate the start time.
 */
export const WorkServiceTimer: React.FC<WorkServiceTimerProps> = ({
  workStartedAt,
  workCompletedAt,
  workEndedAt,
  status,
  workDurationFormatted,
  compact = false,
  className = '',
}) => {
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  const completedTimestamp = workCompletedAt || workEndedAt;
  const isCompleted = status === 'completed' || !!completedTimestamp;
  const isStarted = !!workStartedAt && (status === 'in_progress' || status === 'work_started' || isCompleted);

  useEffect(() => {
    if (!workStartedAt) {
      setElapsedSeconds(0);
      return;
    }

    const startMs = new Date(workStartedAt).getTime();
    if (isNaN(startMs)) return;

    if (isCompleted && completedTimestamp) {
      const endMs = new Date(completedTimestamp).getTime();
      if (!isNaN(endMs)) {
        setElapsedSeconds(Math.max(0, Math.floor((endMs - startMs) / 1000)));
        return;
      }
    }

    // Live ticking timer
    const updateTimer = () => {
      const nowMs = Date.now();
      const diffSec = Math.max(0, Math.floor((nowMs - startMs) / 1000));
      setElapsedSeconds(diffSec);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [workStartedAt, completedTimestamp, isCompleted]);

  // Format into HH:MM:SS
  const formatTime = (totalSec: number) => {
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!isStarted) {
    return (
      <div
        id="work-timer-unstarted"
        className={`flex items-center space-x-2 text-xs font-medium text-slate-500 bg-slate-100 rounded-lg px-3 py-1.5 ${className}`}
      >
        <Clock className="w-3.5 h-3.5 text-slate-400" />
        <span>Timer starts upon Arrival OTP verification</span>
      </div>
    );
  }

  if (compact) {
    return (
      <div
        id="work-timer-compact"
        className={`inline-flex items-center space-x-2 px-2.5 py-1 rounded-md text-xs font-mono font-semibold ${
          isCompleted
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            : 'bg-amber-50 text-amber-900 border border-amber-200 animate-pulse'
        } ${className}`}
      >
        {isCompleted ? (
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
        ) : (
          <Play className="w-3 h-3 text-amber-600 fill-current" />
        )}
        <span>{formatTime(elapsedSeconds)}</span>
      </div>
    );
  }

  return (
    <div
      id="work-timer-card"
      className={`rounded-xl border p-4 transition-all ${
        isCompleted
          ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
          : 'bg-gradient-to-r from-amber-50 via-orange-50/50 to-amber-50 border-amber-200 text-amber-950 shadow-sm'
      } ${className}`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <div
            className={`w-2 h-2 rounded-full ${
              isCompleted ? 'bg-emerald-500' : 'bg-emerald-500 animate-ping'
            }`}
          />
          <span className="text-xs uppercase tracking-wider font-bold text-slate-600">
            {isCompleted ? 'Service Completed' : 'Service Started'}
          </span>
        </div>
        <span className="text-[11px] text-slate-500 font-medium">
          {isCompleted
            ? workDurationFormatted || 'Completed'
            : `Started: ${new Date(workStartedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
        </span>
      </div>

      <div className="flex items-baseline justify-between">
        <div className="flex items-center space-x-2">
          <Clock
            className={`w-6 h-6 ${isCompleted ? 'text-emerald-600' : 'text-amber-600 animate-spin-slow'}`}
          />
          <div className="font-mono text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            {formatTime(elapsedSeconds)}
          </div>
        </div>
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            isCompleted
              ? 'bg-emerald-100 text-emerald-800'
              : 'bg-amber-100 text-amber-800 font-semibold'
          }`}
        >
          {isCompleted ? 'Total Duration' : 'Live Work Time'}
        </span>
      </div>
    </div>
  );
};
