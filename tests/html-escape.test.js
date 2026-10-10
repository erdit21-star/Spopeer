const test = require('node:test');
const assert = require('node:assert/strict');
const { escapeHtml } = require('../server/utils/htmlEscape');

test('escapeHtml encodes HTML markup and attribute delimiters', () => {
  assert.equal(
    escapeHtml('<script>alert("x")</script> & \'test\''),
    '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; &#39;test&#39;'
  );
});

test('escapeHtml safely handles nullish and non-string values', () => {
  assert.equal(escapeHtml(null), '');
  assert.equal(escapeHtml(undefined), '');
  assert.equal(escapeHtml(42), '42');
});
