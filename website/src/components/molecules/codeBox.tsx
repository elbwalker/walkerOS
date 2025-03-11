import { WalkerOS } from '@elbwalker/types';
import { isString, isDefined, tryCatch, tryCatchAsync } from '@elbwalker/utils';
import { Highlight, themes as prismThemes } from 'prism-react-renderer';
import Editor from 'react-simple-code-editor';
import { useState } from 'react';
import * as prettier from 'prettier/standalone';
import * as parserBabel from 'prettier/parser-babel';
import estree from 'prettier/plugins/estree';
import { ObjectInspector, chromeDark } from 'react-inspector';

interface FormatValueProps {
  intent?: number;
  quotes?: boolean;
}

export const formatValue = (value: unknown, options: FormatValueProps = {}) => {
  if (!isDefined(value)) return;

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

export const parseInput = (
  code: unknown,
  scope: WalkerOS.AnyObject = {},
  ...args: unknown[]
) => {
  return new Function(...Object.keys(scope), `"use strict"; return ${code}`)(
    ...Object.values(scope), // Scope as arguments
    ...args,
  );
};

interface CodeBoxProps {
  value: string;
  label?: string;
  onChange?: (code: string) => void;
  disabled?: boolean;
  language?: string;
  inline?: boolean;
  className?: string;
  smallText?: boolean;
  isConsole?: boolean;
  onReset?: () => void;
  showReset?: boolean;
}

const CodeBox: React.FC<CodeBoxProps> = ({
  value = '',
  label,
  onChange,
  disabled = false,
  language = 'javascript',
  className = '',
  smallText = false,
  isConsole = false,
  onReset,
  showReset = false,
}) => {
  const [copied, setCopied] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isFormatHovered, setIsFormatHovered] = useState(false);
  const [isResetHovered, setIsResetHovered] = useState(false);
  const isEditable = onChange && !disabled;

  const handleCopy = async () => {
    tryCatch(async () => {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    })();
  };

  const handleFormat = tryCatchAsync(async () => {
    const formattedValue = await prettier.format(value, {
      parser: language === 'html' ? 'html' : 'babel',
      plugins: [parserBabel, estree],
      semi: true,
      singleQuote: true,
      trailingComma: 'es5',
      printWidth: 80,
      tabWidth: 2,
      useTabs: false,
    });

    onChange?.(formattedValue);
  });

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

  const consoleTheme = {
    ...chromeDark,
    ...{
      BASE_BACKGROUND_COLOR: 'transparent',
      TREENODE_FONT_SIZE: '14px',
      OBJECT_NAME_COLOR: '#01b5e2',
      OBJECT_VALUE_STRING_COLOR: '#01b5e2',
    },
  } as unknown as string;

  const renderContent = () => {
    if (isConsole) {
      try {
        const parsedValue = value === 'No events yet.' ? [] : JSON.parse(value);
        return (
          <div className="p-4 max-h-full overflow-auto">
            {value === 'No events yet.' ? (
              <div className="text-gray-500">No events yet.</div>
            ) : (
              <ObjectInspector
                data={parsedValue}
                theme={consoleTheme}
                expandLevel={3}
                expandPaths={['$', '$.data']}
              />
            )}
          </div>
        );
      } catch (e) {
        return (
          <div className="p-4 text-red-500">Error parsing console data: {String(e)}</div>
        );
      }
    }

    return (
      <Editor
        value={value}
        disabled={disabled}
        onValueChange={(newCode) => onChange?.(newCode)}
        highlight={highlightCode}
        padding={4}
        className="code-editor font-mono min-h-full"
        style={{ overflow: 'auto' }}
      />
    );
  };

  return (
    <div
      className={`flex-1 flex flex-col border border-base-300 rounded-lg overflow-hidden bg-gray-800 relative ${
        smallText ? 'text-xs' : 'text-sm'
      } ${className}`}
    >
      {label && (
        <div className="font-bold px-2 py-1 bg-base-100 text-base flex justify-between items-center">
          <span>{label}</span>
          <div className="relative">
            <div className="relative flex items-center gap-1">
              {showReset && onReset && (
                <div className="relative">
                  <button
                    onClick={onReset}
                    onMouseEnter={() => setIsResetHovered(true)}
                    onMouseLeave={() => setIsResetHovered(false)}
                    className="text-gray-500 hover:text-gray-300 transition-colors border-none bg-transparent p-1"
                    aria-label="Reset content"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                  </button>
                  {isResetHovered && (
                    <div className="absolute right-full mr-1 top-1/2 -translate-y-1/2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs py-1 px-1 rounded shadow-sm border border-gray-200 dark:border-gray-600 whitespace-nowrap">
                      Reset
                    </div>
                  )}
                </div>
              )}
              {!isConsole && (
                <div className="relative">
                  <button
                    onClick={handleFormat}
                    onMouseEnter={() => setIsFormatHovered(true)}
                    onMouseLeave={() => setIsFormatHovered(false)}
                    className="text-gray-500 hover:text-gray-300 transition-colors border-none bg-transparent p-1"
                    aria-label="Format code"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 6h16M4 12h16m-7 6h7"
                      />
                    </svg>
                  </button>
                  {isFormatHovered && (
                    <div className="absolute right-full mr-1 top-1/2 -translate-y-1/2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs py-1 px-1 rounded shadow-sm border border-gray-200 dark:border-gray-600 whitespace-nowrap">
                      Format
                    </div>
                  )}
                </div>
              )}
              <div className="relative">
                <button
                  onClick={handleCopy}
                  onMouseEnter={() => setIsHovered(true)}
                  onMouseLeave={() => setIsHovered(false)}
                  className="text-gray-500 hover:text-gray-300 transition-colors border-none bg-transparent p-1"
                  aria-label="Copy code"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                </button>
                {(isHovered || copied) && (
                  <div className="absolute right-full mr-1 top-1/2 -translate-y-1/2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs py-1 px-1 rounded shadow-sm border border-gray-200 dark:border-gray-600 whitespace-nowrap">
                    {copied ? 'Copied!' : 'Copy'}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="flex-1 overflow-auto">
        {isEditable && !isConsole && (
          <div className="absolute bottom-2 right-2 text-gray-500">
            <svg
              className="w-5 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
              />
            </svg>
          </div>
        )}
        {renderContent()}
      </div>
    </div>
  );
};

export default CodeBox;
