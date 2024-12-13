import { ComponentProps } from 'react';
import CodeBox from './codeBox';
import { assign } from '@elbwalker/utils';

interface CodeProps extends ComponentProps<typeof CodeBox> {
  transparent?: boolean;
  oneLine?: boolean;
}

const Code: React.FC<CodeProps> = ({
  transparent,
  oneLine = false,
  ...init
}) => {
  const props = assign(
    { ...init },
    {
      disabled: true,
      format: { intent: oneLine ? 0 : 2 },
      className: `text-sm ${transparent && 'bg-transparent'}`,
    },
  );
  return <CodeBox {...props} />;
};

export default Code;
