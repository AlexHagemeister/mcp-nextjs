export default async function CallbackPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const params = await searchParams;
  const code = params.code as string;
  const error = params.error as string;
  const state = params.state as string;

  if (error) {
    return (
      <main className="flex items-center justify-center h-screen bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <h1 className="text-2xl font-bold mb-4 text-red-600">Authorization Error</h1>
          <p className="text-gray-700">Error: {error}</p>
        </div>
      </main>
    );
  }

  if (!code) {
    return (
      <main className="flex items-center justify-center h-screen bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <h1 className="text-2xl font-bold mb-4">No Authorization Code</h1>
          <p className="text-gray-700">No authorization code received.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex items-center justify-center h-screen bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-2xl w-full">
        <h1 className="text-2xl font-bold mb-4 text-green-600">✓ Authorization Successful!</h1>
        <div className="space-y-4">
          <div>
            <h2 className="font-semibold text-gray-700">Authorization Code:</h2>
            <pre className="bg-gray-100 p-3 rounded mt-2 text-sm overflow-x-auto">
              {code}
            </pre>
          </div>
          {state && (
            <div>
              <h2 className="font-semibold text-gray-700">State:</h2>
              <pre className="bg-gray-100 p-3 rounded mt-2 text-sm overflow-x-auto">
                {state}
              </pre>
            </div>
          )}
          <div className="mt-6 p-4 bg-blue-50 rounded">
            <h2 className="font-semibold text-blue-900 mb-2">Next Steps:</h2>
            <p className="text-sm text-blue-800">
              Use this authorization code to exchange for an access token by making a POST request to:
              <code className="block mt-2 bg-white p-2 rounded text-xs">
                POST /api/oauth/token
              </code>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

