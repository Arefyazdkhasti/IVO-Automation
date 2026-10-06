/**
 * Persian (Jalali) date helpers for IVO reporting and clearance verification.
 */

/**
 * Calculates Persian start date:
 * Goes 1 extra month back (e.g. 9 Mehr -> 1 Shahrivar: 1405/06/01).
 * If day < 5, goes back 2 months.
 *
 * @param {Date} date
 * @returns {string} Persian date formatted as YYYY/MM/01
 */
function getTargetPersianStartDate(date = new Date()) {
    const parts = new Intl.DateTimeFormat('en-US-u-ca-persian', {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
    }).formatToParts(date);

    const getPart = (type) => parseInt(parts.find((p) => p.type === type).value, 10);
    let year = getPart('year');
    let month = getPart('month');
    let day = getPart('day');

    month -= 1;
    if (day < 5) {
        month -= 1;
    }

    while (month <= 0) {
        month += 12;
        year -= 1;
    }

    const mm = String(month).padStart(2, '0');
    return `${year}/${mm}/01`;
}

/**
 * Adds days to a Persian date string (YYYY/MM/DD or YYYY/M/D)
 * Accurately accounts for Jalali calendar month lengths (31, 30, and leap 30/29).
 *
 * @param {string} dateStr
 * @param {number} daysToAdd
 * @returns {string|null} Persian date formatted as YYYY/MM/DD
 */
function addDaysToPersianDate(dateStr, daysToAdd = 1) {
    const match = dateStr.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})/);
    if (!match) return null;

    let year = parseInt(match[1], 10);
    let month = parseInt(match[2], 10);
    let day = parseInt(match[3], 10);

    day += daysToAdd;

    const getDaysInMonth = (y, m) => {
        if (m <= 6) return 31;
        if (m <= 11) return 30;
        const isLeap = (((((y - (y > 0 ? 474 : 473)) % 2820) + 474 + 38) * 682) % 2816) < 682;
        return isLeap ? 30 : 29;
    };

    while (day > getDaysInMonth(year, month)) {
        day -= getDaysInMonth(year, month);
        month += 1;
        if (month > 12) {
            month = 1;
            year += 1;
        }
    }

    const mm = String(month).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return `${year}/${mm}/${dd}`;
}

/**
 * Returns today's Persian date in YYYY/MM/DD format.
 */
function getTodayPersianDate(date = new Date()) {
    const parts = new Intl.DateTimeFormat('en-US-u-ca-persian', {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
    }).formatToParts(date);

    const getPart = (type) => parseInt(parts.find((p) => p.type === type).value, 10);
    const year = getPart('year');
    const month = String(getPart('month')).padStart(2, '0');
    const day = String(getPart('day')).padStart(2, '0');
    return `${year}/${month}/${day}`;
}

/**
 * Checks if a date string in Persian format (e.g. "21:2 1405/7/14" or "1405/07/14")
 * corresponds to today's Persian date.
 */
function isTodayPersian(dateText, targetDate = new Date()) {
    if (!dateText) return false;
    const match = String(dateText).match(/(\d{4})\/(\d{1,2})\/(\d{1,2})/);
    if (!match) return false;
    const [, y, m, d] = match;

    const parts = new Intl.DateTimeFormat('en-US-u-ca-persian', {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
    }).formatToParts(targetDate);
    const getPart = (type) => parseInt(parts.find((p) => p.type === type).value, 10);
    const todayY = getPart('year');
    const todayM = getPart('month');
    const todayD = getPart('day');

    return parseInt(y, 10) === todayY && parseInt(m, 10) === todayM && parseInt(d, 10) === todayD;
}

module.exports = {
    getTargetPersianStartDate,
    addDaysToPersianDate,
    getTodayPersianDate,
    isTodayPersian,
};
