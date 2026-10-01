import React, { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';

export const EducationalSection: React.FC = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const faqs = [
    {
      q: 'How does Veloce measure internet speed?',
      a: 'Veloce tests real broadband speeds using direct socket streaming between your browser and Indian edge servers. It measures your true download throughput, upload throughput, ping latency, and jitter without artificial simulation.',
    },
    {
      q: 'What is the difference between Mbps and MB/s?',
      a: 'Network speeds are measured in Megabits per second (Mbps), while file sizes are in Megabytes (MB). There are 8 bits in 1 byte, so a 100 Mbps broadband connection can download files at up to 12.5 MB/s.',
    },
    {
      q: 'Why are Ping and Jitter important for gaming and calls?',
      a: 'Ping is the round-trip delay of data packets. Jitter measures ping stability. Low ping (under 30ms) and low jitter (under 5ms) prevent lag, stutter, and disconnections during Zoom meetings and online gaming.',
    },
  ];

  return (
    <section className="w-full mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
      <div className="flex items-center gap-2 mb-4">
        <HelpCircle className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
          Frequently Asked Questions
        </h2>
      </div>

      <div className="space-y-2.5">
        {faqs.map((faq, index) => {
          const isOpen = openFaq === index;
          return (
            <div
              key={index}
              className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900/40 overflow-hidden shadow-sm transition-colors"
            >
              <button
                onClick={() => setOpenFaq(isOpen ? null : index)}
                className="w-full px-4 py-3 text-left flex items-center justify-between gap-3 text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-200 hover:text-cyan-700 dark:hover:text-white transition-colors touch-manipulation"
                aria-expanded={isOpen}
              >
                <span>{faq.q}</span>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                    isOpen ? 'transform rotate-180 text-cyan-600 dark:text-cyan-400' : ''
                  }`}
                />
              </button>
              {isOpen && (
                <div className="px-4 pb-3.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-800/60 pt-2.5">
                  {faq.a}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};
