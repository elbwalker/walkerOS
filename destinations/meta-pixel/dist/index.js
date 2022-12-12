"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.destination = void 0;
var w = window;
// https://developers.facebook.com/docs/meta-pixel/
exports.destination = {
    config: { custom: { pixelId: '' } },
    init: function (config) {
        var custom = config.custom || {};
        // load fbevents.js
        if (config.loadScript)
            addScript();
        // required pixel id
        if (!custom.pixelId)
            return false;
        // fbq function setup
        setup();
        w.fbq('init', custom.pixelId);
        // PageView event (deactivate actively)
        if (custom.pageview !== false)
            w.fbq('track', 'PageView');
        return true;
    },
    push: function (event, config, mapping) {
        if (mapping === void 0) { mapping = {}; }
        config = config || {};
        var custom = config.custom || {};
        // Standard events
        if (mapping.track) {
            var parameters = getParameters(mapping.track, event, mapping, custom.currency);
            w.fbq('track', mapping.track, parameters);
        }
        else {
            // Custom events
            w.fbq('trackCustom', event.event);
        }
    },
};
function setup() {
    if (w.fbq)
        return;
    var n = (w.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    });
    if (!w._fbq)
        w._fbq = n;
    n.push = n;
    n.loaded = !0;
    n.version = '2.0';
    n.queue = [];
}
function getParameters(track, event, mapping, currency) {
    if (currency === void 0) { currency = 'EUR'; }
    var value = mapping.value ? event.data[mapping.value] : 1;
    var content_name = mapping.name ? event.data[mapping.name] : '';
    if (track === 'AddPaymentInfo') {
        var parameters_1 = {
            currency: currency,
            value: value,
        };
        return parameters_1;
    }
    if (track === 'AddToCart') {
        var parameters_2 = {
            content_name: content_name,
            currency: currency,
            value: value,
        };
        return parameters_2;
    }
    if (track === 'AddToWishlist') {
        var parameters_3 = {
            content_name: content_name,
        };
        return parameters_3;
    }
    if (track === 'CompleteRegistration') {
        var parameters_4 = {
            content_name: content_name,
            currency: currency,
        };
        return parameters_4;
    }
    if (track === 'InitiateCheckout') {
        var parameters_5 = {
            currency: currency,
            value: value,
        };
        return parameters_5;
    }
    if (track === 'Lead') {
        var parameters_6 = {
            content_name: content_name,
            currency: currency,
        };
        return parameters_6;
    }
    if (track === 'Purchase') {
        var parameters_7 = {
            content_name: content_name,
            value: value || 1,
            currency: currency,
        };
        return parameters_7;
    }
    if (track === 'Search') {
        var parameters_8 = { currency: currency, value: value };
        return parameters_8;
    }
    if (track === 'StartTrial') {
        var parameters_9 = {
            currency: currency,
            value: value,
        };
        return parameters_9;
    }
    if (track === 'Subscribe') {
        var parameters_10 = {
            currency: currency,
            value: value,
        };
        return parameters_10;
    }
    if (track === 'ViewContent') {
        var parameters_11 = {
            content_name: content_name,
            currency: currency,
            value: value,
        };
        return parameters_11;
    }
    // Contact, CustomizeProduct, Donate, FindLocation, Schedule, SubmitApplication
    var parameters = {};
    return parameters;
}
function addScript(src) {
    if (src === void 0) { src = 'https://connect.facebook.net/en_US/fbevents.js'; }
    var script = document.createElement('script');
    script.src = src;
    script.async = true;
    document.head.appendChild(script);
}
exports.default = exports.destination;
