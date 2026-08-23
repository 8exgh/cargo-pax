import { describe, expect, it } from '@jest/globals';
import { MAX_TEXT_LENGTH, stripHtml } from './strip-html';

describe('stripHtml', () => {
  it('drops scripts, styles and tags but keeps the words', () => {
    const html = `
      <html><head><style>.a{color:red}</style><script>window.x = 1;</script></head>
      <body><div class="status"><h2>Delivered</h2><p>Delivered On<br/>Thursday, August 28 at 2:14 P.M.</p></div>
      <table><tr><td>Scheduled Delivery</td><td>Saturday, 08/30/2026</td></tr></table></body></html>`;
    const text = stripHtml(html);
    expect(text).not.toMatch(/color:red|window\.x/);
    expect(text).toContain('Delivered');
    expect(text).toContain('Thursday, August 28 at 2:14 P.M.');
    expect(text).toContain('Scheduled Delivery\nSaturday, 08/30/2026');
  });

  it('removes carrier boilerplate lines only when they are the whole line', () => {
    const html = `<ul><li>Skip to Main Content</li><li>Log in / Sign up</li><li>Track</li></ul>
      <p>Track your package: it is in transit</p><a>Create a Shipment</a>`;
    const text = stripHtml(html);
    expect(text).not.toContain('Skip to Main Content');
    expect(text).not.toContain('Create a Shipment');
    expect(text).toContain('Track');
    expect(text).toContain('Track your package: it is in transit');
  });

  it('decodes entities and collapses repeated lines', () => {
    const html = `<div>Help &amp; Support</div><div>Help &amp; Support</div><div>Est.&nbsp;delivery</div>`;
    expect(stripHtml(html)).toBe('Help & Support\nEst. delivery');
  });

  it('caps the length', () => {
    const html = `<p>${'x'.repeat(MAX_TEXT_LENGTH * 2)}</p>`;
    expect(stripHtml(html).length).toBe(MAX_TEXT_LENGTH);
  });
});
