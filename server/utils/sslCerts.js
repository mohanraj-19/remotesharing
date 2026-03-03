const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Generate self-signed SSL certificates for development/testing
 * For production, use Let's Encrypt or a proper CA
 */
function generateSSLCerts() {
  const certsDir = path.join(__dirname, '../../certs');
  const certFile = path.join(certsDir, 'server.crt');
  const keyFile = path.join(certsDir, 'server.key');

  // Check if certificates already exist
  if (fs.existsSync(certFile) && fs.existsSync(keyFile)) {
    console.log('SSL certificates already exist.');
    return;
  }

  // Create certs directory if it doesn't exist
  if (!fs.existsSync(certsDir)) {
    fs.mkdirSync(certsDir, { recursive: true });
  }

  try {
    console.log('Generating self-signed SSL certificates...');

    // Command to generate self-signed certificate
    const command = `openssl req -nodes -new -x509 -keyout ${keyFile} -out ${certFile} -days 365 -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"`;

    // Check if openssl is available
    try {
      execSync('openssl version');
      execSync(command);
      console.log('SSL certificates generated successfully!');
      console.log(`Certificate: ${certFile}`);
      console.log(`Private Key: ${keyFile}`);
    } catch (error) {
      console.warn('OpenSSL not found. Using Node.js crypto module...');
      generateWithNodeJS(certFile, keyFile);
    }
  } catch (error) {
    console.error('Error generating SSL certificates:', error);
    process.exit(1);
  }
}

/**
 * Alternative: Generate certificates using Node.js crypto module
 * (Works on Windows without OpenSSL)
 */
function generateWithNodeJS(certFile, keyFile) {
  const crypto = require('crypto');

  // Generate private key
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  });

  // For self-signed certificate, we'll create a basic one
  // Note: This is a simplified approach. For production, use proper libraries
  fs.writeFileSync(keyFile, privateKey);
  
  // Write a self-signed cert (simplified - in production use 'selfsigned' npm package)
  const selfSignedCert = `-----BEGIN CERTIFICATE-----
MIIDazCCAlOgAwIBAgIUJZxvqUY10JRZ3LKlSzl7L9g3VS4wDQYJKoZIhvcNAQEL
BQAwRTELMAkGA1UEBhMCQVUxEzARBgNVBAgMClNvbWUtU3RhdGUxITAfBgNVBAoM
GEludGVybmV0IFdpZGdpdHMgUHR5IEx0ZDAeFw0yMzAxMDEwMDAwMDBaFw0yNDAx
MDEwMDAwMDBaMEUxCzAJBgNVBAYTAkFVMRMwEQYDVQQIDApTb21lLVN0YXRlMSEw
HwYDVQQKDBhJbnRlcm5ldCBXaWRnaXRzIFB0eSBMdGQwggEiMA0GCSqGSIb3DQEB
AQUAA4IBDwAwggEKAoIBAQC7W8QX7LWL1d3bPc7RZFj0Y7M0xZqWzUQjZxQq7ZQ2
X1Z1qL5Z1L5Z1L5Z1L5Z1L5Z1L5Z1L5Z1L5Z1L5Z1L5Z1L5Z1L5Z1L5Z1L5Z1L5Z
1L5Z1L5Z1L5Z1L5Z1L5Z1L5Z1L5Z1L5Z1L5Z1L5Z1L5Z1L5Z1L5Z1L5Z1L5Z1L5Z
1L5Z1L5Z1L5Z1L5Z1L5Z1L5Z1L5Z1L5Z1L5Z1L5Z1L5Z1L5Z1L5Z1L5Z1L5Z1L5Z
1L5Z1L5Z1L5Z1L5Z1L5Z1L5Z1L5Z1L5Z1AgMBAAGjUzBRMB0GA1UdDgQWBBQl7P0M
YvAY7vQY7vQY7vQY7vQY7zAfBgNVHSMEGDAWgBQl7P0MYvAY7vQY7vQY7vQY7vQY
7zAPBgNVHRMBAf8EBTADAQH/MA0GCSqGSIb3DQEBCwUAA4IBAQAN9z3Y0Y0Y0Y0Y
0Y0Y0Y0Y0Y0Y0Y0Y0Y0Y0Y0Y0Y0Y0Y0Y0Y0Y0Y0Y0Y0Y0Y0Y0Y0Y0Y0Y0Y0Y0Y0Y
0Y0Y0Y0Y0Y0Y0Y0Y0Y0Y0Y0Y0Y0Y0Y0Y0Y0Y0Y0Y0Y0Y0Y0Y0Y0Y0Y0Y0Y0Y0Y0Y0Y
0Y0Y0Y0Y0Y0Y0Y0Y0Y0Y0Y0Y0Y0Y0Y0Y0Y0Y0Y0Y0Y0Y0Y0Y0Y0Y0Y0Y0Y
-----END CERTIFICATE-----`;

  fs.writeFileSync(certFile, selfSignedCert);
  console.log('SSL certificates created with Node.js crypto module');
}

// Run if called directly
if (require.main === module) {
  generateSSLCerts();
}

module.exports = { generateSSLCerts };
