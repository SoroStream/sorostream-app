import Link from "next/link";
import { Button, Card } from "@/components/ui";
import { useTranslations } from "@/src/lib/i18n";

export default function Home() {
  const t = useTranslations("home");

  const steps = [
    { titleKey: "step_create_title", descKey: "step_create_desc" },
    { titleKey: "step_flow_title", descKey: "step_flow_desc" },
    { titleKey: "step_withdraw_title", descKey: "step_withdraw_desc" },
  ] as const;

  return (
    <main className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-20 text-center">
        <h1 className="text-3xl sm:text-5xl font-bold mb-4 sm:mb-6 text-green-400">Stream Money Like Data</h1>
        <p className="text-base sm:text-xl text-gray-400 mb-8 sm:mb-10 px-2">Send USDC continuously by the second — salaries, subscriptions, and vesting on Stellar.</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-stretch sm:items-center">
          <Link href="/dashboard" className="bg-green-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-green-700 text-center">Launch App</Link>
          <a href="https://github.com/SoroStream" className="border border-gray-600 text-gray-300 px-8 py-3 rounded-lg font-medium hover:border-gray-400 text-center">View on GitHub</a>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-8 mt-12 sm:mt-20">
          {steps.map((item, i) => (
            <Card key={i}>
              <div className="text-2xl font-bold text-green-400 mb-2">{i + 1}</div>
              <h3 className="font-semibold mb-2">{t(item.titleKey)}</h3>
              <p className="text-gray-400 text-sm">{t(item.descKey)}</p>
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}
