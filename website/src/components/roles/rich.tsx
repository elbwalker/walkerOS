import React from 'react';

const TOKEN = /(`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
const LINK = /^\[([^\]]+)\]\(([^)]+)\)$/;

/** Renders a copy string with `code` spans and [label](/path) links. */
export function Rich({ text }: { text: string }) {
  const parts = text.split(TOKEN).filter((part) => part !== '');

  return (
    <>
      {parts.map((part, index) => {
        if (part.length > 1 && part.startsWith('`') && part.endsWith('`')) {
          return <code key={index}>{part.slice(1, -1)}</code>;
        }
        const link = LINK.exec(part);
        const label = link?.[1];
        const href = link?.[2];
        if (label && href) {
          return (
            <a key={index} href={href}>
              {label}
            </a>
          );
        }
        return <React.Fragment key={index}>{part}</React.Fragment>;
      })}
    </>
  );
}
