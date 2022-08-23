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
exports.destination = {
    config: {},
    init: function () {
        window.dataLayer = window.dataLayer || [];
        return true;
    },
    push: function (event) {
        window.dataLayer.push(__assign(__assign({}, event), { walker: true }));
    },
};
exports.default = exports.destination;
