import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const versionData = {
    version: new Date().getTime().toString(), // Timestamp as version
    timestamp: new Date().toISOString()
};

const versionPath = path.join(__dirname, '../public/version.json');

fs.writeFileSync(versionPath, JSON.stringify(versionData, null, 2));

console.log('✅ version.json generated:', versionData);
