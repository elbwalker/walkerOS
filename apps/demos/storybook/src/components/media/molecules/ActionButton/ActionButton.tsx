import { type ButtonProps, Button } from '../../atoms/Button';
import type { WalkerOSTagging } from '@walkerOS/storybook-addon';

export interface ActionButtonProps extends ButtonProps, WalkerOSTagging {}

export const ActionButton = ({
  elbEntity = '',
  elbAction,
  elbData,
  ...props
}: ActionButtonProps) => {
  elbData = elbData + ';' + (props.primary ? 'type:primary' : 'type:secondary');

  return (
    <span
      {...{ 'data-elbaction': 'click' + (elbAction ? `:${elbAction}` : '') }}
      {...{
        [`data-elb-${elbEntity}`]: `cta:${props.label};${elbData}`,
      }}
    >
      <Button {...props} />
    </span>
  );
};
