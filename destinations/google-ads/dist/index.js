"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.destination = void 0;
var w = window;
exports.destination = {
    config: { custom: {} },
    init: function () {
        var config = this.config;
        var custom = config.custom;
        // required measuremt id
        if (!custom.conversionId)
            return false;
        // Default currency value
        custom.currency = custom.currency || 'EUR';
        if (config.loadScript)
            addScript(custom.conversionId);
        w.dataLayer = w.dataLayer || [];
        if (!w.gtag) {
            w.gtag = function gtag() {
                w.dataLayer.push(arguments);
            };
            w.gtag('js', new Date());
        }
        // gtag init call
        w.gtag('config', custom.conversionId);
        return true;
    },
    push: function (event, mapping) {
        if (mapping === void 0) { mapping = {}; }
        if (!mapping.label)
            return;
        var custom = this.config.custom;
        // Basic conversion parameters
        var eventParams = {
            send_to: "".concat(custom.conversionId, "/").concat(mapping.label),
            currency: custom.currency,
        };
        // value
        if (mapping.value)
            eventParams.value = event.data[mapping.value];
        // default value
        if (custom.defaultValue && !eventParams.value)
            eventParams.value = custom.defaultValue;
        // transaction_id
        if (mapping.id)
            eventParams.transaction_id = event.data[mapping.id];
        w.gtag('event', 'conversion', eventParams);
    },
};
function addScript(conversionId, src) {
    if (src === void 0) { src = 'https://www.googletagmanager.com/gtag/js?id='; }
    var script = document.createElement('script');
    script.src = src + conversionId;
    document.head.appendChild(script);
}
exports.default = exports.destination;
