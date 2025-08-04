import { type ButtonProps, Button } from '../../atoms/Button';
import type { WalkerOSTagging } from '@walkeros/storybook-addon';

export interface TaggedButtonProps extends ButtonProps, WalkerOSTagging {}

export const TaggedButton = ({
  elbEntity = '',
  elbAction,
  elbData,
  ...props
}: TaggedButtonProps) => {
  elbData =
    elbData || '' + ';' + (props.primary ? 'type:primary' : 'type:secondary');

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
