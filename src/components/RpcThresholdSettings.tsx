"use client";
import { usePreferences } from "@/src/context/PreferencesContext";

export default function RpcThresholdSettings() {
  const { rpcDegradedMs, rpcUnreachableBannerSeconds, saveAll } = usePreferences();
  return <section className="bg-gray-800 rounded-xl p-6 space-y-4 mb-8">
    <h2 className="text-lg font-semibold">RPC health thresholds</h2>
    <p className="text-sm text-gray-400">Changes apply on the next health poll. Leave blank to use the environment default.</p>
    <label className="block">Degraded latency (milliseconds)
      <input className="block bg-gray-700 rounded p-2" type="number" min="1" step="1" value={rpcDegradedMs ?? ""}
        onChange={e => saveAll({ rpcDegradedMs: e.target.value === "" ? null : Number(e.target.value) })} />
    </label>
    <label className="block">Unreachable banner delay (seconds)
      <input className="block bg-gray-700 rounded p-2" type="number" min="1" step="1" value={rpcUnreachableBannerSeconds ?? ""}
        onChange={e => saveAll({ rpcUnreachableBannerSeconds: e.target.value === "" ? null : Number(e.target.value) })} />
    </label>
  </section>;
}
