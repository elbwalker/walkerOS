import React from 'react';
import MappingConfig from '../organisms/mapping';
import { formatValue } from '../molecules/codeBox';

interface LMRCodeBoxesProps {
  input: string;
  config: string;
  output?: string;
  height?: number;
  smallText?: boolean;
  className?: string;
  labelInput?: string;
  labelConfig?: string;
  labelOutput?: string;
  disableInput?: boolean;
  inputConfig?: boolean;
  fn?: (input, config, log, options) => void;
}

export const LMRCodeBoxes: React.FC<LMRCodeBoxesProps> = ({
  input,
  config,
  output,
  height,
  smallText,
  className,
  labelInput,
  labelConfig = 'Event Config',
  labelOutput,
  disableInput,
  inputConfig,
  fn,
}) => {
  return (
    <MappingConfig
      input={formatValue(input)}
      config={formatValue(config)}
      output={formatValue(output)}
      height={height}
      smallText={smallText}
      className={className}
      labelInput={labelInput}
      labelConfig={labelConfig}
      labelOutput={labelOutput}
      disableInput={disableInput}
      disableConfig={inputConfig}
      fn={fn}
    />
  );
};
