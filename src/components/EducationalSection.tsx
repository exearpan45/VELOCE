import React, { useState } from 'react';
import { ChevronDown, HelpCircle, Lightbulb, Sliders, Zap } from 'lucide-react';

export const EducationalSection: React.FC = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const faqs = [
    {
      q: 'What is the difference between Megabits per second (Mbps) and Megabytes per second (MB/s)?',
      a: 'Network speeds in India and globally are advertised in Megabits per second (Mbps), whereas file sizes on disk are measured in Megabytes (MB). There are 8 bits in 1 byte. For example, on a 100 Mbps broadband connection (such as JioFiber, Airtel Xstream, or ACT Fibernet), your maximum theoretical file download rate is 12.5 Megabytes per second (100 ÷ 8 = 12.5 MB/s).',
    },
    {
      q: 'How does Veloce Speed Test perform genuine measurements?',
      a: 'Unlike simulated speed testers that merely run a timer or randomize numbers, Veloce initiates actual HTTP socket transfers with our high-throughput edge nodes. During the download phase, multiple megabytes of high-entropy binary chunks stream into your browser while tracking exact byte arrival timestamps via the High Resolution Time API. During upload, verified payload buffers are transmitted to calculate physical upstream throughput.',
    },
    {
      q: 'Why is Jitter just as important as Ping for gaming and calls?',
      a: 'Ping represents the round-trip latency of an individual packet, while Jitter measures the statistical variance between consecutive pings. A consistent 30ms ping is far superior to a ping fluctuating wildly between 15ms and 120ms. High jitter causes stuttering in Zoom or WhatsApp calls and rubber-banding during online competitive games (BGMI, Valorant, CS:GO).',
    },
    {
      q: 'Why can speed tests vary at different times of the day?',
      a: 'Broadband speeds can fluctuate due to neighborhood ISP congestion during peak evening hours, Wi-Fi channel interference, background updates on family devices, or local routing conditions.',
    },
    {
      q: 'What download and upload speed do I need in India for streaming or work?',
      a: 'For 4K Ultra HD streaming on Hotstar, Netflix, or Prime Video, 25 to 50 Mbps is ideal. For online work, Zoom calls, and cloud documents, 30 to 100 Mbps provides ample headroom for multiple family members simultaneously.',
    },
  ];

  return (
    <section className="w-full space-y-12 mt-12 text-slate-700 dark:text-slate-300">
      {/* Informational Core Pillars */}
      <div>
        <div className="border-b border-slate-200 dark:border-slate-800 pb-4 mb-8">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Understanding Your Broadband Connection
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            An engineering guide to network latency, jitter, throughput, and real-world connection health in India.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Download & Upload */}
          <article className="p-6 rounded-xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm">
            <div className="flex items-center gap-2 text-cyan-600 dark:text-cyan-400">
              <Zap className="w-5 h-5" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Download vs. Upload Speed</h3>
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-400 leading-relaxed">
              <strong>Download speed</strong> measures how rapidly data moves from remote servers down to your device. This dictates how quickly OTT video streams, web pages open, and file downloads complete.
            </p>
            <p className="text-xs text-slate-700 dark:text-slate-400 leading-relaxed">
              <strong>Upload speed</strong> determines how fast your device sends data outwards to the cloud. It affects video calls, WhatsApp backups, video conferencing, and transferring large files.
            </p>
          </article>

          {/* Card 2: Ping & Jitter */}
          <article className="p-6 rounded-xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm">
            <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400">
              <Sliders className="w-5 h-5" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Ping & Jitter Explained</h3>
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-400 leading-relaxed">
              <strong>Ping (Latency)</strong> is the round-trip transit time in milliseconds (ms). Under 25ms is elite, 25–60ms is good broadband, and over 100ms introduces visible delay.
            </p>
            <p className="text-xs text-slate-700 dark:text-slate-400 leading-relaxed">
              <strong>Jitter</strong> calculates packet delay variance (RFC 3550). When jitter is low, your connection is stable and voice/video packets arrive smoothly without stutter.
            </p>
          </article>
        </div>
      </div>

      {/* Practical Optimization Tips */}
      <div className="p-6 sm:p-8 rounded-2xl bg-slate-100 dark:bg-gradient-to-br dark:from-slate-900/90 dark:to-slate-950 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
        <div className="flex items-center gap-2.5 text-emerald-700 dark:text-emerald-400">
          <Lightbulb className="w-5 h-5" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">5 Practical Steps to Maximize Your Broadband Speed</h3>
        </div>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-700 dark:text-slate-400 mt-4">
          <li className="space-y-1">
            <strong className="text-slate-900 dark:text-slate-200 block text-sm">1. Use 5 GHz Wi-Fi instead of 2.4 GHz</strong>
            The standard 2.4 GHz band is crowded in Indian apartments. Connecting to 5 GHz usually doubles or triples your wireless speed.
          </li>
          <li className="space-y-1">
            <strong className="text-slate-900 dark:text-slate-200 block text-sm">2. Connect via Cat6 LAN Cable</strong>
            For competitive gaming or heavy uploads, an Ethernet cable bypasses all wireless wall interference and packet drops.
          </li>
          <li className="space-y-1">
            <strong className="text-slate-900 dark:text-slate-200 block text-sm">3. Pause Background Backups</strong>
            Cloud sync on phones and laptops (Google Photos, OneDrive, iCloud) can consume full upstream bandwidth without obvious notification.
          </li>
          <li className="space-y-1">
            <strong className="text-slate-900 dark:text-slate-200 block text-sm">4. Restart Your Fiber ONT / Router Monthly</strong>
            Optical Network Terminals and Wi-Fi routers benefit from a quick 30-second power cycle to clear cached routing tables.
          </li>
        </ul>
      </div>

      {/* FAQ Accordion Section */}
      <div>
        <div className="flex items-center gap-2 mb-6">
          <HelpCircle className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Frequently Asked Questions</h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, index) => {
            const isOpen = openFaq === index;
            return (
              <div
                key={index}
                className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900/40 overflow-hidden shadow-sm transition-colors"
              >
                <button
                  onClick={() => setOpenFaq(isOpen ? null : index)}
                  className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 text-sm font-bold text-slate-900 dark:text-slate-200 hover:text-cyan-700 dark:hover:text-white transition-colors"
                  aria-expanded={isOpen}
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-500 shrink-0 transition-transform duration-200 ${
                      isOpen ? 'transform rotate-180 text-cyan-600 dark:text-cyan-400' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-4 text-xs text-slate-700 dark:text-slate-400 leading-relaxed border-t border-slate-200 dark:border-slate-800/60 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
