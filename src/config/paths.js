const path = require('path');
const fs = require('fs');

const ROOT_DIR = path.resolve(__dirname, '../../');
const SRC_DIR = path.join(ROOT_DIR, 'src');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const RESULTS_DIR = path.join(ROOT_DIR, 'results');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');

// Ensure essential directories exist
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(RESULTS_DIR)) fs.mkdirSync(RESULTS_DIR, { recursive: true });

function resolveDataFile(filename) {
    const dataPath = path.join(DATA_DIR, filename);
    if (fs.existsSync(dataPath)) return dataPath;
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
