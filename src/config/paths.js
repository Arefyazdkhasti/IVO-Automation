const path = require('path');
const fs = require('fs');

const ROOT_DIR = path.resolve(__dirname, '../../');
const SRC_DIR = path.join(ROOT_DIR, 'src');
const DATA_DIR = process.env.DATA_DIR || path.join(ROOT_DIR, 'data');
const RESULTS_DIR = process.env.RESULTS_DIR || path.join(ROOT_DIR, 'results');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');

// Ensure essential directories exist
try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
} catch (_) {}

try {
    if (!fs.existsSync(RESULTS_DIR)) fs.mkdirSync(RESULTS_DIR, { recursive: true });
} catch (_) {}

function resolveDataFile(filename) {
    const dataPath = path.join(DATA_DIR, filename);
    if (fs.existsSync(dataPath)) return dataPath;
    const bundledPath = path.join(ROOT_DIR, 'data', filename);
    if (fs.existsSync(bundledPath)) return bundledPath;
    const rootPath = path.join(ROOT_DIR, filename);
    if (fs.existsSync(rootPath)) return rootPath;
    return dataPath;
}

module.exports = {
    ROOT_DIR,
    SRC_DIR,
    DATA_DIR,
    RESULTS_DIR,
    PUBLIC_DIR,
    USERS_FILE: resolveDataFile('users.json'),
    SLAUGHTERHOUSES_FILE: resolveDataFile('slaughterhouses.json'),
    TRACKING_CODES_FILE: resolveDataFile('tracking_codes.json'),
    LAST_SUCCESSFUL_CODE_FILE: resolveDataFile('last_successful_code.json'),
    resolveDataFile,
};
