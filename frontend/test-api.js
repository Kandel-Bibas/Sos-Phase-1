// Quick test script to verify your AWS API endpoint
// Run with: node test-api.js

const https = require('https');

// REPLACE THIS with your actual endpoint
const API_ENDPOINT = 'YOUR_ENDPOINT_HERE';

// Extract hostname and path from URL
const url = new URL(API_ENDPOINT);

const postData = JSON.stringify({
  query: 'test question'
});

const options = {
  hostname: url.hostname,
  port: 443,
  path: url.pathname,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': postData.length
  }
};

console.log('🧪 Testing API endpoint:', API_ENDPOINT);
console.log('📤 Sending request...\n');

const req = https.request(options, (res) => {
  console.log('✅ Status Code:', res.statusCode);
  console.log('📋 Headers:', JSON.stringify(res.headers, null, 2));
  
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('\n📥 Response:');
    try {
      const json = JSON.parse(data);
      console.log(JSON.stringify(json, null, 2));
      
      if (json.answer || json.response || json.message) {
        console.log('\n✅ API is working correctly!');
      } else {
        console.log('\n⚠️  Response format might be incorrect');
      }
    } catch (e) {
      console.log(data);
      console.log('\n❌ Response is not valid JSON');
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Error:', error.message);
  console.error('\nPossible issues:');
  console.error('1. Check if the endpoint URL is correct');
  console.error('2. Verify network connectivity');
  console.error('3. Check if API Gateway is deployed');
});

req.write(postData);
req.end();
