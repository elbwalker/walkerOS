import React, { useState, useEffect, useRef } from 'react';

export enum EditMode {
  NEW = 'new', // Add a new line without removing existing ones
  INSERT = 'insert', // Insert content within an existing line
  DELETE = 'delete', // Delete content within an existing line
}

export interface TypeEdit {
  line: number;
  position: number;
  content: string;
  delay?: number;
  mode?: EditMode;
}

export interface TypewriterOptions {
  edits: TypeEdit[];
  typingSpeed?: number;
}

let activeTimeoutId: NodeJS.Timeout | undefined;
let isFirstRun = true;

export const simulateEdits = (
  initialCode: string,
  options: TypewriterOptions,
  onUpdate: (newCode: string) => void,
) => {
  const scheduleNextChar = (
    editIndex: number,
    charIndex: number,
    delay: number,
  ) => {
    activeTimeoutId = setTimeout(() => type(editIndex, charIndex), delay);
  };

  // If there's already an active simulation stop here
  if (activeTimeoutId) return;

  const lines = initialCode.split('\n');

  const type = (editIndex: number, charIndex: number) => {
    const edit = options.edits[editIndex];
    const { content, mode = EditMode.NEW } = edit;
    const typingSpeed = options.typingSpeed || 30;

    switch (mode) {
      case EditMode.NEW:
        if (charIndex === 0) {
          // On first character, create the new line with proper spacing
          const newLine = ' '.repeat(edit.position);
          lines.splice(edit.line, 0, newLine);
        }

        // Add the current character to the line
        if (charIndex < content.length) {
          const currentLine = lines[edit.line];
          lines[edit.line] =
            currentLine.substring(0, edit.position + charIndex) +
            content[charIndex] +
            currentLine.substring(edit.position + charIndex + 1);

          // Schedule next character if there are more
          scheduleNextChar(editIndex, charIndex + 1, typingSpeed);
        }
        break;

      case EditMode.INSERT:
        // Add the current character to the line at the specified position
        if (charIndex < content.length) {
          const currentLine = lines[edit.line];
          const insertPosition = edit.position + charIndex;
          lines[edit.line] = 
            currentLine.substring(0, insertPosition) + 
            content[charIndex] + 
            currentLine.substring(insertPosition);
          
          // Schedule next character if there are more
          scheduleNextChar(editIndex, charIndex + 1, typingSpeed);
        }
        break;
    }

    // Update the display
    onUpdate(lines.join('\n'));

    // Move to next edit if we're done with current edit
    if (charIndex >= content.length && editIndex < options.edits.length - 1) {
      const nextDelay = options.edits[editIndex + 1].delay || typingSpeed;
      scheduleNextChar(editIndex + 1, 0, nextDelay);
    }
  };

  // Start the simulation if we have edits and it's the first run
  if (isFirstRun) {
    isFirstRun = false;
    const firstDelay = options.edits[0].delay || 0;
    scheduleNextChar(0, 0, firstDelay);
  }
};
