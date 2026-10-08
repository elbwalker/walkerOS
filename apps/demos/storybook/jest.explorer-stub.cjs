// Jest only. Explorer's main entry loads ESM-only highlighters (shiki) that
// jest does not transform. The demo takes only ViewSource and ToggleButton
// from it.
//
// ViewSource adds no data-elb attribute and in its visual mode shows its
// child: all a tag test reads. Its own behaviour is tested in apps/explorer.
// ToggleButton is a plain React atom, so tests get the real one, from
// explorer's source.
const { createElement } = require('react');

exports.ViewSource = ({ children }) =>
  createElement('div', { 'data-view-source': '' }, children);

exports.ToggleButton =
  require('../../explorer/src/components/atoms/toggle-button').ToggleButton;
