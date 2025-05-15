import React from 'react';
import { Highlight, themes } from 'prism-react-renderer';

interface SyntaxHighlighterProps {
  code: string;
  language?: string;
}

const SyntaxHighlighter: React.FC<SyntaxHighlighterProps> = ({
  code,
  language = 'html',
}) => {
  return (
    <Highlight theme={themes.palenight} code={code} language={language}>
      {({ tokens, getLineProps, getTokenProps }) => {
        return (
          <>
            {tokens.map((line, i) => {
              // Track the data-elb attribute state for each line
              let isProcessingElbAttribute = false;
              let isProcessingElbDash = false;

              return (
                <div {...getLineProps({ line, key: i })} key={i}>
                  {line.map((token, key) => {
                    const tokenProps = getTokenProps({ token, key });

                    // Check for the start of data-elb or data-elbaction
                    // Handle cases where 'data' might be part of a larger token
                    const hasDataToken = token.content.includes('data');
                    if (hasDataToken) {
                      const nextToken = line[key + 1]?.content;
                      const nextNextToken = line[key + 2]?.content;

                      // If this is a combined token (e.g. 'div data')
                      if (
                        token.content !== 'data' &&
                        token.content !== ' data'
                      ) {
                        // Check if the next parts form the attribute
                        if (
                          nextToken === '-' &&
                          nextNextToken?.startsWith('elb')
                        ) {
                          isProcessingElbAttribute = true;

                          // Split and render the combined token
                          const parts = token.content.split('data');
                          return (
                            <React.Fragment key={key}>
                              <span style={tokenProps.style}>{parts[0]}</span>
                              <span
                                className={`${tokenProps.className} elb-attribute text-elbwalker font-bold`}
                              >
                                data
                              </span>
                            </React.Fragment>
                          );
                        }
                      } else if (
                        nextToken === '-' &&
                        nextNextToken?.startsWith('elb')
                      ) {
                        isProcessingElbAttribute = true;
                      }
                    }

                    // Handle the rest of the attribute parts
                    if (
                      isProcessingElbAttribute &&
                      (token.content === '-' || token.content.startsWith('elb'))
                    ) {
                      // Set flag when we see elb- to highlight what follows
                      if (token.content === 'elb-') {
                        isProcessingElbDash = true;
                      } else if (token.content.startsWith('elb-')) {
                        // Handle case where elb-promotion is one token
                        isProcessingElbDash = true;
                      } else if (token.content === 'elb') {
                        const nextToken = line[key + 1]?.content;
                        if (nextToken === '-') {
                          isProcessingElbDash = true;
                        }
                      }

                      if (
                        token.content === '=' ||
                        token.content.includes('=')
                      ) {
                        isProcessingElbAttribute = false;
                        isProcessingElbDash = false;
                      }

                      return (
                        <span
                          {...tokenProps}
                          key={key}
                          className={`${tokenProps.className} elb-attribute text-elbwalker font-bold`}
                        />
                      );
                    }

                    // Handle the promotion part after elb-
                    if (
                      isProcessingElbDash &&
                      token.content !== '=' &&
                      !token.content.includes('=')
                    ) {
                      return (
                        <span
                          {...tokenProps}
                          key={key}
                          className={`${tokenProps.className} elb-attribute text-elbwalker font-bold`}
                        />
                      );
                    }

                    // Reset state when we hit equals
                    if (token.content === '=' || token.content.includes('=')) {
                      isProcessingElbAttribute = false;
                      isProcessingElbDash = false;
                    }

                    return <span {...tokenProps} key={key} />;
                  })}
                </div>
              );
            })}
          </>
        );
      }}
    </Highlight>
  );
};

export default SyntaxHighlighter;
