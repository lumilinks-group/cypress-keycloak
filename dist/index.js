'use strict';

function createUUID() {
    var s = [];
    var hexDigits = '0123456789abcdef';
    for (var i = 0; i < 36; i++) {
        s[i] = hexDigits.substr(Math.floor(Math.random() * 0x10), 1);
    }
    s[14] = '4';
    s[19] = hexDigits.substr((parseInt(s[19]) & 0x3) | 0x8, 1);
    s[8] = s[13] = s[18] = s[23] = '-';
    return s.join('');
}

Cypress.Commands.add('login', function (_a) {
    var root = _a.root, realm = _a.realm, username = _a.username, password = _a.password, client_id = _a.client_id, redirect_uri = _a.redirect_uri, _b = _a.path_prefix, path_prefix = _b === void 0 ? 'auth' : _b, kc_idp_hint = _a.kc_idp_hint;
    return cy
        .request({
        url: "" + root + (path_prefix ? "/" + path_prefix : '') + "/realms/" + realm + "/protocol/openid-connect/auth",
        qs: {
            client_id: client_id,
            redirect_uri: redirect_uri,
            kc_idp_hint: kc_idp_hint,
            scope: 'openid',
            state: createUUID(),
            nonce: createUUID(),
            response_type: 'code',
            response_mode: 'fragment',
        },
    })
        .then(function (response) {
        var html = document.createElement('html');
        html.innerHTML = response.body;
        var form = html.getElementsByTagName('form');
        var isAuthorized = !form.length;
        if (!isAuthorized)
            return cy.request({
                form: true,
                method: 'POST',
                url: form[0].action,
                followRedirect: false,
                body: {
                    username: username,
                    password: password,
                },
            });
    });
});

Cypress.Commands.add('loginOTP', function (_a) {
    var root = _a.root, realm = _a.realm, username = _a.username, password = _a.password, client_id = _a.client_id, redirect_uri = _a.redirect_uri, _b = _a.path_prefix, path_prefix = _b === void 0 ? 'auth' : _b, otp_secret = _a.otp_secret, _c = _a.otp_credential_id, otp_credential_id = _c === void 0 ? null : _c, kc_idp_hint = _a.kc_idp_hint;
    return cy
        .request({
        url: root + "/" + path_prefix + "/realms/" + realm + "/protocol/openid-connect/auth",
        qs: {
            client_id: client_id,
            redirect_uri: redirect_uri,
            kc_idp_hint: kc_idp_hint,
            scope: 'openid',
            state: createUUID(),
            nonce: createUUID(),
            response_type: 'code',
            response_mode: 'fragment',
        },
    })
        .then(function (loginResponse) {
        var html = document.createElement('html');
        html.innerHTML = loginResponse.body;
        var form = html.getElementsByTagName('form');
        var isAuthorized = !form.length;
        if (!isAuthorized) {
            return cy
                .request({
                form: true,
                method: 'POST',
                url: form[0].action,
                followRedirect: false,
                body: {
                    username: username,
                    password: password,
                },
            })
                .then(function (otpResponse) {
                var html = document.createElement('html');
                html.innerHTML = otpResponse.body;
                var form = html.getElementsByTagName('form');
                cy.task('generateOTP', otp_secret, { log: false }).then(function (otp) {
                    var body = { otp: otp };
                    if (otp_credential_id) {
                        body.selectedCredentialId = otp_credential_id;
                    }
                    cy.request({
                        form: true,
                        method: 'POST',
                        url: form[0].action,
                        followRedirect: false,
                        body: body,
                    });
                });
            });
        }
    });
});

Cypress.Commands.add('loginHID', function (_a) {
    var root = _a.root, realm = _a.realm, username = _a.username, password = _a.password, client_id = _a.client_id, redirect_uri = _a.redirect_uri, _b = _a.path_prefix, path_prefix = _b === void 0 ? 'auth' : _b, kc_idp_hint = _a.kc_idp_hint;
    return cy
        .request({
        url: "" + root + (path_prefix ? "/" + path_prefix : '') + "/realms/" + realm + "/protocol/openid-connect/auth",
        qs: {
            client_id: client_id,
            redirect_uri: redirect_uri,
            kc_idp_hint: kc_idp_hint,
            scope: 'openid',
            state: createUUID(),
            nonce: createUUID(),
            response_type: 'code',
            response_mode: 'fragment',
        },
    })
        .then(function (response) {
        var html = document.createElement('html');
        html.innerHTML = response.body;
        var form = html.getElementsByTagName('form');
        var isAuthorized = !form.length;
        if (!isAuthorized)
            return cy.request({
                form: true,
                method: 'POST',
                url: form[0].action,
                followRedirect: false,
                body: {
                    username: username,
                },
            }).then(function (response) {
                var html = document.createElement('html');
                html.innerHTML = response.body;
                var form = html.getElementsByTagName('form');
                return cy.request({
                    method: "POST",
                    url: form[0].action,
                    followRedirect: false,
                    form: true,
                    body: {
                        credentialId: "",
                        password: password
                    }
                });
            });
    });
});

Cypress.Commands.add('logout', function (_a) {
    var root = _a.root, realm = _a.realm, redirect_uri = _a.redirect_uri, post_logout_redirect_uri = _a.post_logout_redirect_uri, id_token_hint = _a.id_token_hint, _b = _a.path_prefix, path_prefix = _b === void 0 ? 'auth' : _b;
    var qs = post_logout_redirect_uri
        ? { post_logout_redirect_uri: post_logout_redirect_uri, id_token_hint: id_token_hint }
        : { redirect_uri: redirect_uri };
    if (post_logout_redirect_uri && id_token_hint) {
        qs.id_token_hint = id_token_hint;
    }
    return cy
        .request({
        qs: qs,
        url: "" + root + (path_prefix ? "/" + path_prefix : '') + "/realms/" + realm + "/protocol/openid-connect/logout",
    })
        .then(function (response) {
        var html = document.createElement('html');
        html.innerHTML = response.body;
        var contentArea = html.getElementsByClassName('content-area')[0];
        if (contentArea === undefined ||
            contentArea.id !== 'kc-logout-confirm') {
            return;
        }
        var form = contentArea.getElementsByTagName('form')[0];
        var url = "" + root + form.getAttribute('action');
        var inputs = form.getElementsByTagName('input');
        var body = {};
        for (var _i = 0, _a = Array.prototype.slice.call(inputs); _i < _a.length; _i++) {
            var input = _a[_i];
            body[input.name] = input.value;
        }
        return cy.request({
            url: url,
            method: 'POST',
            body: body,
            form: true,
        });
    });
});
