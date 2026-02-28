import { MenuUpload } from '@/components/features/MenuUpload';

export default function SubmitPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-whiskey-50 to-oak-50">
      {/* Header Section */}
      <section className="relative overflow-hidden border-b border-oak-200 bg-gradient-to-r from-whiskey-900 via-whiskey-800 to-whiskey-900">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCI+CjxyZWN0IHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgZmlsbD0ibm9uZSIvPgo8Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIxIiBmaWxsPSJyZ2JhKDIxMiwxNjcsODYsMC4wNSkiLz4KPC9zdmc+')] opacity-30" />
        <div className="relative mx-auto max-w-4xl px-4 py-16 md:py-20">
          <div className="text-5xl mb-4">📄</div>
          <h1 className="text-4xl md:text-5xl font-bold text-whiskey-50 mb-4 tracking-tight">
            Share a Bar Menu
          </h1>
          <p className="text-lg text-whiskey-200 max-w-2xl leading-relaxed">
            Help us grow our whiskey database! Share a link to a bar&apos;s menu or upload a photo,
            and our AI will automatically extract the whiskeys and details.
          </p>
        </div>
      </section>

      {/* Content Section */}
      <div className="mx-auto max-w-4xl px-4 py-12">
        {/* Upload Card */}
        <div className="rounded-xl border border-oak-200 bg-white shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-oak-200 px-6 py-4">
            <h2 className="text-xl font-bold text-whiskey-900 flex items-center gap-2">
              <span>🥃</span> Submit Your Menu
            </h2>
            <p className="text-sm text-whiskey-700 mt-1">
              Choose one of the options below to get started
            </p>
          </div>

          <div className="p-8">
            <MenuUpload />
          </div>
        </div>

        {/* Info Cards */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-lg border border-oak-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="text-3xl mb-3">🔗</div>
            <h3 className="font-bold text-whiskey-900 mb-2">Paste a Menu URL</h3>
            <p className="text-sm text-whiskey-700">
              Share the direct link to a bar&apos;s whiskey menu or wine list.
            </p>
          </div>

          <div className="rounded-lg border border-oak-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="text-3xl mb-3">📸</div>
            <h3 className="font-bold text-whiskey-900 mb-2">Upload a Photo</h3>
            <p className="text-sm text-whiskey-700">
              Take a photo of the menu board or page from your phone.
            </p>
          </div>

          <div className="rounded-lg border border-oak-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="text-3xl mb-3">✨</div>
            <h3 className="font-bold text-whiskey-900 mb-2">AI Extraction</h3>
            <p className="text-sm text-whiskey-700">
              We&apos;ll automatically parse the menu to find all the whiskeys.
            </p>
          </div>
        </div>

        {/* Tips Section */}
        <div className="mt-8 rounded-lg border-l-4 border-amber-500 bg-amber-50 p-6">
          <h3 className="font-bold text-whiskey-900 mb-3 flex items-center gap-2">
            <span>💡</span> Tips for Best Results
          </h3>
          <ul className="space-y-2 text-sm text-whiskey-700">
            <li className="flex gap-2">
              <span className="text-amber-600">•</span>
              <span>Make sure the menu clearly shows whiskey names and prices</span>
            </li>
            <li className="flex gap-2">
              <span className="text-amber-600">•</span>
              <span>For photos, ensure good lighting and the menu is readable</span>
            </li>
            <li className="flex gap-2">
              <span className="text-amber-600">•</span>
              <span>Include the bar name and location for context</span>
            </li>
            <li className="flex gap-2">
              <span className="text-amber-600">•</span>
              <span>Our AI works best with menus that list distillery and type</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
