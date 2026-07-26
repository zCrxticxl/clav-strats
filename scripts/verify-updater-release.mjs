import { createHash, createPublicKey, verify } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const RETRIES = 6;
const RETRY_DELAY_MS = 5_000;
const PUBLIC_KEY_DER_PREFIX = Buffer.from('302a300506032b6570032100', 'hex');

const sleep = (milliseconds) => new Promise(resolve => setTimeout(resolve, milliseconds));

function argumentValue(name) {
  const inline = process.argv.find(argument => argument.startsWith(`${name}=`));
  if (inline) return inline.slice(name.length + 1);

  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function normalizeVersion(version) {
  const normalized = String(version || '').trim().replace(/^v/i, '');
  if (!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(normalized)) {
    throw new Error(`Invalid release version: ${version}`);
  }
  return normalized;
}

async function fetchWithRetry(url) {
  let lastError;

  for (let attempt = 1; attempt <= RETRIES; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'clav-strats-updater-verifier',
          'Cache-Control': 'no-cache',
        },
        redirect: 'follow',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }

      return response;
    } catch (error) {
      lastError = error;
      if (attempt < RETRIES) await sleep(RETRY_DELAY_MS);
    }
  }

  throw new Error(`Could not download ${url}: ${lastError?.message || lastError}`);
}

function decodePublicKey(encodedPublicKey) {
  const armored = Buffer.from(encodedPublicKey, 'base64').toString('utf8');
  const lines = armored.trim().split(/\r?\n/);
  if (lines.length < 2 || !lines[0].startsWith('untrusted comment:')) {
    throw new Error('Updater public key is not valid Minisign data');
  }

  const packet = Buffer.from(lines[1], 'base64');
  if (packet.length !== 42) {
    throw new Error(`Updater public key has invalid length ${packet.length}`);
  }

  const algorithm = packet.subarray(0, 2).toString('ascii');
  if (algorithm !== 'Ed' && algorithm !== 'ED') {
    throw new Error(`Unsupported public key algorithm ${algorithm}`);
  }

  return {
    keyId: packet.subarray(2, 10),
    key: createPublicKey({
      key: Buffer.concat([PUBLIC_KEY_DER_PREFIX, packet.subarray(10)]),
      format: 'der',
      type: 'spki',
    }),
  };
}

function decodeSignature(encodedSignature) {
  const armored = Buffer.from(encodedSignature, 'base64').toString('utf8');
  const lines = armored.trim().split(/\r?\n/);
  if (
    lines.length < 4
    || !lines[0].startsWith('untrusted comment:')
    || !lines[2].startsWith('trusted comment: ')
  ) {
    throw new Error('Release signature is not valid Minisign data');
  }

  const packet = Buffer.from(lines[1], 'base64');
  const globalSignature = Buffer.from(lines[3], 'base64');
  if (packet.length !== 74 || globalSignature.length !== 64) {
    throw new Error('Release signature has invalid packet lengths');
  }

  const algorithm = packet.subarray(0, 2).toString('ascii');
  if (algorithm !== 'Ed' && algorithm !== 'ED') {
    throw new Error(`Unsupported signature algorithm ${algorithm}`);
  }

  return {
    algorithm,
    keyId: packet.subarray(2, 10),
    signature: packet.subarray(10),
    trustedComment: lines[2].slice('trusted comment: '.length),
    globalSignature,
  };
}

function verifyMinisign(data, encodedSignature, encodedPublicKey) {
  const publicKey = decodePublicKey(encodedPublicKey);
  const signature = decodeSignature(encodedSignature);

  if (!publicKey.keyId.equals(signature.keyId)) {
    throw new Error('Release was signed with a different updater key');
  }

  const signedData = signature.algorithm === 'ED'
    ? createHash('blake2b512').update(data).digest()
    : data;

  if (!verify(null, signedData, publicKey.key, signature.signature)) {
    throw new Error('Installer signature verification failed');
  }

  const trustedData = Buffer.concat([
    signature.signature,
    Buffer.from(signature.trustedComment, 'utf8'),
  ]);
  if (!verify(null, trustedData, publicKey.key, signature.globalSignature)) {
    throw new Error('Trusted Minisign comment verification failed');
  }
}

const config = JSON.parse(await readFile(new URL('../src-tauri/tauri.conf.json', import.meta.url)));
const endpoint = config.plugins?.updater?.endpoints?.[0];
const publicKey = config.plugins?.updater?.pubkey;
if (!endpoint || !publicKey) {
  throw new Error('Updater endpoint or public key is missing from tauri.conf.json');
}

const manifestResponse = await fetchWithRetry(endpoint);
const manifest = await manifestResponse.json();
const manifestVersion = normalizeVersion(manifest.version);
const expectedVersion = argumentValue('--expect-version');
if (expectedVersion && manifestVersion !== normalizeVersion(expectedVersion)) {
  throw new Error(`Expected updater version ${normalizeVersion(expectedVersion)}, got ${manifestVersion}`);
}

const platform = manifest.platforms?.['windows-x86_64-nsis']
  || manifest.platforms?.['windows-x86_64'];
if (!platform?.url || !platform?.signature) {
  throw new Error('latest.json has no complete Windows x64 NSIS update entry');
}

const installerResponse = await fetchWithRetry(platform.url);
const installer = Buffer.from(await installerResponse.arrayBuffer());
if (installer.length === 0) {
  throw new Error('Published updater installer is empty');
}

verifyMinisign(installer, platform.signature, publicKey);

console.log(
  `Updater verified: v${manifestVersion}, ${installer.length} bytes, valid Minisign signature`,
);
