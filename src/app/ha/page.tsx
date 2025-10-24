'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function HomeAssistantConfig() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [haUrl, setHaUrl] = useState('');
  const [haToken, setHaToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [hasConfig, setHasConfig] = useState(false);
  const [configInfo, setConfigInfo] = useState<any>(null);

  // Redirect to sign in if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/api/auth/signin');
    }
  }, [status, router]);

  // Load existing config on mount
  useEffect(() => {
    if (status === 'authenticated') {
      loadConfig();
    }
  }, [status]);

  const loadConfig = async () => {
    try {
      const response = await fetch('/api/ha/config');
      if (response.ok) {
        const data = await response.json();
        setConfigInfo(data);
        setHasConfig(true);
        setHaUrl(data.haUrl);
      } else if (response.status === 404) {
        setHasConfig(false);
      }
    } catch (err) {
      console.error('Failed to load config:', err);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    try {
      const response = await fetch('/api/ha/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ haUrl, haToken })
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('Configuration saved successfully!');
        setHasConfig(true);
        setHaToken(''); // Clear token input for security
        await loadConfig();
      } else {
        setError(data.error || 'Failed to save configuration');
      }
    } catch (err) {
      setError('Network error: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    setLoading(true);
    setMessage('');
    setError('');

    try {
      const response = await fetch('/api/ha/test');
      const data = await response.json();

      if (data.success) {
        setMessage(`Connection successful! Home Assistant version: ${data.haVersion}`);
      } else {
        setError(`Connection failed: ${data.error}`);
      }
    } catch (err) {
      setError('Network error: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to remove your Home Assistant configuration?')) {
      return;
    }

    setLoading(true);
    setMessage('');
    setError('');

    try {
      const response = await fetch('/api/ha/config', {
        method: 'DELETE'
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('Configuration removed successfully');
        setHasConfig(false);
        setConfigInfo(null);
        setHaUrl('');
        setHaToken('');
      } else {
        setError(data.error || 'Failed to remove configuration');
      }
    } catch (err) {
      setError('Network error: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white shadow-lg rounded-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Home Assistant Configuration
          </h1>
          <p className="text-gray-600 mb-8">
            Configure your Home Assistant instance to enable MCP control
          </p>

          {hasConfig && configInfo && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <h3 className="text-green-800 font-semibold mb-2">✓ Configuration Active</h3>
              <p className="text-green-700 text-sm">
                <strong>URL:</strong> {configInfo.haUrl}
              </p>
              <p className="text-green-700 text-sm">
                <strong>Token:</strong> {configInfo.tokenPreview}
              </p>
              <p className="text-green-700 text-sm">
                <strong>Updated:</strong> {new Date(configInfo.updatedAt).toLocaleString()}
              </p>
            </div>
          )}

          {message && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800">{message}</p>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-6">
            <div>
              <label htmlFor="haUrl" className="block text-sm font-medium text-gray-700 mb-2">
                Home Assistant URL
              </label>
              <input
                type="url"
                id="haUrl"
                value={haUrl}
                onChange={(e) => setHaUrl(e.target.value)}
                placeholder="http://homeassistant.local:8123"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="mt-1 text-sm text-gray-500">
                Your Home Assistant instance URL (including http:// or https://)
              </p>
            </div>

            <div>
              <label htmlFor="haToken" className="block text-sm font-medium text-gray-700 mb-2">
                Long-Lived Access Token
              </label>
              <input
                type="password"
                id="haToken"
                value={haToken}
                onChange={(e) => setHaToken(e.target.value)}
                placeholder={hasConfig ? "Enter new token to update" : "Your Home Assistant token"}
                required={!hasConfig}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="mt-1 text-sm text-gray-500">
                Create a long-lived access token in Home Assistant: Profile → Security → Long-Lived Access Tokens
              </p>
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
              >
                {loading ? 'Saving...' : hasConfig ? 'Update Configuration' : 'Save Configuration'}
              </button>

              {hasConfig && (
                <>
                  <button
                    type="button"
                    onClick={handleTest}
                    disabled={loading}
                    className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
                  >
                    {loading ? 'Testing...' : 'Test Connection'}
                  </button>

                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={loading}
                    className="bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
                  >
                    Remove
                  </button>
                </>
              )}
            </div>
          </form>

          <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-blue-900 font-semibold mb-3">📖 How to use with MCP</h3>
            <ol className="text-blue-800 text-sm space-y-2 list-decimal list-inside">
              <li>Save your Home Assistant credentials above</li>
              <li>Test the connection to ensure it works</li>
              <li>Use MCP tools in Cursor/Claude to control your Home Assistant devices</li>
              <li>Available tools: ha_turn_on, ha_turn_off, ha_toggle, ha_get_states, and more</li>
            </ol>
          </div>

          <div className="mt-6">
            <a 
              href="/"
              className="text-blue-600 hover:text-blue-700 text-sm"
            >
              ← Back to home
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

