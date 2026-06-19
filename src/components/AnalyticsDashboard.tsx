'use client';

import React from 'react';

interface AnalyticMetric {
  category: string;
  metric: string;
  value: string | number;
  unit: string;
  description: string;
  color: string;
}

interface AnalyticsCategoryData {
  category: string;
  metrics: AnalyticMetric[];
}

interface AnalyticsDashboardProps {
  kitchenEfficiency?: number;
  thirdShotSuccess?: number;
  returnDepth?: number;
  deadDinks?: number;
  unforceErrors?: number;
  heatmapZones?: string;
  zones?: {
    'P1-Front-Left': number;
    'P2-Front-Right': number;
    'P3-Back-Left': number;
    'P4-Back-Right': number;
  };
  speedUpEfficiency?: number;
  forcedErrors?: number;
  resetSuccess?: number;
  popUpFrequency?: number;
  isLoading?: boolean;
}

export default function AnalyticsDashboard({
  kitchenEfficiency = 0,
  thirdShotSuccess = 0,
  returnDepth = 0,
  deadDinks = 0,
  unforceErrors = 0,
  heatmapZones = '—',
  zones,
  speedUpEfficiency = 0,
  forcedErrors = 0,
  resetSuccess = 0,
  popUpFrequency = 0,
  isLoading = false
}: AnalyticsDashboardProps) {

  // Dynamically update analytics data with real values
  const analyticsData: AnalyticsCategoryData[] = [
    {
      category: 'Kitchen Transition',
      metrics: [
        {
          category: 'Kitchen Transition',
          metric: '3rd Shot Success Rate',
          value: thirdShotSuccess,
          unit: '%',
          description: 'Tracks the percentage of 3rd shot drops/drives that successfully land in the NVZ or force a weak return, allowing the serving team to establish position at the kitchen line.',
          color: 'from-blue-500 to-blue-600'
        },
        {
          category: 'Kitchen Transition',
          metric: 'Return Contact Depth',
          value: returnDepth,
          unit: 'ft',
          description: 'Telemetry overlay tracking how many feet behind the baseline the opponent is forced to hit their 3rd shot.',
          color: 'from-blue-400 to-blue-500'
        }
      ]
    },
    {
      category: 'The Soft Game (NVZ)',
      metrics: [
        {
          category: 'The Soft Game (NVZ)',
          metric: 'Unattackable "Dead" Dinks',
          value: deadDinks,
          unit: 'count',
          description: 'Count of dink trajectories where the apex of the bounce stays below net height, making a speed-up mathematically impossible.',
          color: 'from-green-500 to-green-600'
        },
        {
          category: 'The Soft Game (NVZ)',
          metric: 'Unforced Errors (UFE)',
          value: unforceErrors,
          unit: 'count',
          description: 'Missing an unpressured, neutral dink into the net or wide out of bounds.',
          color: 'from-red-500 to-red-600'
        }
      ]
    },
    {
      category: 'Shot Placement',
      metrics: [
        {
          category: 'Shot Placement',
          metric: 'Heatmap Target Zones',
          value: heatmapZones,
          unit: 'visual',
          description: 'Mapping ball contact points in the opponent\'s court (e.g., targeting weak side vs. driving hard at chest).',
          color: 'from-purple-500 to-purple-600'
        }
      ]
    },
    {
      category: 'The Hard Game',
      metrics: [
        {
          category: 'The Hard Game',
          metric: 'Speed-Up Efficiency (SUE)',
          value: speedUpEfficiency,
          unit: '%',
          description: 'Ratio of times a player initiates a fast pace and wins the point vs. times they initiate and get countered/punished.',
          color: 'from-yellow-500 to-yellow-600'
        },
        {
          category: 'The Hard Game',
          metric: 'Forced Errors Caused (FEC)',
          value: forcedErrors,
          unit: 'count',
          description: 'Shots hit with such extreme pace, spin, or severe angle that the opponent touches the ball but cannot physically control it.',
          color: 'from-orange-500 to-orange-600'
        }
      ]
    },
    {
      category: 'Net Defense',
      metrics: [
        {
          category: 'Net Defense',
          metric: 'Reset Success %',
          value: resetSuccess,
          unit: '%',
          description: 'Taking a high-velocity drive mid-court and absorbing the energy to drop it softly back into the kitchen.',
          color: 'from-cyan-500 to-cyan-600'
        },
        {
          category: 'Net Defense',
          metric: 'Pop-Up Frequency',
          value: popUpFrequency,
          unit: '%',
          description: 'Tracking how often a defensive block or neutral dink rises above the net, inviting an attack.',
          color: 'from-red-400 to-red-500'
        }
      ]
    }
  ];

  return (
    <div className="w-full space-y-6">
      {/* Shot Success Breakdown - From Video Analysis */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg border border-emerald-300 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-emerald-900">SHOT SUCCESS BREAKDOWN</h3>
          <span className="text-xs bg-emerald-200 text-emerald-800 px-2 py-1 rounded">From Video Analysis</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-white rounded-lg p-4 border border-emerald-200">
            <div className="text-sm text-gray-600 mb-2">Serve Success</div>
            <div className="text-3xl font-bold text-emerald-600">90%</div>
            <div className="text-xs text-gray-500 mt-1">30–35 mph</div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-emerald-200">
            <div className="text-sm text-gray-600 mb-2">Return Success</div>
            <div className="text-3xl font-bold text-teal-600">65–70%</div>
            <div className="text-xs text-gray-500 mt-1">High-error zone</div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-emerald-200">
            <div className="text-sm text-gray-600 mb-2">Dink Success</div>
            <div className="text-3xl font-bold text-green-600">75%</div>
            <div className="text-xs text-gray-500 mt-1">Kitchen dominance</div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-emerald-200">
            <div className="text-sm text-gray-600 mb-2">3rd Shot Drop</div>
            <div className="text-3xl font-bold text-yellow-600">40–45%</div>
            <div className="text-xs text-gray-500 mt-1">Often pops up</div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 border-l-4 border-l-emerald-500">
          <p className="text-sm text-gray-700">
            <strong>Ball Speed Estimates:</strong> Fastest drives reach 45–50 mph during mid-court exchanges. Serves are delivered at conservative pace with high net clearance, prioritizing depth over velocity.
          </p>
          <p className="text-xs text-gray-500 mt-3">
            ℹ️ <em>3D trajectory visualization is in development. These metrics are from AI-powered video analysis.</em>
          </p>
        </div>
      </div>

      {/* Main Analytics Grid */}
      <div className="space-y-6">
        {analyticsData.map((section, idx) => (
          <div key={idx} className="space-y-3">
            {/* Category Header */}
            <div className="px-1 py-2 border-b-2 border-gray-200">
              <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">
                {section.category}
              </h3>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {section.metrics.map((metricData, mIdx) => (
                <div
                  key={mIdx}
                  className="rounded-lg border border-gray-200 bg-gradient-to-br from-gray-50 to-gray-100 p-4 hover:shadow-md transition-shadow"
                >
                  {/* Metric Name */}
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="text-sm font-semibold text-gray-800 flex-1">
                      {metricData.metric}
                    </h4>
                  </div>

                  {/* Value Display */}
                  <div className="mb-4">
                    <div className={`inline-block bg-gradient-to-r ${metricData.color} rounded-lg px-4 py-2`}>
                      <div className="text-white text-center">
                        <div className="text-2xl font-bold">{metricData.value}</div>
                        <div className="text-xs opacity-90">{metricData.unit}</div>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-gray-600 leading-relaxed">
                    {metricData.description}
                  </p>

                  {/* Status Indicator */}
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="text-xs text-gray-500">
                      Status: <span className="text-gray-400">No data</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Quick Stats Summary */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-4">
        <h4 className="text-sm font-bold text-blue-900 mb-3">ANALYTICS SUMMARY</h4>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-white rounded p-2">
            <div className="text-xs text-gray-500">Kitchen Efficiency</div>
            <div className="text-lg font-bold text-blue-600">{isLoading ? '...' : `${kitchenEfficiency}%`}</div>
          </div>
          <div className="bg-white rounded p-2">
            <div className="text-xs text-gray-500">Soft Game Quality</div>
            <div className="text-lg font-bold text-green-600">{isLoading ? '...' : deadDinks}</div>
          </div>
          <div className="bg-white rounded p-2">
            <div className="text-xs text-gray-500">Hard Game Efficiency</div>
            <div className="text-lg font-bold text-yellow-600">{isLoading ? '...' : `${speedUpEfficiency}%`}</div>
          </div>
          <div className="bg-white rounded p-2">
            <div className="text-xs text-gray-500">Defense Rating</div>
            <div className="text-lg font-bold text-cyan-600">{isLoading ? '...' : `${resetSuccess}%`}</div>
          </div>
          <div className="bg-white rounded p-2">
            <div className="text-xs text-gray-500">Overall Score</div>
            <div className="text-lg font-bold text-indigo-600">{isLoading ? '...' : Math.round((kitchenEfficiency + speedUpEfficiency + resetSuccess) / 3)}%</div>
          </div>
        </div>
      </div>
    </div>
  );
}
