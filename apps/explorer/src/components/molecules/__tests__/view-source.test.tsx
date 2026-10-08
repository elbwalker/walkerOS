// Stub the Vite virtual module before any import of code.tsx.
jest.mock('virtual:walkeros-core-types', () => '', { virtual: true });

// The real Code atom renders; only Monaco itself is replaced, by a textarea
// that shows the editor's initial value and reports edits like Monaco does.
jest.mock('@monaco-editor/react', () => {
  // require inside the factory: jest hoists jest.mock above imports.
  const ReactLocal = require('react');
  const Editor = ({
    defaultValue,
    onChange,
  }: {
    defaultValue: string;
    onChange: (value: string | undefined) => void;
  }) =>
    ReactLocal.createElement('textarea', {
      'aria-label': 'Code',
      defaultValue,
      onChange: (event: { target: { value: string } }) =>
        onChange(event.target.value),
    });
  return {
    Editor,
    loader: { config: () => {}, init: () => Promise.resolve() },
    useMonaco: () => null,
  };
});

import React, { useState } from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react';
import type { Elb } from '@walkeros/core';
import type { SourceBrowser } from '@walkeros/web-source-browser';
import { ViewSource } from '../view-source';

const promotion = (
  <div data-elb="promotion" data-elbaction="visible:view">
    <h2 data-elb-promotion="name:#innerText">Spring sale</h2>
  </div>
);

const formattedPromotion = `<div data-elb="promotion" data-elbaction="visible:view">
  <h2 data-elb-promotion="name:#innerText">Spring sale</h2>
</div>`;

const edit = `<div data-elb="promotion" data-elbaction="visible:view">
  <h2 data-elb-promotion="name:#innerText">Summer sale</h2>
</div>`;

function elbResolving(result: Elb.PushResult) {
  return jest.fn<
    ReturnType<SourceBrowser.BrowserArguments>,
    Parameters<SourceBrowser.BrowserArguments>
  >(() => Promise.resolve(result));
}

type Queries = ReturnType<typeof render>;

async function openCode(
  { getByRole, findByRole }: Queries,
  toggle: HTMLElement = getByRole('button', { name: 'Show code' }),
) {
  fireEvent.click(toggle);
  const editor = await findByRole('textbox', { name: 'Code' });
  if (!(editor instanceof HTMLTextAreaElement))
    throw new Error('The code view is not a text field');
  return editor;
}

async function applyEdit(queries: Queries, html: string) {
  const editor = await openCode(queries);
  fireEvent.change(editor, { target: { value: html } });
  fireEvent.click(queries.getByRole('button', { name: 'Show visual' }));
  // Let the walker init answer arrive.
  await act(async () => {});
}

function shownLabel(toggle: HTMLElement): string {
  return (
    toggle.querySelector('.elb-explorer-toggle__label:not([aria-hidden])')
      ?.textContent ?? ''
  );
}

describe('ViewSource', () => {
  it('renders the child and one toggle offering Code', () => {
    const { container, getAllByRole, getByRole, getByText } = render(
      <ViewSource>{promotion}</ViewSource>,
    );

    expect(getByText('Spring sale')).toBeInTheDocument();
    expect(getByRole('group', { name: 'View source' })).toBeInTheDocument();
    expect(getAllByRole('button')).toHaveLength(1);
    expect(shownLabel(getByRole('button', { name: 'Show code' }))).toBe('Code');
    expect(getByRole('status')).toBeEmptyDOMElement();
    expect(
      container.querySelector('.elb-view-source__content > [data-elb]'),
    ).not.toBeNull();
  });

  it('passes data, aria and id attributes to its root', () => {
    const { container } = render(
      <ViewSource
        id="hero"
        aria-label="Promotion"
        data-testid="wrapper"
        stretch
      >
        {promotion}
      </ViewSource>,
    );

    const root = container.firstElementChild;
    expect(root).toHaveClass('elb-view-source');
    expect(root).toHaveAttribute('id', 'hero');
    expect(root).toHaveAttribute('aria-label', 'Promotion');
    expect(root).toHaveAttribute('data-testid', 'wrapper');
    expect(root).toHaveClass('elb-view-source--stretch');
  });

  it("shows the child's formatted HTML, without the wrapper or toolbar", async () => {
    const queries = render(<ViewSource>{promotion}</ViewSource>);

    const editor = await openCode(queries);

    expect(editor.value).toBe(formattedPromotion);
    expect(editor.value).not.toContain('elb-view-source');
    expect(editor.value).not.toContain('Visual');
    const toggle = queries.getByRole('button', { name: 'Show visual' });
    expect(shownLabel(toggle)).toBe('Visual');
    expect(toggle).toHaveAttribute('aria-keyshortcuts', 'Escape');
  });

  // The panel's measures sit on the root as custom properties.
  const measures = (queries: Queries) => {
    const root = queries.container.firstElementChild;
    if (!(root instanceof HTMLElement)) throw new Error('No root');
    return (name: string) =>
      root.style.getPropertyValue(`--elb-view-source-${name}`);
  };

  it('covers the whole box, with its radius, of an element that paints one', async () => {
    const queries = render(
      <ViewSource>
        <div
          data-elb="promotion"
          style={{ border: '1px solid', borderRadius: '16px', padding: '24px' }}
        >
          Spring sale
        </div>
      </ViewSource>,
    );
    const element = queries.getByText('Spring sale');
    element.getBoundingClientRect = () => ({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 320,
      bottom: 180,
      width: 320,
      height: 180,
      toJSON: () => ({}),
    });

    await openCode(queries);

    const code = queries.container.querySelector('.elb-view-source__code');
    expect(code).toHaveAttribute('data-theme', 'dark');
    const measure = measures(queries);
    expect(measure('width')).toBe('320px');
    expect(measure('height')).toBe('180px');
    expect(measure('radius')).toBe('16px');
    expect(measure('inset')).toBe('0px 0px 0px 0px');
  });

  it('covers only the content box of an element that paints no box', async () => {
    const queries = render(
      <ViewSource>
        <section data-elbcontext="module:list" style={{ padding: '24px 16px' }}>
          Spring sale
        </section>
      </ViewSource>,
    );

    const measure = measures(queries);
    // The toolbar follows the content box in Visual already.
    expect(measure('inset-top')).toBe('24px');
    expect(measure('inset-right')).toBe('16px');

    await openCode(queries);

    expect(measure('inset')).toBe('24px 16px 24px 16px');
    expect(measure('radius')).toBe('var(--radius-md)');
  });

  it('keeps the same child node when the code is unchanged', async () => {
    const elb = elbResolving({ ok: true });
    const queries = render(<ViewSource elb={elb}>{promotion}</ViewSource>);
    const original = queries.getByText('Spring sale');

    await openCode(queries);
    fireEvent.click(queries.getByRole('button', { name: 'Show visual' }));

    expect(queries.getByText('Spring sale')).toBe(original);
    expect(elb).not.toHaveBeenCalled();
    expect(queries.queryByRole('button', { name: 'Reset' })).toBeNull();
    expect(queries.getByRole('status')).toBeEmptyDOMElement();
  });

  it('renders a changed edit in place and runs walker init on it', async () => {
    const elb = elbResolving({ ok: true });
    const queries = render(<ViewSource elb={elb}>{promotion}</ViewSource>);

    await applyEdit(queries, edit);

    const heading = queries.getByText('Summer sale');
    const element = heading.parentElement;
    expect(queries.queryByText('Spring sale')).toBeNull();
    expect(queries.queryByRole('textbox', { name: 'Code' })).toBeNull();
    expect(element).toHaveAttribute('data-elb', 'promotion');
    expect(elb).toHaveBeenCalledTimes(1);
    expect(elb).toHaveBeenCalledWith('walker init', element);
    const reset = queries.getByRole('button', { name: 'Reset' });
    expect(reset).toHaveAttribute('title', 'Reset');
    expect(reset.querySelector('svg')).not.toBeNull();
    expect(reset).toHaveTextContent(/^$/);
    expect(queries.getByRole('status')).toBeEmptyDOMElement();
  });

  it('shows the edited element as the code and keeps Reset in Code', async () => {
    const queries = render(
      <ViewSource elb={elbResolving({ ok: true })}>{promotion}</ViewSource>,
    );

    await applyEdit(queries, edit);
    const editor = await openCode(queries);

    expect(editor.value).toContain('Summer sale');
    expect(queries.getByRole('button', { name: 'Reset' })).toBeInTheDocument();
  });

  it.each([
    ['two root elements', '<p>One</p><p>Two</p>', 'found 2 elements'],
    ['plain text', 'Just text', 'found text'],
    ['no code at all', '   ', 'found nothing'],
  ])('stays in Code with a reason for %s', async (_, html, reason) => {
    const elb = elbResolving({ ok: true });
    const queries = render(<ViewSource elb={elb}>{promotion}</ViewSource>);

    await applyEdit(queries, html);

    const alert = queries.getByRole('alert');
    expect(alert).toHaveTextContent('Not applied: needs one root element');
    expect(alert).toHaveTextContent(reason);
    expect(alert.querySelector('svg')).not.toBeNull();
    expect(queries.getByRole('textbox', { name: 'Code' })).toBeInTheDocument();
    expect(
      shownLabel(queries.getByRole('button', { name: 'Show visual' })),
    ).toBe('Visual');
    expect(elb).not.toHaveBeenCalled();
  });

  it('remounts the original children on Reset, with React in charge again', async () => {
    const Counter = () => {
      const [count, setCount] = useState(0);
      return (
        <button data-elb="promotion" onClick={() => setCount(count + 1)}>
          Clicked {count}
        </button>
      );
    };
    const queries = render(
      <ViewSource elb={elbResolving({ ok: true })}>
        <Counter />
      </ViewSource>,
    );
    fireEvent.click(queries.getByText('Clicked 0'));
    expect(queries.getByText('Clicked 1')).toBeInTheDocument();

    await applyEdit(
      queries,
      '<button data-elb="promotion">Clicked edited</button>',
    );
    // An edit is plain HTML: React's handlers are gone until Reset.
    fireEvent.click(queries.getByText('Clicked edited'));
    expect(queries.getByText('Clicked edited')).toBeInTheDocument();

    fireEvent.click(queries.getByRole('button', { name: 'Reset' }));
    await act(async () => {});

    expect(queries.queryByText('Clicked edited')).toBeNull();
    expect(queries.getByRole('status')).toBeEmptyDOMElement();
    expect(queries.queryByRole('button', { name: 'Reset' })).toBeNull();
    fireEvent.click(queries.getByText('Clicked 0'));
    expect(queries.getByText('Clicked 1')).toBeInTheDocument();
  });

  it.each([
    ['there is no elb', undefined],
    ['walker init fails', elbResolving({ ok: false, error: 'not running' })],
    [
      'walker init rejects',
      jest.fn<
        ReturnType<SourceBrowser.BrowserArguments>,
        Parameters<SourceBrowser.BrowserArguments>
      >(() => Promise.reject(new Error('gone'))),
    ],
    [
      'elb throws',
      jest.fn<
        ReturnType<SourceBrowser.BrowserArguments>,
        Parameters<SourceBrowser.BrowserArguments>
      >(() => {
        throw new Error('broken');
      }),
    ],
  ])('says the triggers were not refreshed when %s', async (_, elb) => {
    const queries = render(<ViewSource elb={elb}>{promotion}</ViewSource>);

    await applyEdit(queries, edit);

    expect(queries.getByText('Summer sale')).toBeInTheDocument();
    const status = queries.getByRole('status');
    expect(status).toHaveTextContent('Triggers not refreshed');
    expect(status.querySelector('svg')).not.toBeNull();
  });

  it('runs walker init on the restored original after Reset', async () => {
    const elb = elbResolving({ ok: true });
    const queries = render(<ViewSource elb={elb}>{promotion}</ViewSource>);
    await applyEdit(queries, edit);

    fireEvent.click(queries.getByRole('button', { name: 'Reset' }));

    const restored = queries.getByText('Spring sale').parentElement;
    expect(restored).toHaveAttribute('data-elb', 'promotion');
    expect(elb).toHaveBeenCalledTimes(2);
    expect(elb).toHaveBeenLastCalledWith('walker init', restored);
    await act(async () => {});
    expect(queries.getByRole('status')).toBeEmptyDOMElement();
  });

  it.each([
    ['walker init fails', elbResolving({ ok: false, error: 'not running' })],
    ['there is no elb', undefined],
  ])(
    'says the restored triggers were not refreshed when %s',
    async (_, elbAfterEdit) => {
      const elb = elbResolving({ ok: true });
      const queries = render(<ViewSource elb={elb}>{promotion}</ViewSource>);
      await applyEdit(queries, edit);
      queries.rerender(<ViewSource elb={elbAfterEdit}>{promotion}</ViewSource>);

      fireEvent.click(queries.getByRole('button', { name: 'Reset' }));

      await waitFor(() =>
        expect(queries.getByRole('status')).toHaveTextContent(
          'Triggers not refreshed',
        ),
      );
      expect(queries.getByText('Spring sale')).toBeInTheDocument();
    },
  );

  it('keeps an applied edit when the parent renders new children', async () => {
    const elb = elbResolving({ ok: true });
    const queries = render(<ViewSource elb={elb}>{promotion}</ViewSource>);
    await applyEdit(queries, edit);

    queries.rerender(
      <ViewSource elb={elb}>
        <p>Other child</p>
      </ViewSource>,
    );

    expect(queries.getByText('Summer sale')).toBeInTheDocument();
    expect(queries.queryByText('Other child')).toBeNull();
    expect(elb).toHaveBeenCalledTimes(1);
  });

  it('runs walker init again for a second edit', async () => {
    const elb = elbResolving({ ok: true });
    const queries = render(<ViewSource elb={elb}>{promotion}</ViewSource>);
    await applyEdit(queries, edit);

    await applyEdit(
      queries,
      '<div data-elb="promotion"><h2>Autumn sale</h2></div>',
    );

    const element = queries.getByText('Autumn sale').parentElement;
    expect(queries.queryByText('Summer sale')).toBeNull();
    expect(elb).toHaveBeenCalledTimes(2);
    expect(elb).toHaveBeenLastCalledWith('walker init', element);
  });

  it('drops a late walker init answer for an edit that was reset', async () => {
    let answerEdit: (result: Elb.PushResult) => void = () => {};
    const elb = elbResolving({ ok: true });
    elb.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          answerEdit = resolve;
        }),
    );
    const queries = render(<ViewSource elb={elb}>{promotion}</ViewSource>);
    await applyEdit(queries, edit);

    fireEvent.click(queries.getByRole('button', { name: 'Reset' }));
    await act(async () => answerEdit({ ok: false, error: 'late' }));

    expect(queries.getByRole('status')).toBeEmptyDOMElement();
  });

  it('discards an unapplied draft on Reset and keeps the child', async () => {
    const elb = elbResolving({ ok: true });
    const queries = render(<ViewSource elb={elb}>{promotion}</ViewSource>);
    const original = queries.getByText('Spring sale');
    await applyEdit(queries, '<p>One</p><p>Two</p>');

    fireEvent.click(queries.getByRole('button', { name: 'Reset' }));

    expect(queries.getByText('Spring sale')).toBe(original);
    expect(queries.queryByRole('textbox', { name: 'Code' })).toBeNull();
    expect(queries.queryByRole('alert')).toBeNull();
    expect(elb).not.toHaveBeenCalled();
  });

  it('shows all of a child that renders more than one element, and says so', async () => {
    const Pair = () => (
      <>
        <p>One</p>
        <p>Two</p>
      </>
    );
    const queries = render(
      <ViewSource>
        <Pair />
      </ViewSource>,
    );

    const editor = await openCode(queries);

    expect(editor.value).toContain('<p>One</p>');
    expect(editor.value).toContain('<p>Two</p>');
    expect(queries.getByRole('alert')).toHaveTextContent(
      'ViewSource needs one element, found 2 elements',
    );
  });

  it('moves focus from the editor to the toggle on Escape, staying in Code', async () => {
    const queries = render(<ViewSource>{promotion}</ViewSource>);
    const editor = await openCode(queries);
    editor.focus();

    fireEvent.keyDown(editor, { key: 'Escape' });

    expect(queries.getByRole('button', { name: 'Show visual' })).toHaveFocus();
    expect(queries.getByRole('textbox', { name: 'Code' })).toBeInTheDocument();
  });

  it('keeps keyboard focus in the toolbar on Reset', async () => {
    const queries = render(
      <ViewSource elb={elbResolving({ ok: true })}>{promotion}</ViewSource>,
    );
    await applyEdit(queries, edit);
    const reset = queries.getByRole('button', { name: 'Reset' });
    reset.focus();

    fireEvent.click(reset);
    await act(async () => {});

    expect(queries.getByRole('button', { name: 'Show code' })).toHaveFocus();
  });
});

describe('nested ViewSource', () => {
  const nested = (elb?: SourceBrowser.Push) => (
    <ViewSource elb={elb}>
      <section data-elb="list">
        <ViewSource elb={elb}>
          <div data-elb="product">Card</div>
        </ViewSource>
      </section>
    </ViewSource>
  );

  const wrappers = (queries: Queries) =>
    queries.container.querySelectorAll('.elb-view-source');

  it("shows the outer element's HTML without the inner wrapper's chrome", async () => {
    const queries = render(nested());
    const [outer] = queries.getAllByRole('button', { name: 'Show code' });

    const editor = await openCode(queries, outer);

    expect(editor.value).toBe(
      '<section data-elb="list"><div data-elb="product">Card</div></section>',
    );
  });

  it('runs walker init on the inner element for an inner edit', async () => {
    const elb = elbResolving({ ok: true });
    const queries = render(nested(elb));
    const [, inner] = queries.getAllByRole('button', { name: 'Show code' });

    const editor = await openCode(queries, inner);
    fireEvent.change(editor, {
      target: { value: '<div data-elb="product">Edited card</div>' },
    });
    fireEvent.click(queries.getByRole('button', { name: 'Show visual' }));
    await act(async () => {});

    const element = queries.getByText('Edited card');
    expect(elb).toHaveBeenCalledTimes(1);
    expect(elb).toHaveBeenCalledWith('walker init', element);
    expect(wrappers(queries)).toHaveLength(2);
  });
});
