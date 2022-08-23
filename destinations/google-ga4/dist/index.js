"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.destination = void 0;
var w = window;
var measurementId;
exports.destination = {
    config: {},
    init: function () {
        var config = this.config;
        var settings = {};
        // required measuremt id
        if (!config.measurementId)
            return false;
        measurementId = config.measurementId;
        // custom transport url
        if (config.transport_url)
            settings.transport_url = config.transport_url;
        // setup required methods
        w.dataLayer = w.dataLayer || [];
        if (!w.gtag) {
            w.gtag = function gtag() {
                w.dataLayer.push(arguments);
            };
            w.gtag('js', 's');
            // w.gtag('js', new Date());
        }
        // gtag init call
        w.gtag('config', measurementId, settings);
        return true;
    },
    push: function (event) {
        var data = event.data || {};
        data.send_to = measurementId;
        w.gtag('event', "".concat(event.entity, " ").concat(event.action), data);
    },
};
exports.default = exports.destination;
