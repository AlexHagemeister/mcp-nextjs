'use client';

import { useState } from 'react';

export default function TestPage() {
  const [step, setStep] = useState<'register' | 'authorize' | 'token' | 'mcp'>('register');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [authCode, setAuthCode] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  const registerClient = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/oauth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_name: 'Test Client',
          redirect_uris: [`${baseUrl}/test`],
        }),
      });
      const data = await response.json();
      if (data.client_id) {
        setClientId(data.client_id);
        setClientSecret(data.client_secret);
        setResult(JSON.stringify(data, null, 2));
        setStep('authorize');
      } else {
        setResult('Error: ' + JSON.stringify(data));
      }
    } catch (error) {
      setResult('Error: ' + String(error));
    }
    setLoading(false);
  };

  const authorize = () => {
    const authUrl = `${baseUrl}/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(baseUrl + '/test')}&response_type=code`;
    window.location.href = authUrl;
  };

  const exchangeToken = async () => {
    setLoading(true);
    try {
      const formData = new URLSearchParams();
      formData.append('grant_type', 'authorization_code');
      formData.append('code', authCode);
      formData.append('redirect_uri', `${baseUrl}/test`);
      formData.append('client_id', clientId);
      formData.append('client_secret', clientSecret);

      const response = await fetch('/api/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData,
      });
      const data = await response.json();
      if (data.access_token) {
        setAccessToken(data.access_token);
        setResult(JSON.stringify(data, null, 2));
        setStep('mcp');
      } else {
        setResult('Error: ' + JSON.stringify(data));
      }
    } catch (error) {
      setResult('Error: ' + String(error));
    }
    setLoading(false);
  };

  const testMCP = async () => {
    setLoading(true);
    try {
      const response = await fetch('/mcp/mcp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json, text/event-stream',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/call',
          params: {
            name: 'add_numbers',
            arguments: { a: 42, b: 8 },
          },
        }),
      });
      const text = await response.text();
      setResult(text);
    } catch (error) {
      setResult('Error: ' + String(error));
    }
    setLoading(false);
  };

  // Check for auth code in URL
  if (typeof window !== 'undefined' && step === 'authorize') {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (code && !authCode) {
      setAuthCode(code);
      setStep('token');
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">MCP OAuth Server Test</h1>

        <div className="space-y-6">
          {/* Step 1: Register Client */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">
              Step 1: Register OAuth Client {step === 'register' && '← Start Here'}
            </h2>
            <button
              onClick={registerClient}
              disabled={loading || step !== 'register'}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
            >
              {loading ? 'Registering...' : 'Register Client'}
            </button>
            {clientId && (
              <div className="mt-4">
                <p className="text-sm text-green-600">✓ Client registered!</p>
                <pre className="bg-gray-100 p-2 rounded text-xs mt-2">
                  Client ID: {clientId}
                </pre>
              </div>
            )}
          </div>

          {/* Step 2: Authorize */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">
              Step 2: Authorize with Google {step === 'authorize' && '← Do This Next'}
            </h2>
            <button
              onClick={authorize}
              disabled={!clientId || step !== 'authorize'}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
            >
              Sign in with Google
            </button>
          </div>

          {/* Step 3: Exchange Token */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">
              Step 3: Exchange Code for Token {step === 'token' && '← Continue Here'}
            </h2>
            {authCode && (
              <div className="mb-4">
                <p className="text-sm text-green-600">✓ Received authorization code!</p>
                <pre className="bg-gray-100 p-2 rounded text-xs mt-2">
                  Code: {authCode.substring(0, 20)}...
                </pre>
              </div>
            )}
            <button
              onClick={exchangeToken}
              disabled={!authCode || loading || step !== 'token'}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-400"
            >
              {loading ? 'Exchanging...' : 'Get Access Token'}
            </button>
            {accessToken && (
              <div className="mt-4">
                <p className="text-sm text-green-600">✓ Got access token!</p>
              </div>
            )}
          </div>

          {/* Step 4: Test MCP */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">
              Step 4: Test MCP Endpoint {step === 'mcp' && '← Finally, Test MCP!'}
            </h2>
            <button
              onClick={testMCP}
              disabled={!accessToken || loading || step !== 'mcp'}
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:bg-gray-400"
            >
              {loading ? 'Testing...' : 'Call add_numbers(42, 8)'}
            </button>
          </div>

          {/* Results */}
          {result && (
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">Result</h2>
              <pre className="bg-gray-100 p-4 rounded text-xs overflow-x-auto">
                {result}
              </pre>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

