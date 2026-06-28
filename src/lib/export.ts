export interface StreamHistoryEntry {
  timestamp: string;
  type: "withdrawal" | "top-up" | "creation" | "cancellation";
  amount: string;
  txHash: string;
}

export function toCSV(entries: StreamHistoryEntry[]): string {
  const header = "date,type,amount,token,transaction_id";
  const rows = entries.map((e) => {
    const date = new Date(e.timestamp).toLocaleString();
    const amount = (Number(e.amount) / 10_000_000).toFixed(2);
    return `${date},${e.type},${amount},USDC,${e.txHash}`;
  });
  return [header, ...rows].join("\n");
}

export function toJSON(entries: StreamHistoryEntry[]): string {
  return JSON.stringify(entries, null, 2);
}

export function downloadBlob(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadCSVStreaming(entries: StreamHistoryEntry[], streamId: string) {
  const date = new Date().toISOString().split('T')[0];
  const filename = `stream-${streamId}-history-${date}.csv`;
  
  const header = "date,type,amount,token,transaction_id\n";
  const chunks: string[] = [header];
  
  const CHUNK_SIZE = 100;
  for (let i = 0; i < entries.length; i += CHUNK_SIZE) {
    const chunk = entries.slice(i, i + CHUNK_SIZE);
    const rows = chunk.map((e) => {
      const dateStr = new Date(e.timestamp).toLocaleString();
      const amount = (Number(e.amount) / 10_000_000).toFixed(2);
      return `${dateStr},${e.type},${amount},USDC,${e.txHash}`;
    });
    chunks.push(rows.join("\n") + "\n");
  }
  
  const blob = new Blob(chunks, { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadCSV(entries: StreamHistoryEntry[], streamId: string) {
  const date = new Date().toISOString().split('T')[0];
  downloadBlob(toCSV(entries), `stream-${streamId}-history-${date}.csv`, "text/csv");
}

export function downloadJSON(entries: StreamHistoryEntry[], streamId: string) {
  downloadBlob(toJSON(entries), `stream-${streamId}-history.json`, "application/json");
}
