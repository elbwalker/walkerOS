import React, { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { CodeTokens } from '../atoms/CodeTokens';
import { cx } from '../cx';
import {
  taggingFrame,
  unknownParts,
  type TaggingCardPart,
  type TaggingFrame,
  type TaggingScript,
} from './data/tagging';
import { CodeLine } from './parts/CodeLine';
import { EventsTable } from './parts/EventsTable';
import { Pill } from './parts/Pill';
import { vizStyle } from './parts/style';
import { Thumb } from './parts/Thumb';
import { VizFrame } from './parts/VizFrame';

export interface TaggingVizProps extends HTMLAttributes<HTMLDivElement> {
  script: TaggingScript;
  /** The time shown, in ms from the script's start. */
  t: number;
}

const reported = new Set<string>();

// A part that never lights would fail silently, so each wrong id is named once
// per page. In every build: the design entry also runs where no bundler
// defines NODE_ENV.
function reportUnknownParts(script: TaggingScript): void {
  for (const message of unknownParts(script)) {
    if (reported.has(message)) continue;
    reported.add(message);
    console.error(message);
  }
}

function Cursor({ cursor }: { cursor: NonNullable<TaggingFrame['cursor']> }) {
  return (
    <span
      className="elb-viz-tagging__cursor"
      aria-hidden="true"
      style={vizStyle({
        '--elb-viz-cursor-x': cursor.x,
        '--elb-viz-cursor-y': cursor.y,
        '--elb-viz-cursor-opacity': cursor.opacity,
        '--elb-viz-ring-scale': cursor.ring,
        '--elb-viz-ring-opacity': cursor.ringOpacity,
        '--elb-viz-press': cursor.pressed ? 0.8 : 1,
      })}
    >
      <span className="elb-viz-tagging__ring" />
      <span className="elb-viz-tagging__pointer" />
    </span>
  );
}

function Part({
  part,
  on,
  cursor,
}: {
  part: TaggingCardPart;
  on: boolean;
  cursor: ReactNode;
}) {
  if (part.role === 'title')
    return (
      <span className="elb-viz-tagging__title">
        <span
          className={cx(
            'elb-viz-tagging__mark',
            on && 'elb-viz-tagging__mark--on',
          )}
        >
          {part.text}
        </span>
        {cursor}
      </span>
    );
  const base =
    part.role === 'action'
      ? 'elb-viz-tagging__link'
      : `elb-viz-tagging__${part.role}`;
  return (
    <span className={cx(base, on && `${base}--on`)}>
      {part.text}
      {cursor}
    </span>
  );
}

/**
 * Tagging demo: walkerOS attributes are typed into markup, the element's card
 * lights up as each part is tagged, a cursor clicks it, and the events land in
 * a table. Shows `script` at `t`; it keeps no clock, so the caller owns time.
 */
export const TaggingViz = forwardRef<HTMLDivElement, TaggingVizProps>(
  function TaggingViz({ script, t, ...rest }, ref) {
    reportUnknownParts(script);
    const { lines, fade, caretOn, card, cursor, rows } = taggingFrame(
      script,
      t,
    );
    const lit = new Set(card.lit);
    const pointer = (part: TaggingCardPart) =>
      cursor && script.click?.part === part.id ? (
        <Cursor cursor={cursor} />
      ) : null;
    const render = (part: TaggingCardPart) => (
      <Part
        key={part.id}
        part={part}
        on={lit.has(part.id)}
        cursor={pointer(part)}
      />
    );
    const actions = script.card.parts.filter((part) => part.role === 'action');
    return (
      <VizFrame {...rest} ref={ref} variant="tagging">
        <div className="elb-viz-tagging">
          <div className="elb-viz-tagging__pane">
            <div className="elb-viz-tagging__bar">
              <span className="elb-viz-tagging__dots" aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
              {script.file !== undefined && (
                <span className="elb-viz-tagging__file">{script.file}</span>
              )}
            </div>
            <div
              className="elb-viz-tagging__code"
              style={vizStyle({ '--elb-viz-fade': fade })}
            >
              {lines.map((line) => (
                <CodeLine
                  key={line.id}
                  number={line.n}
                  bar={line.on ? 'entity' : undefined}
                  className={cx(
                    'elb-viz-tagging__line',
                    line.on && 'elb-viz-tagging__line--on',
                  )}
                >
                  {line.caret === null ? (
                    <CodeTokens tokens={line.tokens} />
                  ) : (
                    <>
                      <CodeTokens tokens={line.tokens.slice(0, line.caret)} />
                      <span
                        className="elb-viz-caret"
                        style={vizStyle({
                          '--elb-viz-caret': caretOn ? 1 : 0,
                        })}
                      />
                      <CodeTokens tokens={line.tokens.slice(line.caret)} />
                    </>
                  )}
                </CodeLine>
              ))}
            </div>
            <div className="elb-viz-tagging__stage">
              <div
                className={cx(
                  'elb-viz-tagging__card',
                  card.tagged && 'elb-viz-tagging__card--tagged',
                )}
                style={vizStyle({
                  '--elb-viz-card-opacity': card.opacity,
                  '--elb-viz-card-offset': card.offset,
                })}
              >
                <div className="elb-viz-tagging__pills">
                  {card.pills.map((pill) => (
                    <Pill key={`${pill.part}-${pill.text}`} part={pill.part}>
                      {pill.text}
                    </Pill>
                  ))}
                </div>
                {script.card.thumb !== undefined && (
                  <div className="elb-viz-tagging__thumb">
                    <Thumb kind={script.card.thumb} />
                  </div>
                )}
                <div className="elb-viz-tagging__text">
                  {script.card.parts
                    .filter((part) => part.role !== 'action')
                    .map(render)}
                  {actions.length > 0 && (
                    <div className="elb-viz-tagging__foot">
                      {actions.map(render)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <EventsTable rows={rows} />
        </div>
      </VizFrame>
    );
  },
);
