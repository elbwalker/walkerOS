export const ButtonPrimary = ({ label, action }) => {
  return (
    <Button
      label={label}
      action={action}
      colors="text-white bg-elbwalker-600 hover:bg-elbwalker-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-elbwalker-500"
    />
  );
};

export const ButtonSecondary = ({ label, action }) => {
  return (
    <Button
      label={label}
      action={action}
      colors="text-elbwalker-700 bg-elbwalker-100 hover:bg-elbwalker-200"
    />
  );
};

const Button = ({ label, action, colors }) => {
  return (
    <button
      type="button"
      elbaction={action && `click:${action}`}
      onClick={async () => console.log('button clicked')}
      className={`w-full flex inline-flex items-center justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium ${colors}`}
    >
      {label}
    </button>
  );
};
