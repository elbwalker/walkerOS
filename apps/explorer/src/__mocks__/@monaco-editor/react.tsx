import React from 'react';

export const Editor = ({ value, onChange }: any) => (
  <textarea
    data-testid="monaco-editor"
    value={value}
    onChange={(e) => onChange?.(e.target.value)}
    readOnly={!onChange}
  />
);

export default Editor;
