#!/usr/bin/env node

var connect = require('connect');
var esprima = require('esprima');
var serveStatic = require('serve-static');
var serveIndex = require('serve-index');
var serveTransform = require('connect-static-transform');

var PREFIX = '__$';
var RAW_PREFIX = '__raw$';

var propertyNames = {
  'childElementCount': 1,
  'childNodes': 1,
  'children': 1,
  'classList': 1,
  'className': 1,
  'clientHeight': 1,
  'clientLeft': 1,
  'clientTop': 1,
  'clientWidth': 1,
  'currentTarget': 1,
  'data': 1,
  'eventPhase': 1,
  'firstChild': 1,
  'firstElementChild': 1,
  'hidden': 1,
  'id': 1,
  'innerHTML': 1,
  'lastChild': 1,
  'lastElementChild': 1,
  'nextElementSibling': 1,
  'nextSibling': 1,
  'offsetHeight': 1,
  'offsetLeft': 1,
  'offsetTop': 1,
  'offsetWidth': 1,
  'outerHTML': 1,
  'parentElement': 1,
  'parentNode': 1,
  'path': 1,
  'previousElementSibling': 1,
  'previousSibling': 1,
  'relatedTarget': 1,
  'scrollHeight': 1,
  'scrollLeft': 1,
  'scrollTop': 1,
  'scrollWidth': 1,
  'select': 1,
  'shadowRoot': 1,
  'target': 1,
  'textContent': 1,
};

// Applies a series of edits to the text and returns the new string.
// The edits are expressed as an object like:
// 
//     {'range': [start, edit], 'value': replacementText}
// 
// All positions are expressed in terms of the original text.
// Overlapping edits are not supported.
function applyEdits(text, edits) {
  if (edits.length == 0) return text;

  // Sort edits by start location.
  edits.sort(function(x, y) {
    var diff = x.range[0] - y.range[0];
    if (diff != 0) return diff;
    return x.range[1] - y.range[1];
  });

  var consumed = 0;
  var out = '';
  edits.forEach(function(edit) {
    if (consumed > edit.range[0]) {
      var msg = 'Overlapping edits. Edit number ' + i + ' at offset ' +
          edit.range[0] + ' but have consumed ' + consumed +
          ' input characters. List of edits:\n';
      edits.forEach(function(e) {
        msg += 'Edit @ ' + e.range[0] + ',' + e.range[1] + ': "' + e.value +
            '")\n';
      });
      throw msg;
    }

    // Add characters from the original string between this edit and the last
    // one, if any.
    var betweenEdits = text.substring(consumed, edit.range[0]);
    out += betweenEdits + edit.value;
    consumed = edit.range[1];
  });

  // Add any text from the end of the original string that was not replaced.
  out += text.substring(consumed);
  return out;
}

// Replaces the property names when they appear as identifiers.
function rewritePropertyNames(text) {
  var tokens = esprima.tokenize(text, { tolerant: true, range: true })

  var edits = [];
  tokens.forEach(function(token) {
    if (token.type != 'Identifier') return;

    var value = token.value;
    if (value.indexOf(RAW_PREFIX) == 0) {
      var rawName = value.substring(RAW_PREFIX.length);
      if (propertyNames.hasOwnProperty(rawName)) {
        edits.push({range: token.range, value: rawName});
      }
    } else if (propertyNames.hasOwnProperty(value)) {
      edits.push({range: token.range, value: PREFIX + token.value});
    }
  });

  return applyEdits(text, edits);
}

function endsWith(left, right) {
  return left.lastIndexOf(right) + right.length == left.length;
}

function transform(path, text, send) {
  text = rewritePropertyNames(text);
  send(text, {'Content-Type': 'application/javascript'});
}

// TODO(jmesserly): need to transform inline script tags in HTML too.
var dir = process.cwd();
connect()
    .use(serveTransform({
      root: dir,
      match: /.+\.js/,
      transform: transform
    }))
    .use(serveStatic(dir))
    .use(serveIndex(dir, {icons: true, view: 'details'}))
    .listen(8000);

console.log('dom-accessors.js dev server listening on http://localhost:8000/');
