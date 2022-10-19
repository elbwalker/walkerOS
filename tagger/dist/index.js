"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function Tagger(config) {
    if (config === void 0) { config = {}; }
    var instance = {
        config: {
            prefix: config.prefix || "data-elb" /* IElbwalker.Commands.Prefix */,
        },
        entity: entity,
        action: action,
        property: property,
        context: context,
        globals: globals,
    };
    // entity("promotion") -> data-elb="promotion"
    function entity(name) {
        var _a;
        return _a = {}, _a[attrName()] = name, _a;
    }
    // action("visible", "view") -> data-elbaction="visible:view"
    function action(trigger, action) {
        var _a;
        action = action || trigger;
        return _a = {},
            _a[attrName("action" /* IElbwalker.Commands.Action */, false)] = trigger + ':' + action,
            _a;
    }
    // property("promotion", "category", "analytics") -> data-elb-promotion="category:analytics"
    function property(entity, property, value) {
        var _a;
        return _a = {}, _a[attrName(entity)] = property + ':' + value, _a;
    }
    // context("test", "engagement") -> data-elbcontext="test:engagement"
    function context(property, value) {
        var _a;
        return _a = {},
            _a[attrName("context" /* IElbwalker.Commands.Context */, false)] = property + ':' + value,
            _a;
    }
    // globals("language", "en") -> data-elbglobals="language:en"
    function globals(property, value) {
        var _a;
        return _a = {},
            _a[attrName("globals" /* IElbwalker.Commands.Globals */, false)] = property + ':' + value,
            _a;
    }
    function attrName(name, isProperty) {
        if (isProperty === void 0) { isProperty = true; }
        var separator = isProperty ? '-' : '';
        name = name ? separator + name : '';
        return instance.config.prefix + name;
    }
    return instance;
}
exports.default = Tagger;
