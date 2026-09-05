import React from 'react';
import { SimulationFeedResponse } from '../types';

interface AttentionFunnelProps {
  data: SimulationFeedResponse;
}

/** Shows the 4-step filter pipeline that explains what Meanwhile did with all movements. */
export const AttentionFunnel: React.FC<AttentionFunnelProps> = ({ data }) => {
  const total = data.summary.total_watched;
  const surfaced = data.top_events.length;
  const noisyButWatched = data.other_events.length;
  const notShown = total - surfaced - noisyButWatched;

  const highScore = data.top_events.filter(e => e.score > 80).length;
  const midScore  = data.top_events.filter(e => e.score > 60 && e.score <= 80).length;
  const lowScore  = data.top_events.filter(e => e.score <= 60).length;

  const steps = [
    {
      value: total,
      label: 'Stocks monitored',
      sub: 'Total watchlist',
      color: 'text-[#16324A]',
      bg: 'bg-[#F8FAFB]',
      border: 'border-[#EEF2F7]',
    },
    {
      value: total,
      label: 'Price movements detected',
      sub: 'All changed vs baseline',
      color: 'text-[#637789]',
      bg: 'bg-[#F8FAFB]',
      border: 'border-[#EEF2F7]',
    },
    {
      value: surfaced + noisyButWatched,
      label: 'With unusual signals',
      sub: `${noisyButWatched} below budget threshold`,
      color: 'text-[#B7791F]',
      bg: 'bg-[#FEFAEC]',
      border: 'border-[#FBEAC9]',
    },
    {
      value: surfaced,
      label: 'Deserve your attention',
      sub: data.summary.high_attention_count > 0
        ? `${data.summary.high_attention_count} high · ${data.summary.meaningful_count + data.summary.watch_count} watch`
        : 'No stock-specific signals this session',
      color: surfaced > 0 ? 'text-[#D64545]' : 'text-[#168A5B]',
      bg: surfaced > 0 ? 'bg-[#FDF2F2]' : 'bg-[#F0FAF5]',
      border: surfaced > 0 ? 'border-[#F8D7D7]' : 'border-[#C6EAD8]',
    },
  ];

  return (
    <div className="bg-white border border-[#EEF2F7] rounded-xl p-4 sm:p-5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-[#8BAFC7] mb-4">
        How Meanwhile filtered this session
      </p>

      <div className="flex flex-col sm:flex-row sm:items-stretch gap-0">
        {steps.map((step, i) => (
          <React.Fragment key={step.label}>
            <div className={`flex-1 rounded-xl border px-3 py-3 text-center ${step.bg} ${step.border}`}>
              <p className={`text-2xl font-bold ${step.color}`}>{step.value}</p>
              <p className="text-xs font-semibold text-[#16324A] mt-0.5 leading-tight">{step.label}</p>
              <p className="text-[10px] text-[#8BAFC7] mt-0.5 leading-tight">{step.sub}</p>
            </div>
            {i < steps.length - 1 && (
              <div className="flex items-center justify-center py-1 sm:py-0 sm:px-1.5">
                <span className="text-[#8BAFC7] text-base font-light rotate-90 sm:rotate-0">→</span>
              </div>
            )}
          </React.Fragment>
        ))}
      </div>

      <p className="text-xs text-[#8BAFC7] mt-3 text-center">
        Meanwhile separates market movement from meaningful movement
      </p>
    </div>
  );
};
