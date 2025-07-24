declare module 'react-simple-code-editor' {
  import React from 'react';

  interface EditorProps {
    value: string;
    onValueChange: (code: string) => void;
    highlight: (code: string) => React.ReactNode;
    padding?: number;
    style?: React.CSSProperties;
    className?: string;
    disabled?: boolean;
  }

  const Editor: React.FC<EditorProps>;
  export default Editor;
}
