// Jest only. Explorer's main entry loads ESM-only highlighters (shiki) that
// jest does not transform. The demo takes only ViewSource from it, which adds
// no data-elb attribute and in its visual mode shows its child: all a tag
// test reads. ViewSource's own behaviour is tested in apps/explorer.
const { createElement } = require('react');

exports.ViewSource = ({ children }) =>
  createElement('div', { 'data-view-source': '' }, children);
