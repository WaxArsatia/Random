(function (root, factory) {
    var api = factory();

    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }

    if (root) {
        root.AulPortal = api;
    }
}(typeof window !== 'undefined' ? window : globalThis, function () {
    'use strict';

    function createAuthController(options) {
        var username = options.username;
        var password = options.password;
        var passwordGroup = options.passwordGroup;
        var usernameLabel = options.usernameLabel;
        var helper = options.helper;
        var tabs = options.tabs || [];
        var currentMode = null;

        function syncVoucherPassword() {
            if (currentMode === 'voucher') {
                password.value = username.value;
            }
        }

        function setMode(mode) {
            var nextMode = mode === 'member' ? 'member' : 'voucher';
            var wasVoucher = currentMode === 'voucher';
            currentMode = nextMode;

            if (nextMode === 'voucher') {
                password.type = 'hidden';
                password.required = false;
                passwordGroup.hidden = true;
                usernameLabel.textContent = 'Kode voucher';
                helper.textContent = 'Masukkan kode voucher yang Anda miliki.';
                syncVoucherPassword();
            } else {
                password.type = 'password';
                password.required = true;
                passwordGroup.hidden = false;
                usernameLabel.textContent = 'Username';
                helper.textContent = 'Masukkan username dan password akun Anda.';
                if (wasVoucher) {
                    password.value = '';
                }
            }

            tabs.forEach(function (tab) {
                var active = tab.dataset.mode === nextMode;
                tab.setAttribute('aria-selected', active ? 'true' : 'false');
                tab.tabIndex = active ? 0 : -1;
            });
        }

        username.addEventListener('input', syncVoucherPassword);
        tabs.forEach(function (tab, index) {
            tab.addEventListener('click', function () {
                setMode(tab.dataset.mode);
                username.focus();
            });
            tab.addEventListener('keydown', function (event) {
                var nextIndex;
                if (event.key === 'ArrowRight') {
                    nextIndex = (index + 1) % tabs.length;
                } else if (event.key === 'ArrowLeft') {
                    nextIndex = (index - 1 + tabs.length) % tabs.length;
                } else {
                    return;
                }

                event.preventDefault();
                setMode(tabs[nextIndex].dataset.mode);
                tabs[nextIndex].focus();
            });
        });

        setMode(options.defaultMode);

        return {
            getMode: function () {
                return currentMode;
            },
            setMode: setMode,
            syncBeforeSubmit: syncVoucherPassword,
        };
    }

    function initAuth(documentRef) {
        var form = documentRef.querySelector('[data-auth-form]');
        if (!form) {
            return null;
        }

        var controller = createAuthController({
            defaultMode: form.dataset.defaultMode,
            username: documentRef.getElementById('username'),
            password: documentRef.getElementById('password'),
            passwordGroup: documentRef.getElementById('password-group'),
            usernameLabel: documentRef.getElementById('username-label'),
            helper: documentRef.getElementById('auth-helper'),
            tabs: Array.prototype.slice.call(documentRef.querySelectorAll('[data-mode]')),
        });

        form.addEventListener('submit', function () {
            controller.syncBeforeSubmit();
            form.setAttribute('aria-busy', 'true');
        });

        return controller;
    }

    if (typeof document !== 'undefined') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function () {
                root.aulAuth = initAuth(document);
            });
        } else {
            root.aulAuth = initAuth(document);
        }
    }

    return {
        createAuthController: createAuthController,
        initAuth: initAuth,
    };
}));
