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
let isPaused = false;

export const resetTypewriter = () => {
  if (activeTimeoutId) {
    clearTimeout(activeTimeoutId);
    activeTimeoutId = undefined;
  }
  isFirstRun = true;
  isPaused = false;
};

export const pauseTypewriter = () => {
  isPaused = true;
  if (activeTimeoutId) {
    clearTimeout(activeTimeoutId);
    activeTimeoutId = undefined;
  }
};

const scheduleNextChar = (
  editIndex: number,
  charIndex: number,
  delay: number,
  lines: string[],
  options: TypewriterOptions,
  onUpdate: (newCode: string) => void,
) => {
  activeTimeoutId = setTimeout(
    () => type(editIndex, charIndex, lines, options, onUpdate),
    delay,
  );
};

const type = (
  editIndex: number,
  charIndex: number,
  lines: string[],
  options: TypewriterOptions,
  onUpdate: (newCode: string) => void,
) => {
  if (isPaused) {
    return;
  }

  const edit = options.edits[editIndex];
  const { content, mode = EditMode.NEW } = edit;
  const typingSpeed = options.typingSpeed || 30;

  switch (mode) {
    case EditMode.NEW:
      if (charIndex === 0) {
        const newLine = ' '.repeat(edit.position);
        lines.splice(edit.line, 0, newLine);
      }

      if (charIndex < content.length) {
        const currentLine = lines[edit.line];
        lines[edit.line] =
          currentLine.substring(0, edit.position + charIndex) +
          content[charIndex] +
          currentLine.substring(edit.position + charIndex + 1);

        scheduleNextChar(
          editIndex,
          charIndex + 1,
          typingSpeed,
          lines,
          options,
          onUpdate,
        );
      }
      break;

    case EditMode.INSERT:
      if (charIndex < content.length) {
        const currentLine = lines[edit.line];
        const insertPosition = edit.position + charIndex;
        lines[edit.line] =
          currentLine.substring(0, insertPosition) +
          content[charIndex] +
          currentLine.substring(insertPosition);

        scheduleNextChar(
          editIndex,
          charIndex + 1,
          typingSpeed,
          lines,
          options,
          onUpdate,
        );
      }
      break;
  }

  onUpdate(lines.join('\n'));

  if (charIndex >= content.length && editIndex < options.edits.length - 1) {
    const nextDelay = options.edits[editIndex + 1].delay || typingSpeed;
    scheduleNextChar(editIndex + 1, 0, nextDelay, lines, options, onUpdate);
  }
};

export const simulateEdits = (
  initialCode: string,
  options: TypewriterOptions,
  onUpdate: (newCode: string) => void,
) => {
  if (activeTimeoutId) return;

  const lines = initialCode.split('\n');

  if (isFirstRun) {
    isFirstRun = false;
    const firstDelay = options.edits[0].delay || 0;
    scheduleNextChar(0, 0, firstDelay, lines, options, onUpdate);
  }
};
