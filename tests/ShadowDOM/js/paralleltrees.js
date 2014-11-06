/*
 * Copyright 2012 The Polymer Authors. All rights reserved.
 * Use of this source code is goverened by a BSD-style
 * license that can be found in the LICENSE file.
 */

suite('Parallel Trees', function() {

  var visual = ShadowDOMPolyfill.visual;
  var unwrapIfNeeded = ShadowDOMPolyfill.unwrapIfNeeded;

  function visualInsertBefore(node, child, ref) {
    visual.insertBefore(unwrapIfNeeded(node), unwrapIfNeeded(child), unwrapIfNeeded(ref));
  }

  function visualRemove(node) {
    visual.remove(unwrapIfNeeded(node));
  }


  var NodeInvalidate = Node.prototype.invalidateShadowRenderer_;
  setup(function() {
    Node.prototype.invalidateShadowRenderer_ = function() {
      return true;
    };
  });

  teardown(function() {
    Node.prototype.invalidateShadowRenderer_ = NodeInvalidate;
  });

  suite('Visual', function() {

    test('removeAllChildNodes', function() {
      var div = document.createElement('div');
      div.textContent = 'a';
      var textNode = div.firstChild;

      div.createShadowRoot();
      div.offsetWidth;

      expectVisualStructure(div, {});
      expectVisualStructure(textNode, {});

      expectStructure(div, {
        firstChild: textNode,
        lastChild: textNode
      });

      expectStructure(textNode, {
        parentNode: div
      });
    });

    test('removeAllChildNodes with 3 child nodes', function() {
      var div = document.createElement('div');
      div.innerHTML = '<a></a><b></b><c></c>';
      var a = div.firstChild;
      var b = a.nextSibling;
      var c = div.lastChild;

      div.createShadowRoot();
      div.offsetWidth;

      expectVisualStructure(div, {});
      expectVisualStructure(a, {});
      expectVisualStructure(b, {});
      expectVisualStructure(c, {});

      expectStructure(div, {
        firstChild: a,
        lastChild: c
      });

      expectStructure(a, {
        parentNode: div,
        nextSibling: b
      });

      expectStructure(b, {
        parentNode: div,
        previousSibling: a,
        nextSibling: c
      });

      expectStructure(c, {
        parentNode: div,
        previousSibling: b
      });
    });

    test('appendChild, start with no children', function() {
      var div = document.createElement('div');
      var textNode = document.createTextNode('hello');

      expectStructure(div, {});
      expectStructure(textNode, {});
      expectVisualStructure(div, {});
      expectVisualStructure(textNode, {});

      visualInsertBefore(div, textNode, null);

      expectVisualStructure(div, {
        firstChild: textNode,
        lastChild: textNode
      });

      expectVisualStructure(textNode, {
        parentNode: div
      });

      expectStructure(div, {});
      expectStructure(textNode, {});
    });

    test('appendChild, start with one child', function() {
      var div = document.createElement('div');
      div.innerHTML = '<a></a>';
      var a = div.firstChild;
      var b = document.createElement('b');

      visualInsertBefore(div, b, null);

      expectVisualStructure(div, {
        firstChild: a,
        lastChild: b
      });

      expectVisualStructure(a, {
        parentNode: div,
        nextSibling: b
      });

      expectVisualStructure(b, {
        parentNode: div,
        previousSibling: a
      });

      expectStructure(div, {
        firstChild: a,
        lastChild: a
      });

      expectStructure(a, {
        parentNode: div
      });
      expectStructure(b, {});
    });

    test('appendChild, start with two children', function() {
      var div = document.createElement('div');
      div.innerHTML = '<a></a><b></b>';
      var a = div.firstChild;
      var b = div.lastChild;
      var c = document.createElement('c');

      visualInsertBefore(div, c, null);

      expectVisualStructure(div, {
        firstChild: a,
        lastChild: c
      });

      expectVisualStructure(a, {
        parentNode: div,
        nextSibling: b
      });

      expectVisualStructure(b, {
        parentNode: div,
        previousSibling: a,
        nextSibling: c
      });

      expectVisualStructure(c, {
        parentNode: div,
        previousSibling: b
      });

      expectStructure(div, {
        firstChild: a,
        lastChild: b
      });

      expectStructure(a, {
        parentNode: div,
        nextSibling: b
      });

      expectStructure(b, {
        parentNode: div,
        previousSibling: a
      });

      expectStructure(c, {});
    });

    test('appendChild with document fragment again', function() {
      var div = document.createElement('div');
      div.innerHTML = '<a></a>';
      var a = div.lastChild;
      var df = document.createDocumentFragment();
      var b = df.appendChild(document.createElement('b'));
      var c = df.appendChild(document.createElement('c'));
      div.appendChild(df);

      expectStructure(df, {});

      expectStructure(div, {
        firstChild: a,
        lastChild: c
      });

      expectStructure(a, {
        parentNode: div,
        nextSibling: b
      });

      expectStructure(b, {
        parentNode: div,
        previousSibling: a,
        nextSibling: c
      });

      expectStructure(c, {
        parentNode: div,
        previousSibling: b
      });

      expectVisualStructure(df, {});

      expectVisualStructure(div, {
        firstChild: a,
        lastChild: c
      });

      expectVisualStructure(a, {
        parentNode: div,
        nextSibling: b
      });

      expectVisualStructure(b, {
        parentNode: div,
        previousSibling: a,
        nextSibling: c
      });

      expectVisualStructure(c, {
        parentNode: div,
        previousSibling: b
      });
    });

    test('appendChild with empty document fragment', function() {
      var div = document.createElement('div');
      div.innerHTML = '<a></a>';
      var a = div.lastChild;
      var df = document.createDocumentFragment();
      div.appendChild(df);

      expectStructure(df, {});

      expectStructure(div, {
        firstChild: a,
        lastChild: a
      });

      expectStructure(a, {
        parentNode: div
      });

      expectVisualStructure(df, {});

      expectVisualStructure(div, {
        firstChild: a,
        lastChild: a
      });

      expectVisualStructure(a, {
        parentNode: div
      });
    });

    test('insertBefore', function() {
      var a = document.createElement('a');
      var b = document.createElement('b');
      a.appendChild(b);

      expectVisualStructure(a, {
        firstChild: b,
        lastChild: b
      });
      expectVisualStructure(b, {
        parentNode: a
      });

      expectStructure(a, {
        firstChild: b,
        lastChild: b
      });
      expectStructure(b, {
        parentNode: a
      });

      var c = document.createElement('c');
      visualInsertBefore(a, c, b);

      expectVisualStructure(a, {
        firstChild: c,
        lastChild: b
      });
      expectVisualStructure(b, {
        parentNode: a,
        previousSibling: c
      });
      expectVisualStructure(c, {
        parentNode: a,
        nextSibling: b
      });

      expectStructure(a, {
        firstChild: b,
        lastChild: b
      });
      expectStructure(b, {
        parentNode: a
      });
      expectStructure(c, {});

      var d = document.createElement('d');
      visualInsertBefore(a, d, b);

      expectVisualStructure(a, {
        firstChild: c,
        lastChild: b
      });
      expectVisualStructure(b, {
        parentNode: a,
        previousSibling: d
      });
      expectVisualStructure(c, {
        parentNode: a,
        nextSibling: d
      });
      expectVisualStructure(d, {
        parentNode: a,
        nextSibling: b,
        previousSibling: c
      });

      expectStructure(a, {
        firstChild: b,
        lastChild: b
      });
      expectStructure(b, {
        parentNode: a
      });
      expectStructure(c, {});
      expectStructure(d, {});
    });

    test('insertBefore 2', function() {
      var a = document.createElement('a');
      var b = document.createElement('b');
      var c = document.createElement('b');
      a.appendChild(b);
      a.appendChild(c);

      expectVisualStructure(a, {
        firstChild: b,
        lastChild: c
      });
      expectVisualStructure(b, {
        parentNode: a,
        nextSibling: c
      });
      expectVisualStructure(c, {
        parentNode: a,
        previousSibling: b
      });

      expectStructure(a, {
        firstChild: b,
        lastChild: c
      });
      expectStructure(b, {
        parentNode: a,
        nextSibling: c
      });
      expectStructure(c, {
        parentNode: a,
        previousSibling: b
      });

      // b d c
      var d = document.createElement('d');
      visualInsertBefore(a, d, c);

      expectVisualStructure(a, {
        firstChild: b,
        lastChild: c
      });
      expectVisualStructure(b, {
        parentNode: a,
        nextSibling: d
      });
      expectVisualStructure(c, {
        parentNode: a,
        previousSibling: d
      });
      expectVisualStructure(d, {
        parentNode: a,
        previousSibling: b,
        nextSibling: c
      });

      expectStructure(a, {
        firstChild: b,
        lastChild: c
      });
      expectStructure(b, {
        parentNode: a,
        nextSibling: c
      });
      expectStructure(c, {
        parentNode: a,
        previousSibling: b
      });
      expectStructure(d, {});
    });

    test('removeChild, start with one child', function() {
      var div = document.createElement('div');
      div.innerHTML = '<a></a>';
      var a = div.firstChild;

      visualRemove(a);

      expectVisualStructure(div, {});
      expectVisualStructure(a, {});

      expectStructure(div, {
        firstChild: a,
        lastChild: a
      });

      expectStructure(a, {
        parentNode: div
      });
    });

    test('removeChild, start with two children, remove first', function() {
      var div = document.createElement('div');
      div.innerHTML = '<a></a><b></b>';
      var a = div.firstChild;
      var b = div.lastChild;

      visualRemove(a);

      expectVisualStructure(div, {
        firstChild: b,
        lastChild: b
      });

      expectVisualStructure(a, {});

      expectVisualStructure(b, {
        parentNode: div
      });

      expectStructure(div, {
        firstChild: a,
        lastChild: b
      });

      expectStructure(a, {
        parentNode: div,
        nextSibling: b
      });

      expectStructure(b, {
        parentNode: div,
        previousSibling: a
      });
    });

    test('removeChild, start with two children, remove last', function() {
      var div = document.createElement('div');
      div.innerHTML = '<a></a><b></b>';
      var a = div.firstChild;
      var b = div.lastChild;

      visualRemove(b);

      expectVisualStructure(div, {
        firstChild: a,
        lastChild: a
      });

      expectVisualStructure(a, {
        parentNode: div
      });

      expectVisualStructure(b, {});

      expectStructure(div, {
        firstChild: a,
        lastChild: b
      });

      expectStructure(a, {
        parentNode: div,
        nextSibling: b
      });

      expectStructure(b, {
        parentNode: div,
        previousSibling: a
      });
    });

    test('removeChild, start with three children, remove middle', function() {
      var div = document.createElement('div');
      div.innerHTML = '<a></a><b></b><c></c>';
      var a = div.firstChild;
      var b = a.nextSibling;
      var c = div.lastChild;

      visualRemove(b);

      expectVisualStructure(div, {
        firstChild: a,
        lastChild: c
      });

      expectVisualStructure(a, {
        parentNode: div,
        nextSibling: c
      });

      expectVisualStructure(b, {});

      expectVisualStructure(c, {
        parentNode: div,
        previousSibling: a
      });

      expectStructure(div, {
        firstChild: a,
        lastChild: c
      });

      expectStructure(a, {
        parentNode: div,
        nextSibling: b
      });

      expectStructure(b, {
        parentNode: div,
        previousSibling: a,
        nextSibling: c
      });

      expectStructure(c, {
        parentNode: div,
        previousSibling: b
      });
    });
  });

  suite('Logical', function() {
    suite('removeAllChildNodes', function() {
      test('simple', function() {
        var div = document.createElement('div');
        div.innerHTML = '<a></a><b></b><c></c>';
        var a = div.firstChild;
        var b = a.nextSibling;
        var c = div.lastChild;

        div.textContent = '';

        expectVisualStructure(div, {});
        expectVisualStructure(a, {});
        expectVisualStructure(b, {});
        expectVisualStructure(c, {});


        expectStructure(div, {});
        expectStructure(a, {});
        expectStructure(b, {});
        expectStructure(c, {});
      });

      test('with nodes before removal', function() {
        var div = document.createElement('div');
        div.innerHTML = '<a></a><b></b><c></c>';
        var a = div.firstChild;
        var b = a.nextSibling;
        var c = div.lastChild;

        div.textContent = '';

        expectVisualStructure(div, {});
        expectVisualStructure(a, {});
        expectVisualStructure(b, {});
        expectVisualStructure(c, {});

        expectStructure(div, {});
        expectStructure(a, {});
        expectStructure(b, {});
        expectStructure(c, {});
      });

      test('change visual first', function() {
        var div = document.createElement('div');
        div.innerHTML = '<a></a><b></b><c></c>';
        var a = div.firstChild;
        var b = a.nextSibling;
        var c = div.lastChild;

        div.createShadowRoot();
        div.offsetWidth;

        expectVisualStructure(div, {});
        expectVisualStructure(a, {});
        expectVisualStructure(b, {});
        expectVisualStructure(c, {});

        div.textContent = '';

        expectStructure(div, {});
        expectStructure(a, {});
        expectStructure(b, {});
        expectStructure(c, {});
      });
    });

    suite('appendChild', function() {
      test('simple', function() {
        var div = document.createElement('div');
        div.innerHTML = '<a></a><b></b>';
        var a = div.firstChild;
        var b = a.nextSibling;
        var c = document.createElement('c');

        div.appendChild(c);

        expectVisualStructure(div, {
          firstChild: a,
          lastChild: c
        });
        expectVisualStructure(a, {
          parentNode: div,
          nextSibling: b
        });
        expectVisualStructure(b, {
          parentNode: div,
          previousSibling: a,
          nextSibling: c
        });
        expectVisualStructure(c, {
          parentNode: div,
          previousSibling: b
        });

        expectStructure(div, {
          firstChild: a,
          lastChild: c
        });
        expectStructure(a, {
          parentNode: div,
          nextSibling: b
        });
        expectStructure(b, {
          parentNode: div,
          previousSibling: a,
          nextSibling: c
        });
        expectStructure(c, {
          parentNode: div,
          previousSibling: b
        });
      });

      test('with nodes before', function() {
        var div = document.createElement('div');
        div.innerHTML = '<a></a><b></b>';
        var a = div.firstChild;
        var b = a.nextSibling;
        var c = document.createElement('c');

        div.appendChild(c);

        expectVisualStructure(div, {
          firstChild: a,
          lastChild: c
        });
        expectVisualStructure(a, {
          parentNode: div,
          nextSibling: b
        });
        expectVisualStructure(b, {
          parentNode: div,
          previousSibling: a,
          nextSibling: c
        });
        expectVisualStructure(c, {
          parentNode: div,
          previousSibling: b
        });

        expectStructure(div, {
          firstChild: a,
          lastChild: c
        });
        expectStructure(a, {
          parentNode: div,
          nextSibling: b
        });
        expectStructure(b, {
          parentNode: div,
          previousSibling: a,
          nextSibling: c
        });
        expectStructure(c, {
          parentNode: div,
          previousSibling: b
        });
      });

      test('change visual first', function() {
        var div = document.createElement('div');
        div.innerHTML = '<a></a><b></b>';
        var a = div.firstChild;
        var b = a.nextSibling;
        var c = document.createElement('c');

        div.createShadowRoot();
        div.offsetWidth;

        div.appendChild(c);

        expectVisualStructure(div, {
          firstChild: c,
          lastChild: c
        });
        expectVisualStructure(a, {});
        expectVisualStructure(b, {});
        expectVisualStructure(c, {
          parentNode: div
        });

        expectStructure(div, {
          firstChild: a,
          lastChild: c
        });
        expectStructure(a, {
          parentNode: div,
          nextSibling: b
        });
        expectStructure(b, {
          parentNode: div,
          previousSibling: a,
          nextSibling: c
        });
        expectStructure(c, {
          parentNode: div,
          previousSibling: b
        });
      });
    });

    suite('insertBefore', function() {
      test('simple', function() {
        var div = document.createElement('div');
        div.innerHTML = '<a></a><c></c>';
        var a = div.firstChild;
        var c = a.nextSibling;
        var b = document.createElement('b');

        div.insertBefore(b, c);

        expectVisualStructure(div, {
          firstChild: a,
          lastChild: c
        });
        expectVisualStructure(a, {
          parentNode: div,
          nextSibling: b
        });
        expectVisualStructure(b, {
          parentNode: div,
          previousSibling: a,
          nextSibling: c
        });
        expectVisualStructure(c, {
          parentNode: div,
          previousSibling: b
        });

        expectStructure(div, {
          firstChild: a,
          lastChild: c
        });
        expectStructure(a, {
          parentNode: div,
          nextSibling: b
        });
        expectStructure(b, {
          parentNode: div,
          previousSibling: a,
          nextSibling: c
        });
        expectStructure(c, {
          parentNode: div,
          previousSibling: b
        });
      });

      test('with nodes before', function() {
        var div = document.createElement('div');
        div.innerHTML = '<a></a><c></c>';
        var a = div.firstChild;
        var c = a.nextSibling;
        var b = document.createElement('b');

        div.insertBefore(b, c);

        expectVisualStructure(div, {
          firstChild: a,
          lastChild: c
        });
        expectVisualStructure(a, {
          parentNode: div,
          nextSibling: b
        });
        expectVisualStructure(b, {
          parentNode: div,
          previousSibling: a,
          nextSibling: c
        });
        expectVisualStructure(c, {
          parentNode: div,
          previousSibling: b
        });

        expectStructure(div, {
          firstChild: a,
          lastChild: c
        });
        expectStructure(a, {
          parentNode: div,
          nextSibling: b
        });
        expectStructure(b, {
          parentNode: div,
          previousSibling: a,
          nextSibling: c
        });
        expectStructure(c, {
          parentNode: div,
          previousSibling: b
        });
      });

      test('change visual first', function() {
        var div = document.createElement('div');
        div.innerHTML = '<a></a><c></c>';
        var a = div.firstChild;
        var c = a.nextSibling;
        var b = document.createElement('b');

        div.createShadowRoot();
        div.offsetWidth;

        div.insertBefore(b, c);

        expectVisualStructure(div, {});
        expectVisualStructure(a, {});
        expectVisualStructure(b, {});
        expectVisualStructure(c, {});

        expectStructure(div, {
          firstChild: a,
          lastChild: c
        });
        expectStructure(a, {
          parentNode: div,
          nextSibling: b
        });
        expectStructure(b, {
          parentNode: div,
          previousSibling: a,
          nextSibling: c
        });
        expectStructure(c, {
          parentNode: div,
          previousSibling: b
        });

        // swap a and b
        div.insertBefore(b, a);

        expectStructure(div, {
          firstChild: b,
          lastChild: c
        });
        expectStructure(b, {
          parentNode: div,
          nextSibling: a
        });
        expectStructure(a, {
          parentNode: div,
          previousSibling: b,
          nextSibling: c
        });
        expectStructure(c, {
          parentNode: div,
          previousSibling: a
        });

        // swap a and c
        div.insertBefore(c, a);

        expectStructure(div, {
          firstChild: b,
          lastChild: a
        });
        expectStructure(b, {
          parentNode: div,
          nextSibling: c
        });
        expectStructure(c, {
          parentNode: div,
          previousSibling: b,
          nextSibling: a
        });
        expectStructure(a, {
          parentNode: div,
          previousSibling: c
        });
      });
    });

    test('insertBefore with document fragment', function() {
      var div = document.createElement('div');
      var c = div.appendChild(document.createElement('c'));
      var df = document.createDocumentFragment();
      var a = df.appendChild(document.createElement('a'));
      var b = df.appendChild(document.createElement('b'));

      div.createShadowRoot();
      div.offsetWidth;

      div.insertBefore(df, c);

      expectVisualStructure(div, {});
      expectVisualStructure(df, {});
      expectVisualStructure(a, {});
      expectVisualStructure(b, {});
      expectVisualStructure(c, {});

      expectStructure(div, {
        firstChild: a,
        lastChild: c
      });

      expectStructure(df, {});

      expectStructure(a, {
        parentNode: div,
        nextSibling: b
      });

      expectStructure(b, {
        parentNode: div,
        previousSibling: a,
        nextSibling: c
      });

      expectStructure(c, {
        parentNode: div,
        previousSibling: b
      });
    });

    test('insertBefore with document fragment again', function() {
      var div = document.createElement('div');
      div.innerHTML = '<a></a><d></d>';
      var a = div.firstChild;
      var d = div.lastChild;

      var df = document.createDocumentFragment();
      var b = df.appendChild(document.createElement('b'));
      var c = df.appendChild(document.createElement('c'));

      div.insertBefore(df, d);

      expectStructure(df, {});

      expectStructure(div, {
        firstChild: a,
        lastChild: d
      });

      expectStructure(a, {
        parentNode: div,
        nextSibling: b
      });

      expectStructure(b, {
        parentNode: div,
        previousSibling: a,
        nextSibling: c
      });

      expectStructure(c, {
        parentNode: div,
        previousSibling: b,
        nextSibling: d
      });

      expectStructure(d, {
        parentNode: div,
        previousSibling: c
      });

      expectVisualStructure(df, {});

      expectVisualStructure(div, {
        firstChild: a,
        lastChild: d
      });

      expectVisualStructure(a, {
        parentNode: div,
        nextSibling: b
      });

      expectVisualStructure(b, {
        parentNode: div,
        previousSibling: a,
        nextSibling: c
      });

      expectVisualStructure(c, {
        parentNode: div,
        previousSibling: b,
        nextSibling: d
      });

      expectVisualStructure(d, {
        parentNode: div,
        previousSibling: c
      });
    });

    test('insertBefore with different documents', function() {
      var doc = document.implementation.createHTMLDocument('');
      var div = doc.createElement('div');
      div.innerHTML = '<a></a><b></b>';
      var a = div.firstChild;
      var b = div.lastChild;

      div.createShadowRoot();
      div.offsetWidth;

      expectStructure(div, {
        firstChild: a,
        lastChild: b
      });

      expectStructure(a, {
        parentNode: div,
        nextSibling: b
      });

      expectStructure(b, {
        parentNode: div,
        previousSibling: a
      });

      var c = document.createElement('c');
      div.insertBefore(c, b);

      expectStructure(div, {
        firstChild: a,
        lastChild: b
      });

      expectStructure(a, {
        parentNode: div,
        nextSibling: c
      });

      expectStructure(b, {
        parentNode: div,
        previousSibling: c
      });

      expectStructure(c, {
        parentNode: div,
        previousSibling: a,
        nextSibling: b,
      });

      assert.equal(div.ownerDocument, doc);
      assert.equal(a.ownerDocument, div.ownerDocument);
      assert.equal(b.ownerDocument, div.ownerDocument);
      assert.equal(c.ownerDocument, div.ownerDocument);
    });

    suite('replaceChild', function() {
      test('simple', function() {
        var div = document.createElement('div');
        div.innerHTML = '<a></a><c></c>';
        var a = div.firstChild;
        var c = a.nextSibling;
        var b = document.createElement('b');

        div.replaceChild(b, c);

        expectVisualStructure(div, {
          firstChild: a,
          lastChild: b
        });
        expectVisualStructure(a, {
          parentNode: div,
          nextSibling: b
        });
        expectVisualStructure(b, {
          parentNode: div,
          previousSibling: a
        });
        expectVisualStructure(c, {});

        expectStructure(div, {
          firstChild: a,
          lastChild: b
        });
        expectStructure(a, {
          parentNode: div,
          nextSibling: b
        });
        expectStructure(b, {
          parentNode: div,
          previousSibling: a
        });
        expectStructure(c, {});
      });

      test('with nodes before', function() {
        var div = document.createElement('div');
        div.innerHTML = '<a></a><c></c>';
        var a = div.firstChild;
        var c = a.nextSibling;
        var b = document.createElement('b');

        div.replaceChild(b, c);

        expectStructure(div, {
          firstChild: a,
          lastChild: b
        });
        expectStructure(a, {
          parentNode: div,
          nextSibling: b
        });
        expectStructure(b, {
          parentNode: div,
          previousSibling: a
        });
        expectStructure(c, {});

        expectStructure(div, {
          firstChild: a,
          lastChild: b
        });
        expectStructure(a, {
          parentNode: div,
          nextSibling: b
        });
        expectStructure(b, {
          parentNode: div,
          previousSibling: a
        });
        expectStructure(c, {});
      });

      test('change visual first', function() {
        var div = document.createElement('div');
        div.innerHTML = '<a></a><c></c>';
        var a = div.firstChild;
        var c = a.nextSibling;
        var b = document.createElement('b');

        div.createShadowRoot();
        div.offsetWidth;

        div.replaceChild(b, c);

        expectVisualStructure(div, {});
        expectVisualStructure(a, {});
        expectVisualStructure(b, {});
        expectVisualStructure(c, {});

        expectStructure(div, {
          firstChild: a,
          lastChild: b
        });
        expectStructure(a, {
          parentNode: div,
          nextSibling: b
        });
        expectStructure(b, {
          parentNode: div,
          previousSibling: a
        });
        expectStructure(c, {});

        // Remove a
        div.replaceChild(b, a);

        expectStructure(div, {
          firstChild: b,
          lastChild: b
        });
        expectStructure(a, {});
        expectStructure(b, {
          parentNode: div
        });
        expectStructure(c, {});

        // Swap b with c
        div.replaceChild(c, b);

        expectStructure(div, {
          firstChild: c,
          lastChild: c
        });
        expectStructure(a, {});
        expectStructure(b, {});
        expectStructure(c, {
          parentNode: div
        });
      });

      test('replaceChild with document fragment', function() {
        var div = document.createElement('div');
        div.innerHTML = '<a></a><e></e><d></d>';
        var a = div.firstChild;
        var e = a.nextSibling;
        var d = e.nextSibling;
        var df = document.createDocumentFragment();
        var b = df.appendChild(document.createElement('b'));
        var c = df.appendChild(document.createElement('c'));

        div.replaceChild(df, e);

        expectStructure(df, {});
        expectStructure(e, {});

        expectStructure(div, {
          firstChild: a,
          lastChild: d
        });

        expectStructure(a, {
          parentNode: div,
          nextSibling: b
        });

        expectStructure(b, {
          parentNode: div,
          previousSibling: a,
          nextSibling: c
        });

        expectStructure(c, {
          parentNode: div,
          previousSibling: b,
          nextSibling: d
        });

        expectStructure(d, {
          parentNode: div,
          previousSibling: c
        });

        expectVisualStructure(df, {});
        expectVisualStructure(e, {});

        expectVisualStructure(div, {
          firstChild: a,
          lastChild: d
        });

        expectVisualStructure(a, {
          parentNode: div,
          nextSibling: b
        });

        expectVisualStructure(b, {
          parentNode: div,
          previousSibling: a,
          nextSibling: c
        });

        expectVisualStructure(c, {
          parentNode: div,
          previousSibling: b,
          nextSibling: d
        });

        expectVisualStructure(d, {
          parentNode: div,
          previousSibling: c
        });

      });

    });

  });

  test('innerHTML', function() {
    var doc = document;
    var div = doc.createElement('div');
    div.innerHTML = '<a></a>';

    div.createShadowRoot();
    div.offsetWidth;

    var a = div.firstChild;

    div.innerHTML = '<b></b>';

    assert.equal(div.firstChild.tagName, 'B');
  });

});