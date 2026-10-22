/**
 * AppFooter — global site footer rendered in the root layout.
 *
 * This component is intentionally excluded from the embed layout
 * (src/app/embed/layout.tsx) so that embedded widgets have no branding
 * chrome that might conflict with the host page's own footer.
 */
export default function AppFooter() {
  return (
    <footer
      className="bg-gray-900 border-t border-gray-700 py-6 mt-auto"
      data-testid="app-footer"
    >
      <div className="max-w-4xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-500">
        <span>
          &copy; {new Date().getFullYear()} SoroStream. MIT License.
        </span>
        <div className="flex gap-4">
          <a
            href="https://github.com/SoroStream/sorostream-app"
            className="hover:text-gray-300 transition-colors"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
          <a
            href="https://drips.network/wave"
            className="hover:text-gray-300 transition-colors"
            target="_blank"
            rel="noopener noreferrer"
          >
            Drips Wave
          </a>
        </div>
      </div>
    </footer>
  );
}
