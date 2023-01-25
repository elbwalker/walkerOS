"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.destination = void 0;
var w = window;
exports.destination = {
    config: {},
    init: function (config) {
        // Do something initializing
        return true;
    },
    push: function (event, config, mapping) {
        if (config === void 0) { config = {}; }
        if (mapping === void 0) { mapping = {}; }
        var custom = config.custom || {};
        if (!custom.url)
            return;
        var data = JSON.stringify(event);
        switch (custom.transport) {
            case 'xhr':
                sendAsXhr(data, custom.url);
                break;
            case 'fetch':
            default:
                sendAsFetch(data, custom.url);
                break;
        }
    },
};
function sendAsFetch(data, url) {
    fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        keepalive: true,
        body: data,
    });
}
function sendAsXhr(data, url) {
    var xhr = new XMLHttpRequest();
    xhr.open('POST', url, true);
    xhr.setRequestHeader('Content-type', 'text/plain; charset=utf-8');
    xhr.send(data);
}
exports.default = exports.destination;
