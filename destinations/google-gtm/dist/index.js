"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.destination = void 0;
var defaultDataLayer = 'dataLayer';
var defaultDomain = 'https://www.googletagmanager.com/gtm.js?id=';
exports.destination = {
    config: {},
    init: function (config) {
        config.custom = config.custom || {};
        var dataLayer = config.custom.dataLayer || defaultDataLayer;
        window[dataLayer] = window[dataLayer] || [];
        window[dataLayer].push({
            'gtm.start': new Date().getTime(),
            event: 'gtm.js',
        });
        // Load the gtm script and container
        if (config.loadScript && config.custom.containerId)
            addScript(config.custom.containerId, config.custom.domain || defaultDomain, dataLayer);
        return true;
    },
    push: function (event) {
        window.dataLayer.push(__assign(__assign({}, event), { walker: true }));
    },
};
function addScript(containerId, src, dataLayerName) {
    var dl = dataLayerName != defaultDataLayer ? '&l=' + dataLayerName : '';
    var script = document.createElement('script');
    script.src = src + containerId + dl;
    document.head.appendChild(script);
}
exports.default = exports.destination;
