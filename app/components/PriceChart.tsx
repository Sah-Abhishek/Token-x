import React, { useState } from 'react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

// Mock data for the chart
const generateMockData = (days: number) => {
  const data = [];
  const now = new Date();
  let baseValue = 85000;

  for (let i = days; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    // Create some random fluctuation
    const randomChange = (Math.random() - 0.5) * 5000;
    baseValue = baseValue + randomChange;

    data.push({
      date: date.toISOString().slice(0, 10),
      value: Math.max(baseValue, 70000), // Ensure we don't go below 70000
      tooltipDate: `Mar ${date.getDate()}, ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')} AM`,
      tooltipValue: baseValue.toFixed(2),
    });
  }

  return data;
};

type TimeFilter = '1M' | '5M' | '15M' | '1H' | '4H' | '1D' | '1W';

const PriceChart: React.FC = () => {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('1D');
  const [chartData, setChartData] = useState(generateMockData(30));
  const [tooltipData, setTooltipData] = useState<{ date: string; value: string } | null>(null);

  const handleTimeFilterChange = (filter: TimeFilter) => {
    setTimeFilter(filter);

    // Generate different data based on the filter
    let days = 30;
    switch (filter) {
      case '1M': days = 1; break;
      case '5M': days = 2; break;
      case '15M': days = 5; break;
      case '1H': days = 7; break;
      case '4H': days = 14; break;
      case '1D': days = 30; break;
      case '1W': days = 90; break;
    }

    setChartData(generateMockData(days));
  };

  const timeFilters: TimeFilter[] = ['1M', '5M', '15M', '1H', '4H', '1D', '1W'];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass p-4 rounded-lg shadow-sm border border-gray-100 animate-fade-in">
          <p className="text-sm text-gray-600">{payload[0].payload.tooltipDate}</p>
          <p className="text-green-600 font-medium">value: ${payload[0].payload.tooltipValue}</p>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="w-full bg-white p-4 rounded-lg shadow-sm border border-gray-100 animate-fade-in">
      <div className="flex space-x-2 mb-6 overflow-x-auto pb-2">
        {timeFilters.map((filter) => (
          <button
            key={filter}
            onClick={() => handleTimeFilterChange(filter)}
            className={`px-3 py-1 text-xs rounded-md transition-all ${timeFilter === filter
                ? 'bg-black text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
          >
            {filter}
          </button>
        ))}

        <div className="ml-auto flex space-x-2">
          <button className="p-1 text-gray-500 hover:text-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3v18h18" />
              <path d="M18.4 9.4a7.72 7.72 0 0 0-4.8-5.2A7.65 7.65 0 0 0 6 7.8a7.12 7.12 0 0 0-.8 5.6" />
              <path d="m2 2 20 20" />
              <path d="M20 16a7.89 7.89 0 0 1-4 4" />
            </svg>
          </button>
          <button className="p-1 text-gray-500 hover:text-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
              <line x1="3" x2="21" y1="9" y2="9" />
              <line x1="9" x2="9" y1="21" y2="9" />
            </svg>
          </button>
          <button className="p-1 text-gray-500 hover:text-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
              <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
              <path d="M16 16h5v5" />
            </svg>
          </button>
        </div>
      </div>

      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
          >
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#16a34a" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tickMargin={10}
              tick={{ fontSize: 10, fill: '#94a3b8' }}
            />
            <YAxis
              domain={['dataMin - 5000', 'dataMax + 5000']}
              axisLine={false}
              tickLine={false}
              tickMargin={10}
              tick={{ fontSize: 10, fill: '#94a3b8' }}
              width={50}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#16a34a"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorValue)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default PriceChart;
