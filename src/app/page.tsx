'use client';

import { useState } from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';

export default function Home() {
  const [currentScreen, setCurrentScreen] = useState(0);
  const [activeTab, setActiveTab] = useState('matches');

  const screens = [
    // Screen 1: Home/Dashboard
    {
      name: 'Home',
      content: (
        <div className="min-h-screen bg-gradient-to-b from-green-50 to-white p-4">
          <div className="max-w-md mx-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-6 text-sm text-gray-500">
              <span>9:41</span>
              <span>Saturday, April 18</span>
              <span>5G</span>
            </div>

            {/* Pro Rating Card */}
            <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-3xl p-6 text-white mb-6">
              <div className="text-sm font-semibold mb-2">YOUR PRO RATING</div>
              <div className="text-6xl font-black mb-2">4.23</div>
              <div className="bg-green-500/40 inline-block px-4 py-1 rounded-full text-sm mb-4">
                ↑ 0.08 this week
              </div>
              <div className="text-sm">Top 18% of recreational players • 12-match streak</div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 border-b border-gray-200">
              {['MATCHES', 'WIN RATE', 'AVG RATING'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab.toLowerCase())}
                  className={`flex-1 py-3 text-xs font-semibold transition ${
                    activeTab === tab.toLowerCase()
                      ? 'text-green-700 border-b-2 border-green-700'
                      : 'text-gray-400'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Recent Matches */}
            <div className="mb-6">
              <h3 className="text-xs font-bold text-gray-500 mb-3 uppercase">Recent Matches</h3>
              <div className="space-y-2">
                {[
                  { opponent: 'vs Sarah & Mike • Thu', result: 'WIN', color: 'bg-green-100 text-green-700' },
                  { opponent: 'vs Dan & Priya • Tue', result: 'LOSS', color: 'bg-red-100 text-red-700' },
                  { opponent: 'vs Noah & Ella • Mon', result: 'WIN', color: 'bg-green-100 text-green-700' }
                ].map((match, i) => (
                  <div key={i} className="flex justify-between items-center bg-white p-3 rounded-lg border border-gray-200">
                    <span className="text-sm text-gray-600">{match.opponent}</span>
                    <span className={`${match.color} px-3 py-1 rounded-full text-xs font-bold`}>
                      {match.result}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Pro Style */}
            <div className="bg-amber-100 rounded-lg p-4 mb-6">
              <p className="text-xs font-bold text-amber-900">PRO STYLE MATCH • THIS MONTH</p>
            </div>

            {/* Record Button */}
            <button
              onClick={() => setCurrentScreen(1)}
              className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold py-3 rounded-lg transition"
            >
              Record a match →
            </button>
          </div>
        </div>
      )
    },

    // Screen 2: Recording
    {
      name: 'Recording',
      content: (
        <div className="min-h-screen bg-gray-900 text-white p-4">
          <div className="max-w-md mx-auto">
            {/* Recording indicator */}
            <div className="flex justify-between items-center mb-8">
              <div className="bg-red-600 rounded-full px-4 py-2 flex items-center gap-2 text-sm font-bold">
                <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                REC - 14:22
              </div>
              <div className="bg-black rounded-lg px-4 py-2">
                <div className="text-2xl font-black text-green-400">7 – 5</div>
                <div className="text-xs text-gray-400">• Your serve</div>
              </div>
            </div>

            {/* Court */}
            <div className="bg-green-700 rounded-lg p-8 mb-6 flex items-center justify-center aspect-video relative">
              <svg viewBox="0 0 400 600" className="w-full h-full">
                <line x1="0" y1="0" x2="400" y2="0" stroke="white" strokeWidth="2" />
                <line x1="0" y1="600" x2="400" y2="600" stroke="white" strokeWidth="2" />
                <line x1="0" y1="0" x2="0" y2="600" stroke="white" strokeWidth="2" />
                <line x1="400" y1="0" x2="400" y2="600" stroke="white" strokeWidth="2" />
                <line x1="0" y1="300" x2="400" y2="300" stroke="white" strokeWidth="2" strokeDasharray="5,5" />
                <rect x="50" y="100" width="300" height="80" fill="none" stroke="#22c55e" strokeWidth="3" />
                <rect x="50" y="420" width="300" height="80" fill="none" stroke="#22c55e" strokeWidth="3" />
                <circle cx="200" cy="300" r="6" fill="#f59e0b" />
              </svg>
            </div>

            {/* Audio callout */}
            <div className="bg-gray-800 rounded-full px-4 py-3 text-center text-sm mb-8">
              "7 serving 5, point over"
            </div>

            {/* Status */}
            <div className="text-xs text-gray-400 text-center mb-8">
              Court locked • 4 players tracked • Ball: 98%
            </div>

            {/* Navigation */}
            <div className="flex gap-3">
              <button
                onClick={() => setCurrentScreen(0)}
                className="flex-1 bg-gray-800 hover:bg-gray-700 py-3 rounded-lg font-bold transition"
              >
                ← Back
              </button>
              <button
                onClick={() => setCurrentScreen(2)}
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-black py-3 rounded-lg font-bold transition"
              >
                End match →
              </button>
            </div>
          </div>
        </div>
      )
    },

    // Screen 3: AI Analyzing
    {
      name: 'Analyzing',
      content: (
        <div className="min-h-screen bg-white p-4">
          <div className="max-w-md mx-auto flex flex-col items-center justify-center min-h-screen">
            {/* Progress Circle */}
            <div className="relative w-40 h-40 mb-12">
              <svg className="w-full h-full" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" stroke="#e5e7eb" strokeWidth="8" />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="#16a34a"
                  strokeWidth="8"
                  strokeDasharray="141 282"
                  transform="rotate(-90 50 50)"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-4xl font-black text-green-700">62%</span>
              </div>
            </div>

            {/* Description */}
            <p className="text-center text-gray-600 text-sm mb-8">
              Our AI is breaking down every rally and comparing your decisions to the pros.
            </p>

            {/* Checklist */}
            <div className="w-full space-y-3 mb-8">
              {[
                { text: 'Detected 23 rallies', done: true },
                { text: 'Classified 214 shots', done: true },
                { text: 'Comparing to pro benchmark', done: false, active: true },
                { text: 'Building highlight reel', done: false },
                { text: 'Finalizing rating', done: false }
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{
                    backgroundColor: item.done ? '#16a34a' : item.active ? '#f59e0b' : '#e5e7eb'
                  }}>
                    {item.done && <span className="text-white text-xs">✓</span>}
                    {item.active && <span className="text-white text-xs">●</span>}
                  </div>
                  <span className={`text-sm ${item.done ? 'text-gray-900 font-semibold' : 'text-gray-500'}`}>
                    {item.text}
                  </span>
                </div>
              ))}
            </div>

            {/* Navigation */}
            <div className="flex gap-3 w-full">
              <button
                onClick={() => setCurrentScreen(1)}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-black py-3 rounded-lg font-bold transition"
              >
                ← Back
              </button>
              <button
                onClick={() => setCurrentScreen(3)}
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-black py-3 rounded-lg font-bold transition"
              >
                Show my result →
              </button>
            </div>
          </div>
        </div>
      )
    },

    // Screen 4: Match Result
    {
      name: 'Result',
      content: (
        <div className="min-h-screen bg-gradient-to-b from-green-700 to-green-600 text-white p-4">
          <div className="max-w-md mx-auto">
            {/* Status bar */}
            <div className="text-center mb-8">
              <div className="bg-green-600/50 inline-block px-4 py-2 rounded-full text-sm font-bold mb-4">
                YOU WON
              </div>
              <div className="text-5xl font-black mb-2">11 – 7</div>
              <div className="text-sm opacity-90 mb-4">11 – 9</div>
              <div className="text-xs opacity-75">vs Sarah & Mike • 38 min • 23 rallies</div>
            </div>

            {/* Rating card */}
            <div className="bg-green-600/60 rounded-2xl p-6 mb-6 border border-green-500/30">
              <div className="text-sm font-semibold mb-2">Overall rating</div>
              <div className="text-5xl font-black mb-2">78<span className="text-2xl">/100</span></div>
              <div className="text-xs opacity-90">Your best match in 3 weeks. Strong dinks, shaky 3rd shots — see the breakdown.</div>
            </div>

            {/* Hero Rally */}
            <div className="mb-6">
              <h3 className="text-xs font-bold uppercase mb-3 opacity-75">Hero Rally</h3>
              <div className="bg-black rounded-lg aspect-video flex items-center justify-center relative overflow-hidden">
                <button className="w-16 h-16 bg-white/80 hover:bg-white rounded-full flex items-center justify-center transition">
                  <span className="text-green-700 text-2xl ml-1">▶</span>
                </button>
              </div>
              <div className="mt-3 text-sm">
                <span className="bg-green-600/70 inline-block px-3 py-1 rounded-full text-xs font-bold mr-2">⚡ 94th percentile</span>
                Game 2 - Rally 18 • 14 shots
              </div>
            </div>

            {/* Your Style Match */}
            <div className="mb-6">
              <h3 className="text-xs font-bold uppercase mb-3 opacity-75">Your Style Match</h3>
              <div className="bg-black/40 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center font-bold text-sm">T</div>
                  <div>
                    <div className="font-bold">Tyson McGuffin</div>
                    <div className="text-xs opacity-75">Aggressive baseliner • Big serve</div>
                  </div>
                </div>
                <div className="bg-orange-500 h-1 rounded-full" style={{ width: '73%' }}></div>
                <div className="text-xs mt-2">73% style similarity</div>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex gap-3">
              <button
                onClick={() => setCurrentScreen(2)}
                className="flex-1 bg-black/40 hover:bg-black/50 py-3 rounded-lg font-bold transition"
              >
                ← Back
              </button>
              <button
                onClick={() => setCurrentScreen(4)}
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-black py-3 rounded-lg font-bold transition"
              >
                Shot-by-shot breakdown →
              </button>
            </div>
          </div>
        </div>
      )
    },

    // Screen 5: Rally Breakdown
    {
      name: 'Breakdown',
      content: (
        <div className="min-h-screen bg-white p-4">
          <div className="max-w-md mx-auto">
            <div className="mb-6">
              <h2 className="text-lg font-bold mb-2">Rally Breakdown</h2>
              <p className="text-xs text-gray-600 mb-4">23 rallies • tap any rally to review</p>

              {/* Filter tabs */}
              <div className="flex gap-2 mb-6 overflow-x-auto">
                {['All (23)', 'Wins (14)', 'Errors (9)', '3rd shots'].map(filter => (
                  <button
                    key={filter}
                    className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition ${
                      filter === 'All (23)'
                        ? 'bg-green-700 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>

              {/* Rally items */}
              <div className="space-y-3">
                {[
                  { id: 'R18', title: 'Dink battle — cross-court winner', score: '4.8', icon: '★' },
                  { id: 'R12', title: 'You drove, pros drop 78% of the time', score: '2.1', icon: '!' },
                  { id: 'R9', title: 'Deep return, ATP winner', score: '4.2', icon: '★' },
                  { id: 'R7', title: 'Net contact from the left side', score: '3.0', icon: '~' },
                  { id: 'R4', title: 'Soft hands save the point', score: '4.5', icon: '★' }
                ].map(rally => (
                  <div key={rally.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 cursor-pointer transition">
                    <div className="flex items-start gap-3">
                      <div className="bg-green-700 text-white font-bold px-3 py-2 rounded text-sm h-fit">
                        {rally.id}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-700">{rally.title}</p>
                      </div>
                      <div className={`font-bold text-sm ${rally.score === '2.1' ? 'text-red-500' : 'text-green-600'}`}>
                        {rally.icon} {rally.score}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Navigation */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setCurrentScreen(3)}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-black py-3 rounded-lg font-bold transition"
              >
                ← Back
              </button>
              <button
                onClick={() => setCurrentScreen(5)}
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-black py-3 rounded-lg font-bold transition"
              >
                Open a coaching card →
              </button>
            </div>
          </div>
        </div>
      )
    },

    // Screen 6: Coaching Card
    {
      name: 'Coaching',
      content: (
        <div className="min-h-screen bg-white p-4">
          <div className="max-w-md mx-auto">
            <h2 className="text-sm font-bold text-gray-500 mb-4">Rally 12 - 3rd Shot</h2>
            <p className="text-xs text-gray-600 mb-4">Game 2 • 5-4 • your serve</p>

            {/* Court comparison */}
            <div className="bg-gray-900 rounded-lg p-4 mb-4 aspect-video flex items-center justify-center relative overflow-hidden">
              <svg viewBox="0 0 400 300" className="w-full h-full">
                <rect x="20" y="20" width="360" height="260" fill="#1a5f3a" stroke="white" strokeWidth="2" />
                <line x1="20" y1="150" x2="380" y2="150" stroke="white" strokeWidth="1" strokeDasharray="3,3" />

                {/* Ball and players */}
                <circle cx="200" cy="150" r="4" fill="#f59e0b" />
                <circle cx="100" cy="120" r="5" fill="#4b5563" opacity="0.6" />
                <circle cx="300" cy="130" r="5" fill="#4b5563" opacity="0.6" />

                {/* Shot paths */}
                <path d="M 150 200 Q 175 150 200 150" stroke="#ef4444" strokeWidth="2" fill="none" strokeDasharray="3,3" />
                <path d="M 150 200 Q 175 150 220 130" stroke="#22c55e" strokeWidth="2" fill="none" />
              </svg>
            </div>

            <div className="text-white text-sm font-bold absolute top-12 left-6 bg-black/60 px-3 py-1 rounded">
              Your shot (red) - Pro choice (green)
            </div>

            {/* Analysis */}
            <div className="bg-white rounded-lg p-4 mb-4 border border-gray-200">
              <div className="bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded inline-block mb-3">
                ! 2.1 Risky
              </div>
              <p className="text-xs text-gray-600 mb-3">
                You drove a 3rd shot from the transition zone on a ball at shoulder height. Hard shots from this position rarely produce a winner and often leave you out of position.
              </p>
              <p className="text-xs text-gray-600">
                Pros drop this shot 78% of the time • your drive success rate this match: 22%
              </p>
            </div>

            {/* Pro comparison */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <h4 className="font-bold text-sm text-amber-900 mb-3">⚡ SEE WHAT A PRO WOULD DO</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded p-3 text-center">
                  <div className="text-red-700 font-bold text-sm mb-2">YOU CHOSE</div>
                  <div className="bg-green-700 rounded h-16 flex items-center justify-center relative">
                    <div className="text-red-500 text-lg">→</div>
                  </div>
                </div>
                <div className="bg-white rounded p-3 text-center">
                  <div className="text-green-700 font-bold text-sm mb-2">PRO CHOICE</div>
                  <div className="bg-green-700 rounded h-16 flex items-center justify-center relative">
                    <div className="text-green-500 text-lg">↓</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex gap-3">
              <button
                onClick={() => setCurrentScreen(4)}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-black py-3 rounded-lg font-bold transition"
              >
                ← Back
              </button>
              <button
                onClick={() => setCurrentScreen(6)}
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-black py-3 rounded-lg font-bold transition"
              >
                See share card →
              </button>
            </div>
          </div>
        </div>
      )
    },

    // Screen 7: Share Card
    {
      name: 'Share',
      content: (
        <div className="min-h-screen bg-gray-50 p-4">
          <div className="max-w-md mx-auto">
            <p className="text-sm text-gray-600 text-center mb-6">Ready to post to Instagram, TikTok, or send in texts</p>

            {/* Share card */}
            <div className="bg-gradient-to-br from-green-700 to-yellow-600 rounded-2xl p-6 text-white mb-6">
              <div className="text-xs font-bold opacity-75 mb-2">PICKLEBALL PRO • APRIL 2026</div>
              <h3 className="text-2xl font-black mb-4">
                I play like<br />
                <span className="text-amber-400">Tyson McGuffin</span>
              </h3>

              <div className="space-y-2 text-sm mb-6 border-t border-white/20 pt-4">
                <div className="flex justify-between">
                  <span className="opacity-90">73% style similarity. Same aggression, bigger serve — but I dink 40% more patiently.</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Rating</span>
                  <span className="font-bold">4.23</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Win streak</span>
                  <span className="font-bold">12 matches</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Signature shot</span>
                  <span className="font-bold">Cross-court dink</span>
                </div>
              </div>

              <div className="text-right text-xs opacity-75 border-t border-white/20 pt-4">
                PICKLEBALL PRO
              </div>
            </div>

            {/* Social icons */}
            <div className="flex justify-center gap-4 mb-6">
              {[1, 2, 3, 4, 5].map(i => (
                <button
                  key={i}
                  className="w-12 h-12 bg-white rounded-lg border border-gray-300 hover:border-gray-400 transition flex items-center justify-center text-gray-400"
                >
                  {i === 3 && '↗'}
                </button>
              ))}
            </div>

            <p className="text-xs text-center text-gray-600 mb-6">
              Pro tier removes the watermark and unlocks 4:5 and 9:16 formats.
            </p>

            {/* Navigation */}
            <div className="flex gap-3">
              <button
                onClick={() => setCurrentScreen(5)}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-black py-3 rounded-lg font-bold transition"
              >
                ← Back
              </button>
              <button
                onClick={() => setCurrentScreen(7)}
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-black py-3 rounded-lg font-bold transition"
              >
                See progress stats →
              </button>
            </div>
          </div>
        </div>
      )
    },

    // Screen 8: Stats & Progress
    {
      name: 'Stats',
      content: (
        <div className="min-h-screen bg-white p-4">
          <div className="max-w-md mx-auto">
            <h2 className="text-lg font-bold mb-6">Stats & Progress</h2>

            {/* Chart placeholder */}
            <div className="bg-gradient-to-br from-green-700 to-green-900 rounded-lg p-8 mb-6 text-white text-center">
              <div className="text-sm opacity-75 mb-2">Rating Trend</div>
              <div className="text-4xl font-black">4.23</div>
              <div className="text-xs opacity-75 mt-2">+0.18 this month</div>
            </div>

            {/* Stats */}
            <div className="space-y-4 mb-8">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-xs font-bold text-gray-500 mb-2">SHOT MIX</div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span>Dinks</span>
                    <div className="flex-1 mx-3 bg-gray-300 h-2 rounded-full overflow-hidden">
                      <div className="bg-green-600 h-full" style={{ width: '62%' }}></div>
                    </div>
                    <span className="font-bold">62%</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span>Drives</span>
                    <div className="flex-1 mx-3 bg-gray-300 h-2 rounded-full overflow-hidden">
                      <div className="bg-amber-500 h-full" style={{ width: '28%' }}></div>
                    </div>
                    <span className="font-bold">28%</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span>Volleys</span>
                    <div className="flex-1 mx-3 bg-gray-300 h-2 rounded-full overflow-hidden">
                      <div className="bg-blue-600 h-full" style={{ width: '10%' }}></div>
                    </div>
                    <span className="font-bold">10%</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-xs font-bold text-gray-500 mb-3">TOP LEAKS</div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-red-600 font-semibold">3rd shot drops</span>
                    <span className="text-gray-600">22% success</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-red-600 font-semibold">Cross-court drives</span>
                    <span className="text-gray-600">35% unforced errors</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex gap-3">
              <button
                onClick={() => setCurrentScreen(6)}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-black py-3 rounded-lg font-bold transition"
              >
                ← Back
              </button>
              <button
                onClick={() => setCurrentScreen(0)}
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-black py-3 rounded-lg font-bold transition"
              >
                Back to Home
              </button>
            </div>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="bg-white">
      {screens[currentScreen].content}
    </div>
  );
}
