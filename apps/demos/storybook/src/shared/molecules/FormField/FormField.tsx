import { useId, type ReactNode } from 'react';
import { useText } from '../../language';

export interface FormFieldProps {
  label: string;
  className?: string;
  /** Renders the control, given the id its label points at. */
  children: (id: string) => ReactNode;
}

export const FormField = ({
  label,
  className = '',
  children,
}: FormFieldProps) => {
  const id = useId();
  const t = useText();

  return (
    <div className={className}>
      <label htmlFor={id} className="block text-ui text-fg">
        {t(label)}
      </label>
      <div className="mt-1">{children(id)}</div>
    </div>
  );
};
