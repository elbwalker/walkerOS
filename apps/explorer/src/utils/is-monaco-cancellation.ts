/**
 * Detect `@monaco-editor/loader`'s cancelation rejection.
 *
 * When a component using `<CodeBox>` unmounts before Monaco's loader promise
 * settles (React strict-mode double-mount, route change, Fast Refresh),
 * `@monaco-editor/loader`'s `makeCancelable` wrapper calls `.cancel()` and
 * the wrapped promise rejects with `{type: 'cancelation', msg: 'operation
 * is manually canceled'}`. The rejection lives inside `@monaco-editor/react`
 * and is not catchable from userland, so consumers suppress it via a
 * `window.addEventListener('unhandledrejection', ...)` filter (canonical
 * workaround, see https://github.com/suren-atoyan/monaco-react/issues/440).
 *
 * webpack-dev-server's runtime overlay hooks rejections independently and
 * wraps the reason in `new Error(reason, { cause: reason })`, so the same
 * identity check must walk `.cause` too.
 *
 * This predicate handles both shapes (raw reason and wrapping Error).
 */
export function isMonacoCancellation(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const v = value as {
    type?: string;
    msg?: string;
    cause?: unknown;
    message?: string;
  };
  if (v.type === 'cancelation') return true;
  if (v.cause !== undefined && isMonacoCancellation(v.cause)) return true;
  return false;
}
