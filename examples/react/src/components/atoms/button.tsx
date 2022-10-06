interface Props {
  label: string;
  colors: string;
}

export const Button = ({ label, colors }: Props) => {
  return (
    <button
      type="button"
      onClick={() => {}}
      className={`w-full flex inline-flex items-center justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium ${colors}`}
    >
      {label}
    </button>
  );
};
