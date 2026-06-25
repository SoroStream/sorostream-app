export interface StreamHistoryEntry {
  timestamp: string;
  type: "withdrawal" | "top-up" | "creation" | "cancellation";
  amount: string;
  txHash: string;
}

export function toCSV(entries: StreamHistoryEntry[]): string {
  const header = "timestamp,type,amount,txHash";
  const rows = entries.map(
    (e) => `${e.timestamp},${e.type},${e.amount},${e.txHash}`
  );
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

export function downloadCSV(entries: StreamHistoryEntry[], streamId: string) {
  downloadBlob(toCSV(entries), `stream-${streamId}-history.csv`, "text/csv");
}

export function downloadJSON(entries: StreamHistoryEntry[], streamId: string) {
  downloadBlob(toJSON(entries), `stream-${streamId}-history.json`, "application/json");
}
