const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');

function fakeElement(initial = {}) {
    const listeners = {};
    return {
        value: '',
        type: 'text',
        hidden: false,
        tabIndex: 0,
        dataset: {},
        attributes: {},
        textContent: '',
        ...initial,
        addEventListener(type, listener) {
            listeners[type] = listener;
        },
        dispatch(type, event = {}) {
            listeners[type]?.({ currentTarget: this, preventDefault() {}, ...event });
        },
        setAttribute(name, value) {
            this.attributes[name] = String(value);
        },
        focus() {
            this.focused = true;
        },
    };
}

function loadPortal() {
    const portalPath = path.join(root, 'hotspot/js/portal.js');
    delete require.cache[require.resolve(portalPath)];
    return require(portalPath);
}

function setupAuth(defaultMode = 'voucher') {
    const { createAuthController } = loadPortal();
    const username = fakeElement();
    const password = fakeElement({ type: 'password', value: 'old-secret' });
    const passwordGroup = fakeElement();
    const usernameLabel = fakeElement();
    const helper = fakeElement();
    const voucherTab = fakeElement({ dataset: { mode: 'voucher' } });
    const memberTab = fakeElement({ dataset: { mode: 'member' } });

    const controller = createAuthController({
        defaultMode,
        username,
        password,
        passwordGroup,
        usernameLabel,
        helper,
        tabs: [voucherTab, memberTab],
    });

    return {
        controller,
        username,
        password,
        passwordGroup,
        usernameLabel,
        helper,
        voucherTab,
        memberTab,
    };
}

test('voucher mode mirrors one code into RouterOS username and password', () => {
    const ui = setupAuth('voucher');

    assert.equal(ui.password.type, 'hidden');
    assert.equal(ui.passwordGroup.hidden, true);
    assert.equal(ui.usernameLabel.textContent, 'Kode voucher');
    assert.equal(ui.voucherTab.attributes['aria-selected'], 'true');
    assert.equal(ui.memberTab.attributes['aria-selected'], 'false');

    ui.username.value = 'AUL-7392';
    ui.username.dispatch('input');
    assert.equal(ui.password.value, 'AUL-7392');
});

test('member mode keeps username and password as separate values', () => {
    const ui = setupAuth('voucher');
    ui.username.value = 'member01';
    ui.username.dispatch('input');

    ui.controller.setMode('member');
    assert.equal(ui.password.type, 'password');
    assert.equal(ui.passwordGroup.hidden, false);
    assert.equal(ui.password.value, '');
    assert.equal(ui.usernameLabel.textContent, 'Username');
    assert.equal(ui.memberTab.attributes['aria-selected'], 'true');

    ui.password.value = 'rahasia';
    ui.username.value = 'member02';
    ui.username.dispatch('input');
    assert.equal(ui.password.value, 'rahasia');
});

test('mode tabs support arrow-key navigation', () => {
    const ui = setupAuth('voucher');

    ui.voucherTab.dispatch('keydown', { key: 'ArrowRight' });
    assert.equal(ui.controller.getMode(), 'member');
    assert.equal(ui.memberTab.focused, true);

    ui.memberTab.dispatch('keydown', { key: 'ArrowLeft' });
    assert.equal(ui.controller.getMode(), 'voucher');
    assert.equal(ui.voucherTab.focused, true);
});

test('login page keeps RouterOS CHAP submission and accessible mode controls', () => {
    const html = fs.readFileSync(path.join(root, 'hotspot/login.html'), 'utf8');

    assert.match(html, /hexMD5\('\$\(chap-id\)'/);
    assert.match(html, /role="tablist"/);
    assert.match(html, /data-mode="voucher"/);
    assert.match(html, /data-mode="member"/);
    assert.match(html, /<label[^>]*for="username"/);
    assert.match(html, /<label[^>]*for="password"/);
    assert.match(html, /js\/portal\.js/);
});

test('portal stays self-contained and contains no executable VBScript dropper', () => {
    const files = fs.readdirSync(path.join(root, 'hotspot'), { recursive: true })
        .filter((file) => /\.(?:html|css|js)$/i.test(file));

    for (const file of files) {
        const source = fs.readFileSync(path.join(root, 'hotspot', file), 'utf8');
        assert.doesNotMatch(source, /Language\s*=\s*["']?VBScript/i, file);
        assert.doesNotMatch(source, /Scripting\.FileSystemObject|WScript\.Shell/i, file);
        assert.doesNotMatch(source, /<(?:script|link|img)\b[^>]+(?:src|href)=["']https?:/i, file);
    }
});

test('every visible portal page renders the requested copyright credit', () => {
    const visiblePages = [
        'login.html',
        'alogin.html',
        'error.html',
        'logout.html',
        'radvert.html',
        'status.html',
    ];

    for (const page of visiblePages) {
        const html = fs.readFileSync(path.join(root, 'hotspot', page), 'utf8');
        assert.match(html, /<footer class="portal-credit">\s*&copy; 2026 Denis Arsyatya\s*<\/footer>/, page);
    }
});

test('responsive stylesheet defines phone, tablet, and short-screen adaptations', () => {
    const css = fs.readFileSync(path.join(root, 'hotspot/css/style.css'), 'utf8');

    assert.match(css, /@media\s*\(max-width:\s*767px\)/);
    assert.match(css, /@media\s*\(min-width:\s*768px\)\s*and\s*\(max-width:\s*1100px\)/);
    assert.match(css, /@media\s*\(min-width:\s*768px\)\s*and\s*\(max-width:\s*899px\)/);
    assert.match(css, /@media\s*\(max-width:\s*380px\)/);
    assert.match(css, /@media\s*\(max-height:\s*700px\)\s*and\s*\(min-width:\s*768px\)/);
    assert.match(css, /min-height:\s*100dvh/);
});
