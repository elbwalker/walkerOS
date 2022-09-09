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
// Globals
var w = window;
var api;
var projectId;
var exclusionParameters;
exports.destination = {
    config: {},
    init: function () {
        var config = this.config;
        // require projectId
        if (!config.projectId)
            return false;
        api = config.api || 'https://moin.p.elbwalkerapis.com/lama';
        projectId = config.projectId;
        exclusionParameters = config.exclusionParameters || [];
        return true;
    },
    push: function (event) {
        var href = excludeParameters(location.href, exclusionParameters);
        var referrer = excludeParameters(document.referrer, exclusionParameters);
        // Custom check for default the page view event with search parameter
        if (event.event === 'page view' && event.data && event.data.search) {
            var origin_1 = location.origin;
            var search = excludeParameters(origin_1 + event.data.search, exclusionParameters);
            event.data.search = search.substring(origin_1.length + 1);
        }
        var payload = __assign(__assign({}, event), { projectId: projectId, source: {
                type: 'web',
                id: href,
                referrer: referrer,
                version: '3',
            } });
        var xhr = new XMLHttpRequest();
        xhr.open('POST', api, true);
        xhr.setRequestHeader('Content-type', 'text/plain; charset=utf-8');
        xhr.send(JSON.stringify(payload));
    },
};
function excludeParameters(href, exclusionParameters) {
    if (!exclusionParameters.length)
        return href;
    try {
        var url = new URL(href);
        var searchParams_1 = url.searchParams;
        exclusionParameters.map(function (parameter) {
            if (searchParams_1.has(parameter))
                searchParams_1.set(parameter, 'xxx');
        });
        url.search = searchParams_1.toString();
        return url.toString();
    }
    catch (e) {
        return '';
    }
}
exports.default = exports.destination;
