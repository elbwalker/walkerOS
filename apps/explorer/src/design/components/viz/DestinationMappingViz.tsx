import React, { useState, type HTMLAttributes } from 'react';
import { cx } from '../cx';
import { MAPPING_CAPTION, MAPPING_EVENTS } from './data/destination-mapping';
import { CodeTokens } from './parts/CodeTokens';
import {
  formatCall,
  formatElb,
  formatRule,
  tokenizeCode,
} from './parts/format';
import { VizFrame } from './parts/VizFrame';

export interface DestinationMappingVizProps extends HTMLAttributes<HTMLDivElement> {
  /** The event chosen first, on the server too. */
  initialEvent?: 0 | 1 | 2;
  /** Text below the cards; `''` hides it. */
  caption?: string;
}

/**
 * Mapping demo: pick one `elb()` event and see the mapping rule and the call it
 * produces in GA4, Meta Pixel, TikTok Pixel and Amplitude. The calls are what
 * the real destinations send for these rules; a fidelity test holds them to it.
 */
export function DestinationMappingViz({
  initialEvent = 0,
  caption = MAPPING_CAPTION,
  ...rest
}: DestinationMappingVizProps) {
  const [index, setIndex] = useState<number>(initialEvent);
  const event = MAPPING_EVENTS[index];
  const name = `${event.entity} ${event.action}`;
  return (
    <VizFrame {...rest} variant="mapping">
      <div className="elb-viz-mapping">
        <div className="elb-viz-mapping__pick">
          <div className="elb-viz-mapping__label">Pick an event</div>
          <div className="elb-viz-mapping__chips">
            {MAPPING_EVENTS.map((item, position) => (
              <button
                key={`${item.entity} ${item.action}`}
                type="button"
                aria-label={`${item.entity} ${item.action}`}
                aria-pressed={position === index}
                className={cx(
                  'elb-viz-mapping__chip',
                  position === index && 'elb-viz-mapping__chip--active',
                )}
                onClick={() => setIndex(position)}
              >
                <span className="elb-viz-mapping__chip-entity">
                  {item.entity}
                </span>
                <span className="elb-viz-mapping__chip-action">
                  {item.action}
                </span>
              </button>
            ))}
          </div>
        </div>
        <div className="elb-viz-mapping__event">
          <CodeTokens tokens={tokenizeCode(formatElb(event), name)} active />
        </div>
        <div className="elb-viz-mapping__body">
          <div className="elb-viz-mapping__comment">
            {'// same event, four destinations, zero app code touched'}
          </div>
          <div className="elb-viz-mapping__cards">
            {event.destinations.map((destination) => (
              <div key={destination.id} className="elb-viz-mapping__card">
                <span className="elb-viz-mapping__name">
                  {destination.label}
                </span>
                <div className="elb-viz-mapping__row">
                  <span className="elb-viz-mapping__tag">mapping</span>
                  <span className="elb-viz-mapping__rule">
                    <CodeTokens
                      tokens={tokenizeCode(
                        formatRule(
                          event.entity,
                          event.action,
                          destination.rule,
                        ),
                        destination.rule.name,
                      )}
                      active
                    />
                  </span>
                </div>
                <div className="elb-viz-mapping__row elb-viz-mapping__row--sends">
                  <span className="elb-viz-mapping__tag">sends</span>
                  <div className="elb-viz-mapping__calls">
                    {destination.calls
                      .flatMap((call) => formatCall(call))
                      .map((line, position) => (
                        <div key={position} className="elb-viz-mapping__line">
                          <CodeTokens
                            tokens={tokenizeCode(line, destination.rule.name)}
                            active
                          />
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        {caption !== '' && (
          <p className="elb-viz-mapping__caption">{caption}</p>
        )}
      </div>
    </VizFrame>
  );
}
