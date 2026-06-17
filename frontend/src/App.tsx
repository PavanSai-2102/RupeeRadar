import React, { useState, useEffect } from 'react';
import { UploadArea } from './components/UploadArea';
import { Dashboard } from './components/Dashboard';
import { RulesEngine } from './components/RulesEngine';
import { getSessionStatus } from './api';

function App() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [appState, setAppState] = useState<'upload' | 'processing' | 'dashboard'>('upload');

  useEffect(() => {
    if (!sessionId || appState !== 'processing') return;

    const interval = setInterval(async () => {
      try {
        const { status } = await getSessionStatus(sessionId);
        if (status === 'COMPLETED') {
          setAppState('dashboard');
          clearInterval(interval);
        }
      } catch (e) {
        console.error("Polling error", e);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [sessionId, appState]);

  const handleSessionCreated = (id: string) => {
    setSessionId(id);
    setAppState('processing');
  };

  const [activeTab, setActiveTab] = useState<'main' | 'rules'>('main');

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <header className="bg-white shadow-sm py-4 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-blue-600 tracking-tight cursor-pointer" onClick={() => setActiveTab('main')}>RupeeRadar</h1>
          <nav className="flex items-center gap-4">
            <button 
              onClick={() => setActiveTab('main')} 
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'main' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              Dashboard
            </button>
            <button 
              onClick={() => setActiveTab('rules')} 
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'rules' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              Custom Rules
            </button>
          </nav>
        </div>
      </header>

      <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'rules' ? (
          <RulesEngine />
        ) : (
          <>
            {appState === 'upload' && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
                <div className="text-center mb-8">
                  <h2 className="text-xl font-semibold text-gray-800 mb-2">Welcome to your Personal Finance Assistant</h2>
                  <p className="text-gray-500">Upload your bank statement to get started with AI categorization and insights.</p>
                </div>
                <UploadArea onSessionCreated={handleSessionCreated} />
              </div>
            )}

            {appState === 'processing' && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-16 flex flex-col items-center justify-center">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mb-6"></div>
                <h2 className="text-2xl font-semibold text-gray-800 mb-2">Analyzing your transactions...</h2>
                <p className="text-gray-500">Our AI advisor is securely categorizing your spending and generating insights.</p>
              </div>
            )}

            {appState === 'dashboard' && sessionId && (
              <Dashboard sessionId={sessionId} onReset={() => setAppState('upload')} />
            )}
          </>
        )}
      </main>

      <footer className="bg-white border-t border-gray-200 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-gray-500">
          &copy; {new Date().getFullYear()} RupeeRadar. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

export default App;
