import React, { useEffect, useState } from 'react';
import { getRules, createRule, deleteRule } from '../api';
import { Settings, Plus, Trash2 } from 'lucide-react';

const CATEGORIES = [
  "Food & Dining", "Shopping", "Travel", "Bills & Utilities", 
  "Salary & Income", "Investment", "Health", "Entertainment", "Other"
];

export function RulesEngine() {
  const [rules, setRules] = useState<any[]>([]);
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [isRecurring, setIsRecurring] = useState(false);

  const loadRules = async () => {
    try {
      const data = await getRules();
      setRules(data.rules);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadRules();
  }, []);

  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createRule(keyword, category, isRecurring);
      setKeyword('');
      setIsRecurring(false);
      loadRules();
    } catch (e: any) {
      alert("Failed to add rule: " + e.message);
    }
  };

  const handleDeleteRule = async (id: string) => {
    try {
      await deleteRule(id);
      loadRules();
    } catch (e: any) {
      alert("Failed to delete rule: " + e.message);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center gap-4">
        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
          <Settings className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Custom Category Rules</h2>
          <p className="text-sm text-gray-500">Define keywords to instantly categorize transactions and save AI tokens.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <form onSubmit={handleAddRule} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Keyword Match</label>
            <input required value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="e.g. Netflix" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Assign Category</label>
            <select value={category} onChange={e => setCategory(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white">
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="space-y-1 flex items-center h-10">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
              <input type="checkbox" checked={isRecurring} onChange={e => setIsRecurring(e.target.checked)} className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
              Is Recurring?
            </label>
          </div>
          <button type="submit" className="h-10 bg-blue-600 text-white rounded-lg flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors">
            <Plus className="w-4 h-4" /> Add Rule
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left text-sm text-gray-600">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-3 font-medium">Keyword</th>
              <th className="px-6 py-3 font-medium">Category</th>
              <th className="px-6 py-3 font-medium">Recurring</th>
              <th className="px-6 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rules.map(rule => (
              <tr key={rule.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-semibold text-gray-900">{rule.keyword}</td>
                <td className="px-6 py-4"><span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">{rule.category}</span></td>
                <td className="px-6 py-4">{rule.is_recurring ? 'Yes' : 'No'}</td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => handleDeleteRule(rule.id)} className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {rules.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-500">No custom rules defined yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
