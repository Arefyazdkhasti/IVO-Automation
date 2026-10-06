module.exports = {
    URLS: {
        LOGIN_URL: 'https://e.ivo.ir/Login_Required.aspx',
        PORTAL_HOME_URL: 'https://e.ivo.ir/new_login/index1.aspx',
        POULTRY_PAGE_URL: 'https://e.ivo.ir/new_login/index_dbkava.aspx',
        REPORTS_HUB_URL: 'https://e.ivo.ir/new_login/reports.aspx',
        REPORTS_ISSUED_KO_URL: 'https://e.ivo.ir/new_login/Reports/Rep_zir_KO.aspx',
        CLOSURE_PAGE_URL: 'https://e.ivo.ir/new_login/chand/CAR_bar.aspx',
        DISCHARGE_PAGE_URL: 'https://e.ivo.ir/new_login/Reports/Rep_Rcv_takh.aspx',
    },
    REPORT_PAGES: [
        { id: 'KV', name: 'خروجی وارداتی (Import Exit)', url: 'https://e.ivo.ir/new_login/Reports/Rep_RCV_KV.aspx' },
        { id: 'KD', name: 'خروجی داخلی (Domestic Exit)', url: 'https://e.ivo.ir/new_login/Reports/Rep_RCV_KD.aspx' },
        { id: 'KS', name: 'خروجی صادراتی (Export Exit)', url: 'https://e.ivo.ir/new_login/Reports/Rep_RCV_KS.aspx' },
        { id: 'KO', name: 'درون استانی (Intra-provincial)', url: 'https://e.ivo.ir/new_login/Reports/Rep_RCV_KO.aspx' },
    ],
    DEFAULTS: {
        PORT: 3000,
        QUANTITY: '2000',
        FLOCK_AGE: '45 روز',
        COMMODITY_TYPE: 'گوشت مرغ',
        PERMIT_VALIDITY_DAYS: '3 روز',
        COOLDOWN_SECONDS: 120,
    },
};
