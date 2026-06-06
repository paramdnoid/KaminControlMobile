#!/usr/bin/env node
const fs = require('node:fs');
const http = require('node:http');
const https = require('node:https');
const path = require('node:path');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');

const DEFAULT_SCHEMA_URL = 'https://json.schemastore.org/claude-code-settings.json';
const settingsPath = process.argv[2] || '.claude/settings.json';

function readJson(filePath) {
  const resolved = path.resolve(filePath);
  return JSON.parse(fs.readFileSync(resolved, 'utf8'));
}

function requestJson(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > 5) {
      reject(new Error(`Too many redirects while fetching ${url}`));
      return;
    }

    const client = url.startsWith('http://') ? http : https;
    const request = client.get(
      url,
      {
        headers: {
          Accept: 'application/schema+json, application/json',
          'User-Agent': 'KaminControlMobile Claude settings validator',
        },
      },
      (response) => {
        const statusCode = response.statusCode || 0;
        const location = response.headers.location;
        if (statusCode >= 300 && statusCode < 400 && location) {
          response.resume();
          resolve(requestJson(new URL(location, url).toString(), redirects + 1));
          return;
        }

        if (statusCode < 200 || statusCode >= 300) {
          response.resume();
          reject(new Error(`Schema fetch failed with HTTP ${statusCode}`));
          return;
        }

        let body = '';
        response.setEncoding('utf8');
        response.on('data', (chunk) => {
          body += chunk;
        });
        response.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch (error) {
            reject(error);
          }
        });
      },
    );

    request.setTimeout(15000, () => {
      request.destroy(new Error(`Timed out fetching ${url}`));
    });
    request.on('error', reject);
  });
}

function formatAjvError(error) {
  const location = error.instancePath || '/';
  const detail = error.params ? ` ${JSON.stringify(error.params)}` : '';
  return `${location} ${error.message || 'is invalid'}${detail}`;
}

async function main() {
  const settings = readJson(settingsPath);
  const schemaUrl = process.env.CLAUDE_SETTINGS_SCHEMA_URL || settings.$schema || DEFAULT_SCHEMA_URL;
  const schema = schemaUrl.startsWith('http://') || schemaUrl.startsWith('https://')
    ? await requestJson(schemaUrl)
    : readJson(schemaUrl);

  const ajv = new Ajv({
    allErrors: true,
    allowUnionTypes: true,
    strict: false,
  });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  const valid = validate(settings);

  if (!valid) {
    console.error(`Claude settings schema validation failed for ${settingsPath}`);
    for (const error of validate.errors || []) {
      console.error(`- ${formatAjvError(error)}`);
    }
    process.exit(1);
  }

  console.log(`Claude settings schema validation ok (${schema.title || schemaUrl})`);
}

main().catch((error) => {
  console.error(`Claude settings schema validation failed: ${error.message}`);
  process.exit(1);
});
