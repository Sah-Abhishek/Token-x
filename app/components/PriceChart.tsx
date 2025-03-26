import React, { useEffect, useState } from "react";
import { FaChartLine } from "react-icons/fa6";
import { MdOutlineCandlestickChart } from "react-icons/md";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type TimeFilter = "1M" | "5M" | "15M" | "1H" | "4H" | "1D" | "1W";

interface ChartData {
  date: string;
  value: number;
  tooltipDate: string;
  tooltipValue: string;
}

const timeFilterToInterval: Record<TimeFilter, string> = {
  "1M": "1m",
  "5M": "5m",
  "15M": "15m",
  "1H": "1h",
  "4H": "4h",
  "1D": "1d",
  "1W": "1w",
};

//@ts-ignore
const PriceChart: React.FC = ({ selectedChart, setSelectedChart, handleChartSelection }) => {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("1D");
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchBitcoinData = async (filter: TimeFilter) => {
    setLoading(true);
    try {
      const interval = timeFilterToInterval[filter];
      const url = `https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=${interval}&limit=50`;

      const response = await fetch(url);
      const data = await response.json();

      const formattedData: ChartData[] = data.map((entry: any) => {
        const date = new Date(entry[0]);
        return {
          date: date.toISOString().slice(0, 10),
          value: parseFloat(entry[4]), // Closing price
          tooltipDate: date.toLocaleString(),
          tooltipValue: parseFloat(entry[4]).toFixed(2),
        };
      });

      setChartData(formattedData);
    } catch (error) {
      console.error("Error fetching Bitcoin data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBitcoinData(timeFilter);
  }, [timeFilter]);

  const handleTimeFilterChange = (filter: TimeFilter) => {
    setTimeFilter(filter);
  };

  const timeFilters: TimeFilter[] = ["1M", "5M", "15M", "1H", "4H", "1D", "1W"];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass p-4 rounded-lg shadow-sm border border-gray-100 animate-fade-in">
          <p className="text-sm text-gray-600">{payload[0].payload.tooltipDate}</p>
          <p className="text-green-600 font-medium">Value: ${payload[0].payload.tooltipValue}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full bg-white p-4 rounded-lg shadow-sm border border-gray-100 animate-fade-in">
      {/* Top Bar: Time Filters (Left) & Chart Selection Icons (Right) */}
      <div className="flex justify-between items-center mb-4">
        {/* Time Filters (Left-Aligned) */}
        <div className="flex space-x-2 overflow-x-auto pb-2">
          {timeFilters.map((filter) => (
            <button
              key={filter}
              onClick={() => handleTimeFilterChange(filter)}
              className={`px-3 py-1 text-xs rounded-md transition-all ${timeFilter === filter ? "bg-black text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
            >
              {filter}
            </button>
          ))}
        </div>

        {/* Chart Selection Icons (Right-Aligned) */}
        <div className="flex space-x-2">
          <button
            onClick={() => handleChartSelection("line")}
            className={`flex items-center gap-2 px-3 py-2 rounded-md transition-all ${selectedChart === "line" ? "bg-gray-900 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
          >
            <FaChartLine size={18} />
          </button>

          <button
            onClick={() => handleChartSelection("candlestick")}
            className={`flex items-center gap-2 px-3 py-2 rounded-md transition-all ${selectedChart === "candlestick" ? "bg-gray-900 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
          >
            <MdOutlineCandlestickChart size={18} />
          </button>
        </div>
      </div>

      {/* Chart */}
      <div className="h-80 w-full">
        {loading ? (
          <p className="text-center text-gray-500">Loading...</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
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
                tick={{ fontSize: 10, fill: "#94a3b8" }}
              />
              <YAxis
                domain={["dataMin - 500", "dataMax + 500"]}
                axisLine={false}
                tickLine={false}
                tickMargin={10}
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                width={50}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="value" stroke="#16a34a" strokeWidth={2} fillOpacity={1} fill="url(#colorValue)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default PriceChart;
