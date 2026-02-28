import { MenuUpload } from '@/components/features/MenuUpload';

export default function SubmitPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-3xl font-bold text-stone-900 mb-2">Submit a Bar Menu</h1>
      <p className="text-stone-600 mb-8">
        Help us grow our database! Paste a link to a bar&apos;s whiskey menu or upload a photo,
        and we&apos;ll automatically extract the whiskeys using AI.
      </p>
      <MenuUpload />
    </div>
  );
}
