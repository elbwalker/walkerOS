import type { WalkerOS } from '@elbwalker/types';
import { isString, isDefined, tryCatch, tryCatchAsync } from '@elbwalker/utils';
import Editor from 'react-simple-code-editor';
import { useState, useEffect, useRef } from 'react';
import * as prettier from 'prettier/standalone';
import * as parserBabel from 'prettier/parser-babel';
import estree from 'prettier/plugins/estree';
import {
  simulateEdits,
  TypewriterOptions,
  pauseTypewriter,
  resetTypewriter,
} from '@site/src/components/molecules/typewriterCode';
import SyntaxHighlighter from '@site/src/components/molecules/syntaxHighlighter';

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
  typewriter?: TypewriterOptions;
  autoStart?: boolean;
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
  typewriter,
  autoStart = true,
}) => {
  const [copied, setCopied] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isFormatHovered, setIsFormatHovered] = useState(false);
  const [isResetHovered, setIsResetHovered] = useState(false);
  const [isPauseHovered, setIsPauseHovered] = useState(false);
  const [currentValue, setCurrentValue] = useState(value);
  const [isPaused, setIsPaused] = useState(false);
  const latestValueRef = useRef(value);
  const initialValueRef = useRef(value);
  const isEditable = onChange && !disabled;

  // Update ref when value changes
  useEffect(() => {
    latestValueRef.current = value;
  }, [value]);

  // Handle typewriter edits
  useEffect(() => {
    if (typewriter && autoStart && !isPaused) {
      const cleanup = simulateEdits(
        latestValueRef.current,
        typewriter,
        (newValue) => {
          setCurrentValue(newValue);
          onChange?.(newValue);
        },
      );
      return cleanup;
    } else {
      if (isConsole && value !== 'No events yet.') {
        handleFormat(value, setCurrentValue);
      } else {
        setCurrentValue(value);
      }
    }
  }, [value, typewriter, onChange, autoStart, isPaused, isConsole]);

  const handleCopy = async () => {
    tryCatch(async () => {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    })();
  };

  const handleFormat = tryCatchAsync(
    async (value: string, onChangeHandler: (code: string) => void) => {
      // Check if the content is a complete statement
      const isCompleteStatement = /^[a-zA-Z_$][a-zA-Z0-9_$]*\s*=/.test(
        value.trim(),
      );

      // If it's not a complete statement, wrap it in a return statement
      const contentToFormat = isCompleteStatement ? value : `return ${value}`;

      const formattedValue = await prettier.format(contentToFormat, {
        parser: language === 'html' ? 'html' : 'babel',
        plugins: [parserBabel, estree],
        semi: false,
        singleQuote: true,
        trailingComma: 'es5',
        printWidth: 80,
        tabWidth: 2,
        useTabs: false,
      });

      const finalValue = isCompleteStatement
        ? formattedValue
        : formattedValue.replace(/^return\s+/, '').replace(/[\r\n]+$/, '');

      onChangeHandler?.(finalValue);
    },
  );

  const handleFormatClick = () => {
    handleFormat(value, onChange);
  };

  const handlePauseResume = () => {
    if (isPaused) {
      // Play button clicked - reset and start animation from beginning
      resetTypewriter();
      setCurrentValue(initialValueRef.current);
      setIsPaused(false);
      simulateEdits(initialValueRef.current, typewriter, (newValue) => {
        setCurrentValue(newValue);
        onChange?.(newValue);
      });
    } else {
      // Stop button clicked - just stop animation
      pauseTypewriter();
      setIsPaused(true);
    }
  };

  const highlightCode = (code: string) => (
    <SyntaxHighlighter code={code} language={language} />
  );

  const renderContent = () => {
    return (
      <Editor
        value={currentValue}
        disabled={disabled}
        onValueChange={(newCode) => {
          setCurrentValue(newCode);
          onChange?.(newCode);
        }}
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
              {typewriter && (
                <div className="relative">
                  <button
                    onClick={handlePauseResume}
                    onMouseEnter={() => setIsPauseHovered(true)}
                    onMouseLeave={() => setIsPauseHovered(false)}
                    className="text-gray-500 hover:text-gray-300 transition-colors border-none bg-transparent p-1"
                    aria-label={isPaused ? 'Play animation' : 'Stop animation'}
                  >
                    {isPaused ? (
                      <svg
                        className="w-4 h-4"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    ) : (
                      <svg
                        className="w-4 h-4"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M6 6h12v12H6z" />
                      </svg>
                    )}
                  </button>
                  {isPauseHovered && (
                    <div className="absolute right-full mr-1 top-1/2 -translate-y-1/2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs py-1 px-1 rounded-sm shadow-xs border border-gray-200 dark:border-gray-600 whitespace-nowrap">
                      {isPaused ? 'Play' : 'Stop'}
                    </div>
                  )}
                </div>
              )}
              {showReset && onReset && (
                <div className="relative">
                  <button
                    onClick={() => {
                      setCurrentValue(initialValueRef.current);
                      pauseTypewriter();
                      setIsPaused(true);
                      onReset?.();
                    }}
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
                    <div className="absolute right-full mr-1 top-1/2 -translate-y-1/2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs py-1 px-1 rounded-sm shadow-xs border border-gray-200 dark:border-gray-600 whitespace-nowrap">
                      Reset
                    </div>
                  )}
                </div>
              )}
              {!isConsole && (
                <div className="relative">
                  <button
                    onClick={handleFormatClick}
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
                    <div className="absolute right-full mr-1 top-1/2 -translate-y-1/2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs py-1 px-1 rounded-sm shadow-xs border border-gray-200 dark:border-gray-600 whitespace-nowrap">
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
                  <div className="absolute right-full mr-1 top-1/2 -translate-y-1/2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs py-1 px-1 rounded-sm shadow-xs border border-gray-200 dark:border-gray-600 whitespace-nowrap">
                    {copied ? 'Copied!' : 'Copy'}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="flex-1 overflow-auto">
        {isEditable && (
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
