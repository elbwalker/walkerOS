"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var w = window;
var destination = {
    config: { custom: { measurementId: '' } },
    init: function (config) {
        var custom = config.custom || {};
        var settings = {};
        // required measuremt id
        if (!custom.measurementId)
            return false;
        // custom transport url
        if (custom.transport_url)
            settings.transport_url = custom.transport_url;
        // Load the gtag script
        if (config.loadScript)
            addScript(custom.measurementId);
        // setup required methods
        w.dataLayer = w.dataLayer || [];
        if (!w.gtag) {
            w.gtag = function gtag() {
                w.dataLayer.push(arguments);
            };
            w.gtag('js', new Date());
        }
        // gtag init call
        w.gtag('config', custom.measurementId, settings);
        return true;
    },
    push: function (event, config, mapping) {
        if (mapping === void 0) { mapping = {}; }
        config = config || {};
        var custom = config.custom || {};
        if (!custom.measurementId)
            return;
        var data = event.data || {};
        data.send_to = custom.measurementId;
        w.gtag('event', event.event, data);
    },
};
function addScript(measurementId, src) {
    if (src === void 0) { src = 'https://www.googletagmanager.com/gtag/js?id='; }
    var script = document.createElement('script');
    script.src = src + measurementId;
    document.head.appendChild(script);
}
exports.default = destination;
