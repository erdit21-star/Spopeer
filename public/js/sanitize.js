/**
 * Shared HTML sanitization utilities.
 *
 * Use escapeHtml() whenever inserting user-generated content into innerHTML.
 * Prefer textContent for plain text and createElement() for structured DOM.
 */

(function (root) {
  'use strict';

  /**
   * Escape HTML special characters to prevent XSS.
   * @param {string} str - The raw string to escape.
   * @returns {string} The escaped string safe for innerHTML.
   */
  function escapeHtml(str) {
    if (typeof str !== 'string') return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }

  /**
   * Sanitize a URL to prevent javascript: protocol injection.
   * Returns empty string for dangerous URLs.
   * @param {string} url
   * @returns {string}
   */
  function sanitizeUrl(url) {
    if (typeof url !== 'string') return '';
    const trimmed = url.trim();
    // Block javascript:, data:, vbscript: protocols
    if (/^(javascript|data|vbscript):/i.test(trimmed)) return '';
    return escapeHtml(trimmed);
  }

  /**
   * Create a text node and append it to a container (XSS-safe).
   * @param {HTMLElement} parent
   * @param {string} text
   */
  function appendText(parent, text) {
    parent.appendChild(document.createTextNode(text || ''));
  }

  // Export
  if (typeof root !== 'undefined') {
    root.SpopeerSanitize = { escapeHtml, sanitizeUrl, appendText };
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { escapeHtml, sanitizeUrl, appendText };
  }
})(typeof window !== 'undefined' ? window : this);
