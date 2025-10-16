import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { HtmlPreview } from '../molecules/html-preview';

describe('HtmlPreview rendering', () => {
  it('renders iframe with HTML content', async () => {
    const html = '<div data-elb="product"><h1>Test Product</h1></div>';

    render(<HtmlPreview html={html} />);

    const iframe = screen.getByTitle('HTML Preview') as HTMLIFrameElement;
    expect(iframe).toBeInTheDocument();

    await waitFor(
      () => {
        const doc = iframe.contentDocument;
        expect(doc?.body.innerHTML).toContain('Test Product');
        expect(doc?.body.innerHTML).toContain('data-elb="product"');
      },
      { timeout: 500 },
    );
  });

  it('applies CSS to iframe content', async () => {
    const html = '<h1>Styled Content</h1>';
    const css = 'h1 { color: red; font-size: 24px; }';

    render(<HtmlPreview html={html} css={css} />);

    const iframe = screen.getByTitle('HTML Preview') as HTMLIFrameElement;

    await waitFor(
      () => {
        const doc = iframe.contentDocument;
        const styles = doc?.querySelector('style')?.textContent;
        expect(styles).toContain('color: red');
        expect(styles).toContain('font-size: 24px');
      },
      { timeout: 500 },
    );
  });

  it('renders highlight buttons', () => {
    render(<HtmlPreview html="<div>test</div>" />);

    expect(
      screen.getByRole('button', { name: /context/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /entity/i })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /property/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /action/i })).toBeInTheDocument();
  });
});
