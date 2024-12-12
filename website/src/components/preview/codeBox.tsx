import { Highlight, themes as prismThemes } from 'prism-react-renderer';
import Editor from 'react-simple-code-editor';

interface CodeBoxProps {
  label: string;
  value: string;
  onChange?: (code: string) => void;
  disabled?: boolean;
  language?: string;
  widthClass?: string;
}

const CodeBox: React.FC<CodeBoxProps> = ({
  label,
  value,
  onChange,
  disabled = false,
  language = 'javascript',
  widthClass = 'w-1/3',
}) => {
  const highlightCode = (code: string) => (
    <Highlight theme={prismThemes.palenight} code={code} language={language}>
      {({ tokens, getLineProps, getTokenProps }) => (
        <>
          {tokens.map((line, i) => (
            <div {...getLineProps({ line, key: i })} key={i}>
              {line.map((token, key) => (
                <span {...getTokenProps({ token, key })} key={key} />
              ))}
            </div>
          ))}
        </>
      )}
    </Highlight>
  );

  return (
    <div
      className={`${widthClass} border border-base-300 overflow-hidden flex flex-col`}
    >
      <div className="border-b border-base-300 px-2 py-1 text-center">
        {label}
      </div>
      <div className="flex-1 overflow-auto">
        <Editor
          value={value}
          disabled={disabled}
          onValueChange={onChange}
          highlight={highlightCode}
          padding={10}
          style={{
            fontFamily: '"Fira Code", monospace',
            fontSize: 14,
            backgroundColor: '#282c34',
            color: '#abb2bf',
            minHeight: '100%',
            outline: 'none',
            overflow: 'auto',
          }}
          className="code-editor"
        />
      </div>
    </div>
  );
};

export default CodeBox;
