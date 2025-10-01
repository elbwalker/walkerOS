import { type ButtonProps, Button } from '../../atoms/Button';
import { createTrackingProps, type DataElb } from '../../../../utils/tagger';
import { assign } from '@walkeros/core';

export interface TaggedButtonProps extends ButtonProps {
  dataElb?: DataElb;
}

export const TaggedButton = ({
  dataElb,
  ...buttonProps
}: TaggedButtonProps) => {
  const trackingProps = createTrackingProps(
    assign(
      {
        data: {
          cta: buttonProps.label,
          type: buttonProps.primary ? 'primary' : 'secondary',
        },
      },
      dataElb,
    ),
    'TaggedButton',
  );

  return (
    <span {...trackingProps}>
      <Button {...buttonProps} />
    </span>
  );
};
