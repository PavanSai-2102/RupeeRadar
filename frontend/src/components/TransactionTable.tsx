import React, { useState } from 'react';
import { ArrowUpRight, ArrowDownRight, Repeat, Edit2 } from 'lucide-react';
import { updateTransactionCategory } from '../api';
import { getCategoryColor } from '../utils/colors';

interface TransactionTableProps {
  transactions: any[];
  onCategoryChanged: () => void;
}

const CATEGORIES = [
  "Food & Dining", "Shopping", "Travel", "Bills & Utilities", 
  "Salary & Income", "Investment", "Health", "Entertainment", "Other"
];

export function TransactionTable({ transactions, onCategoryChanged }: TransactionTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleCategoryChange = async (txnId: string, newCategory: string) => {
    try {
      await updateTransactionCategory(txnId, newCategory);
      setEditingId(null);
      onCategoryChanged(); // trigger a re-fetch of data
    } catch (e) {
      console.error("Failed to update category", e);
    }
  };

  if (!transactions.length) return <div className="p-8 text-center text-gray-500">No transactions found.</div>;

  return (
    <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
      <table className="w-full text-left text-sm text-gray-600">
        <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100 sticky top-0 z-10">
          <tr>
            <th className="px-6 py-4 font-medium tracking-wider">Date</th>
            <th className="px-6 py-4 font-medium tracking-wider">Description</th>
            <th className="px-6 py-4 font-medium tracking-wider">Category</th>
            <th className="px-6 py-4 font-medium tracking-wider text-right">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {transactions.map((txn) => (
            <tr key={txn.id} className="hover:bg-blue-50/50 transition-colors group">
              <td className="px-6 py-4 whitespace-nowrap text-gray-600">{txn.date}</td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">{txn.clean_description || txn.raw_description}</span>
                  {txn.is_recurring && (
                    <span title="Recurring Payment" className="p-1 bg-purple-100 text-purple-700 rounded-md">
                      <Repeat className="w-3 h-3" />
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-400 mt-1 truncate max-w-sm" title={txn.raw_description}>
                  {txn.raw_description}
                </div>
              </td>
              <td className="px-6 py-4 relative">
                {editingId === txn.id ? (
                  <select 
                    autoFocus
                    onBlur={() => setEditingId(null)}
                    onChange={(e) => handleCategoryChange(txn.id, e.target.value)}
                    defaultValue={txn.category || 'Other'}
                    className="border border-blue-500 rounded px-2 py-1 text-xs bg-white text-gray-800 outline-none"
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                ) : (
                  <button 
                    onClick={() => setEditingId(txn.id)}
                    className={`group/btn flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border shadow-sm transition-all hover:opacity-80 ${getCategoryColor(txn.category || 'Other').bg} ${getCategoryColor(txn.category || 'Other').text} ${getCategoryColor(txn.category || 'Other').border}`}
                  >
                    {txn.category || 'Other'}
                    <Edit2 className="w-3 h-3 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                  </button>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right font-medium">
                <div className={`flex items-center justify-end gap-1.5 ${txn.type === 'CREDIT' ? 'text-green-600' : 'text-gray-900'}`}>
                  {txn.type === 'CREDIT' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4 text-gray-400" />}
                  ₹{txn.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
