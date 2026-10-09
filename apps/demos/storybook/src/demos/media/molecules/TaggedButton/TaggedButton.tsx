import { assign } from '@walkeros/core';
import { Button } from '../../../../shared/atoms/Button';
import { useText } from '../../../../shared/language';
import { createTrackingProps, type DataElb } from '../../../../shared/tagger';

export interface TaggedButtonProps {
  label: string;
  primary?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  dataElb?: DataElb;
}

export const TaggedButton = ({
  label,
  primary = false,
  disabled,
  onClick,
  dataElb,
}: TaggedButtonProps) => {
  const t = useText();
  const trackingProps = createTrackingProps(
    assign(
      {
        data: {
          cta: label,
          type: primary ? 'primary' : 'secondary',
        },
      },
      dataElb,
    ),
    'TaggedButton',
  );

  return (
    <span {...trackingProps}>
      <Button
        variant={primary ? 'primary' : 'secondary'}
        disabled={disabled}
        onClick={onClick}
        {...createTrackingProps(undefined, 'Button')}
      >
        {t(label)}
      </Button>
    </span>
  );
};
