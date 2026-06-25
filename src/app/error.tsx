"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body className="flex min-h-screen flex-col items-center justify-center bg-gray-900 p-6 text-center">
        <h2 className="text-2xl font-bold text-white mb-2">Something went wrong</h2>
        <p className="text-gray-400 mb-6 max-w-md">{error.message}</p>
        <button
          onClick={reset}
          className="rounded-lg bg-green-600 px-5 py-2 font-medium text-white hover:bg-green-700 transition-colors"
        >
          Try again
        </button>
      </body>
    </html>
  );
}
