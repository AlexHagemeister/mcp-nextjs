#!/usr/bin/env node

/**
 * Home Assistant WebSocket Test Connection
 *
 * This script tests the WebSocket connection to your Home Assistant instance.
 * Run with: node test-ha-websocket.js
 */

const WebSocket = require('ws');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Home Assistant connection details
const HA_HOST = 'homeassistant.local'; // You can also use 192.168.3.71
const HA_PORT = 8123;
const WS_URL = `ws://${HA_HOST}:${HA_PORT}/api/websocket`;

let messageId = 1;

function promptForToken() {
  return new Promise((resolve) => {
    rl.question('Enter your Home Assistant Long-Lived Access Token: ', (token) => {
      resolve(token.trim());
    });
  });
}

async function testConnection() {
  console.log('\n🔌 Home Assistant WebSocket Test\n');
  console.log(`Connecting to: ${WS_URL}\n`);

  const token = await promptForToken();

  if (!token) {
    console.error('❌ No token provided. Exiting.');
    rl.close();
    process.exit(1);
  }

  const ws = new WebSocket(WS_URL);

  ws.on('open', () => {
    console.log('✅ WebSocket connection opened');
  });

  ws.on('message', (data) => {
    const message = JSON.parse(data.toString());
    console.log('\n📨 Received:', JSON.stringify(message, null, 2));

    // Handle authentication flow
    if (message.type === 'auth_required') {
      console.log('\n🔐 Authentication required, sending token...');
      ws.send(JSON.stringify({
        type: 'auth',
        access_token: token
      }));
    } else if (message.type === 'auth_ok') {
      console.log('\n✅ Authentication successful!');
      console.log(`   HA Version: ${message.ha_version}`);

      // Test a simple command: get states
      console.log('\n📤 Requesting all states...');
      ws.send(JSON.stringify({
        id: messageId++,
        type: 'get_states'
      }));
    } else if (message.type === 'auth_invalid') {
      console.error('\n❌ Authentication failed:', message.message);
      ws.close();
    } else if (message.type === 'result') {
      if (message.success) {
        console.log('\n✅ Command successful!');
        if (message.result && Array.isArray(message.result)) {
          console.log(`   Found ${message.result.length} entities`);
          console.log('\n📋 Sample entities (first 5):');
          message.result.slice(0, 5).forEach((entity) => {
            console.log(`   - ${entity.entity_id}: ${entity.state} (${entity.attributes.friendly_name || 'N/A'})`);
          });
        }

        // Test complete, close connection
        console.log('\n✨ Test completed successfully!');
        console.log('   Closing connection...\n');
        ws.close();
      } else {
        console.error('\n❌ Command failed:', message.error);
        ws.close();
      }
    } else if (message.type === 'event') {
      console.log('📢 Event received');
    }
  });

  ws.on('error', (error) => {
    console.error('\n❌ WebSocket error:', error.message);
    rl.close();
  });

  ws.on('close', (code, reason) => {
    console.log(`\n🔌 Connection closed (code: ${code})${reason ? `, reason: ${reason}` : ''}`);
    rl.close();
    process.exit(0);
  });
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('\n\n👋 Interrupted by user. Exiting...');
  rl.close();
  process.exit(0);
});

testConnection();
