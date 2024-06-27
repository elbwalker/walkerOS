import { InformationCircleIcon } from '@heroicons/react/20/solid';
import Head from '@docusaurus/Head';

export default function Outdated() {
  return (
    <>
      <Head>
        <meta name="robots" content="noindex" />
      </Head>

      <div className="rounded-md bg-yellow-50 p-4 mb-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <InformationCircleIcon
              className="h-5 w-5 text-yellow-400"
              aria-hidden="true"
            />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">
              New version available
            </h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p className="mb-0">
                This is an outdated version of the package. It's recommended to
                update and use the latest version.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
