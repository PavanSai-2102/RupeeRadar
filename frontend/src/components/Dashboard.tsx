import React, { useEffect, useState } from 'react';
import { getSessionAnalytics, getSessionInsights, getSessionTransactions, getGlobalAnalytics } from '../api';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Wallet, TrendingDown, TrendingUp, Sparkles, RefreshCcw, Download } from 'lucide-react';
import { TransactionTable } from './TransactionTable';
import { getCategoryColor } from '../utils/colors';

interface DashboardProps {
  sessionId: string;
  onReset: () => void;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

export function Dashboard({ sessionId, onReset }: DashboardProps) {
  const [analytics, setAnalytics] = useState<any>(null);
  const [insights, setInsights] = useState<string[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [globalTrends, setGlobalTrends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [analyticsData, insightsData, txData, globalData] = await Promise.all([
        getSessionAnalytics(sessionId),
        getSessionInsights(sessionId),
        getSessionTransactions(sessionId),
        getGlobalAnalytics()
      ]);
      setAnalytics(analyticsData);
      setInsights(insightsData.insights);
      setTransactions(txData.transactions);
      setGlobalTrends(globalData.monthly_trends);
    } catch (e) {
      console.error("Failed to load dashboard data", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="w-full flex items-center justify-center p-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600"></div>
      </div>
    );
  }

  // Format chart data
  const chartData = Object.entries(analytics.spend_by_category || {})
    .map(([name, value]) => ({ name, value }))
    .sort((a: any, b: any) => b.value - a.value);

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center print:hidden">
        <h2 className="text-2xl font-bold text-gray-800">Financial Dashboard</h2>
        <div className="flex gap-2">
          <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 bg-white border rounded-lg hover:bg-gray-50 transition-colors">
            <Download className="w-4 h-4" /> Download PDF
          </button>
          <button onClick={onReset} className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 transition-colors">
            <RefreshCcw className="w-4 h-4" /> Upload New
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="p-3 bg-green-50 text-green-600 rounded-lg">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Total Income</p>
            <p className="text-2xl font-bold text-gray-900">₹{analytics.total_income.toLocaleString('en-IN')}</p>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="p-3 bg-red-50 text-red-600 rounded-lg">
            <TrendingDown className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Total Spend</p>
            <p className="text-2xl font-bold text-gray-900">₹{analytics.total_spend.toLocaleString('en-IN')}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Net Savings</p>
            <p className="text-2xl font-bold text-gray-900">₹{analytics.net_savings.toLocaleString('en-IN')}</p>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Insights Panel */}
        <div className="lg:col-span-2 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl shadow-md p-8 text-white relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity duration-700">
            <Sparkles className="w-32 h-32" />
          </div>
          <h3 className="text-xl font-semibold mb-6 flex items-center gap-2 relative z-10">
            <Sparkles className="w-5 h-5 text-yellow-300" /> AI Financial Insights
          </h3>
          <div className="space-y-4 relative z-10">
            {insights.map((insight, idx) => (
              <div key={idx} className="bg-white/10 backdrop-blur-md rounded-lg p-5 border border-white/20 hover:bg-white/20 transition-colors">
                <p className="text-blue-50 text-lg leading-relaxed">{insight}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Chart Panel */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col hover:shadow-md transition-shadow">
          <h3 className="text-lg font-semibold text-gray-800 mb-6">Spend by Category</h3>
          {chartData.length > 0 ? (
            <div className="flex-grow min-h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getCategoryColor(entry.name).fill} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    formatter={(val: number) => `₹${val.toLocaleString('en-IN')}`}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex-grow flex items-center justify-center text-gray-400">
              No spending data available.
            </div>
          )}
        </div>

        {/* Month-over-Month Chart */}
        <div className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col hover:shadow-md transition-shadow">
          <h3 className="text-lg font-semibold text-gray-800 mb-6">Historical Trends (Month-over-Month)</h3>
          {globalTrends.length > 0 ? (
            <div className="w-full h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={globalTrends} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="month" stroke="#9CA3AF" tick={{fill: '#6B7280'}} />
                  <YAxis stroke="#9CA3AF" tick={{fill: '#6B7280'}} tickFormatter={(val) => `₹${(val/1000).toFixed(0)}k`} />
                  <RechartsTooltip 
                    formatter={(val: number) => `₹${val.toLocaleString('en-IN')}`}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="income" name="Income" stroke="#10B981" strokeWidth={3} activeDot={{ r: 8 }} />
                  <Line type="monotone" dataKey="spend" name="Spend" stroke="#EF4444" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">
              Upload more statements to see historical trends.
            </div>
          )}
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50">
          <h3 className="text-lg font-semibold text-gray-800">Recent Transactions</h3>
        </div>
        <TransactionTable transactions={transactions} onCategoryChanged={loadData} />
      </div>
    </div>
  );
}
