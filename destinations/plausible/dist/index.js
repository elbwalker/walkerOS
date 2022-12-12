"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.destination = void 0;
var w = window;
exports.destination = {
    config: {},
    init: function (config) {
        var custom = config.custom || {};
        if (config.loadScript)
            addScript(custom.domain);
        w.plausible =
            w.plausible ||
                function () {
                    (w.plausible.q = w.plausible.q || []).push(arguments);
                };
        return true;
    },
    push: function (event) {
        w.plausible("".concat(event.event), { props: event.data });
    },
};
function addScript(domain, src) {
    if (src === void 0) { src = 'https://plausible.io/js/script.manual.js'; }
    var script = document.createElement('script');
    script.src = src;
    if (domain)
        script.dataset.domain = domain;
    document.head.appendChild(script);
}
exports.default = exports.destination;
