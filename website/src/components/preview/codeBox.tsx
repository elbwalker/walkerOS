import { Highlight, themes as prismThemes } from 'prism-react-renderer';
import Editor from 'react-simple-code-editor';
import { isObject, tryCatch } from '@elbwalker/utils';

interface FormatValueProps {
  intent?: number;
  quotes?: boolean;
}

export const formatValue = (value: unknown, options: FormatValueProps = {}) => {
  const { intent = 2, quotes = false } = options;

  let str = isObject(value)
    ? JSON.stringify(value, null, intent)
    : String(value).trim();

  if (intent === 0)
    str = str
      .replace(/([:,])\s*(?=\S)/g, '$1 ')
      .replace(/{\s*/, '{ ')
      .replace(/\s*}/, ' }');
  if (!quotes) str = str.replace(/"([^"]+)":/g, '$1:'); // Remove quotes from keys

  return str;
};

interface CodeBoxProps {
  label: string;
  value: string;
  format?: FormatValueProps;
  onChange?: (code: string) => void;
  disabled?: boolean;
  language?: string;
  widthClass?: string;
}

const CodeBox: React.FC<CodeBoxProps> = ({
  label,
  value = '',
  format,
  onChange,
  disabled = false,
  language = 'javascript',
  widthClass = 'w-1/3',
}) => {
  const prettyValue = formatValue(tryCatch(JSON.parse)(value) || value, format);

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
      {label && <div className="font-bold px-2 py-1">{label}</div>}
      <div className="flex-1 overflow-auto rounded-lg">
        <Editor
          value={prettyValue}
          disabled={disabled}
          onValueChange={(newCode) => onChange?.(newCode)}
          highlight={highlightCode}
          padding={4}
          style={{
            fontFamily: '"Fira Code", monospace',
            fontSize: 12,
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
