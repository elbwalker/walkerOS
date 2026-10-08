import { useId, type ReactNode } from 'react';

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

  return (
    <div className={className}>
      <label htmlFor={id} className="block text-ui text-fg">
        {label}
      </label>
      <div className="mt-1">{children(id)}</div>
    </div>
  );
};
