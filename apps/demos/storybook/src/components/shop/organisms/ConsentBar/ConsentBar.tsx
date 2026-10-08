import { Text } from '../../atoms/Text';
import { ConsentControls } from '../../molecules/ConsentControls';
import { StatusMessage, type StatusTone } from '../../molecules/StatusMessage';

export type ConsentState = 'unknown' | 'accepted' | 'denied';

const consentStates: ConsentState[] = ['unknown', 'accepted', 'denied'];

const stateTones: Record<ConsentState, StatusTone> = {
  unknown: 'info',
  accepted: 'success',
  denied: 'danger',
};

export interface ConsentBarProps {
  state: ConsentState;
  /** A problem with the last choice, such as consent that was not sent. */
  notice?: string;
  onAccept: () => void;
  onDeny: () => void;
  onReset: () => void;
}

export const ConsentBar = ({
  state,
  notice,
  onAccept,
  onDeny,
  onReset,
}: ConsentBarProps) => (
  <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-md border border-border-strong bg-surface px-3 py-2">
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <Text as="strong" variant="small" tone="fg" className="font-semibold">
        Consent?
      </Text>
      <StatusMessage tone={stateTones[state]} variant="small" role="status">
        Status:{' '}
        {/* Every state shares one cell, so the bar keeps the longest word's
            width and never changes size; only the current one is shown. */}
        <span className="inline-grid">
          {consentStates.map((option) => (
            <span
              key={option}
              className={`col-start-1 row-start-1 ${option === state ? '' : 'invisible'}`}
              aria-hidden={option === state ? undefined : true}
            >
              {option}
            </span>
          ))}
        </span>
      </StatusMessage>
    </div>
    <ConsentControls onAccept={onAccept} onDeny={onDeny} onReset={onReset} />
    {notice && (
      <StatusMessage
        tone="warning"
        variant="small"
        role="alert"
        className="w-full"
      >
        {notice}
      </StatusMessage>
    )}
  </div>
);
