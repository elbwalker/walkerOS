"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var w = window;
var destination = {
    config: { custom: { measurementId: '' } },
    init: function () {
        var config = this.config;
        var settings = {};
        // required measuremt id
        if (!config.custom.measurementId)
            return false;
        // custom transport url
        if (config.custom.transport_url)
            settings.transport_url = config.custom.transport_url;
        // Load the gtag script
        if (config.loadScript)
            addScript(config.custom.measurementId);
        // setup required methods
        w.dataLayer = w.dataLayer || [];
        if (!w.gtag) {
            w.gtag = function gtag() {
                w.dataLayer.push(arguments);
            };
            w.gtag('js', new Date());
        }
        // gtag init call
        w.gtag('config', config.custom.measurementId, settings);
        return true;
    },
    push: function (event, mapping) {
        if (mapping === void 0) { mapping = {}; }
        var data = event.data || {};
        data.send_to = this.config.custom.measurementId;
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
