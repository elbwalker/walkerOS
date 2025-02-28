import { isString } from '@elbwalker/utils';
import { Highlight, themes as prismThemes } from 'prism-react-renderer';
import Editor from 'react-simple-code-editor';

interface FormatValueProps {
  intent?: number;
  quotes?: boolean;
}

export const formatValue = (value: unknown, options: FormatValueProps = {}) => {
  const { intent = 2, quotes = false } = options;

  let str = isString(value)
    ? quotes
      ? `"${value}"`
      : value
    : JSON.stringify(value, null, 2);

  if (intent === 0)
    str = str
      .replace(/([:,])\s*(?=\S)/g, '$1 ')
      .replace(/{\s*/, '{ ')
      .replace(/\s*}/, ' }');

  str = str.replace(/"([^"]+)":/g, '$1:'); // Remove quotes from keys

  return str;
};

export const parseInput = (code: unknown): unknown => {
  return Function('"use strict"; return (' + code + ')')();
};

interface CodeBoxProps {
  value: string;
  label?: string;
  onChange?: (code: string) => void;
  disabled?: boolean;
  language?: string;
  inline?: boolean;
  className?: string;
  height?: number;
}

const CodeBox: React.FC<CodeBoxProps> = ({
  value = '',
  label,
  onChange,
  disabled = false,
  language = 'javascript',
  className = '',
  height,
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
      className={`border border-base-300 rounded-lg overflow-hidden bg-gray-800 text-sm ${className}`}
      style={height && { height: `${height}` }}
    >
      {label && (
        <div className="font-bold px-2 py-1 bg-base-100 text-base">{label}</div>
      )}
      <div className="flex-1 overflow-auto">
        <Editor
          value={value}
          disabled={disabled}
          onValueChange={(newCode) => onChange?.(newCode)}
          highlight={highlightCode}
          padding={4}
          className="code-editor font-mono min-h-full"
          style={{ overflow: 'auto' }}
        />
      </div>
    </div>
  );
};

export default CodeBox;
