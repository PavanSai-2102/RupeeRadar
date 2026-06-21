const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '');

export async function uploadStatement(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE_URL}/upload`, { method: 'POST', body: formData });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getSessionStatus(sessionId: string) {
  const res = await fetch(`${API_BASE_URL}/sessions/${sessionId}/status`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getSessionAnalytics(sessionId: string) {
  const res = await fetch(`${API_BASE_URL}/sessions/${sessionId}/analytics`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getSessionInsights(sessionId: string) {
  const res = await fetch(`${API_BASE_URL}/sessions/${sessionId}/insights`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getSessionTransactions(sessionId: string) {
  const res = await fetch(`${API_BASE_URL}/sessions/${sessionId}/transactions`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function updateTransactionCategory(transactionId: string, category: string) {
  const res = await fetch(`${API_BASE_URL}/transactions/${transactionId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ category })
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getGlobalAnalytics() {
  const res = await fetch(`${API_BASE_URL}/analytics/global`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getRules() {
  const res = await fetch(`${API_BASE_URL}/rules`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function createRule(keyword: string, category: string, is_recurring: boolean) {
  const res = await fetch(`${API_BASE_URL}/rules`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ keyword, category, is_recurring })
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function deleteRule(id: string) {
  const res = await fetch(`${API_BASE_URL}/rules/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
