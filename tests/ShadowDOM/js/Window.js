/*
 * Copyright 2013 The Polymer Authors. All rights reserved.
 * Use of this source code is goverened by a BSD-style
 * license that can be found in the LICENSE file.
 */

suite('Window', function() {

  var wrap = ShadowDOMPolyfill.wrap;

  test('addEventListener', function() {
    var calls = 0;
    window.addEventListener('click', function f(e) {
      calls++;
      assert.equal(this, window);
      assert.equal(e.target, document.body);
      assert.equal(e.currentTarget, this);
      window.removeEventListener('click', f);
    });

    addEventListener('click', function f(e) {
      calls++;
      assert.equal(this, window);
      assert.equal(e.target, document.body);
      assert.equal(e.currentTarget, this);
      removeEventListener('click', f);
    });

    document.body.click();
    assert.equal(2, calls);

    document.body.click();
    assert.equal(2, calls);
  });

  test('getComputedStyle', function() {
    var div = document.createElement('div');
    var cs = window.getComputedStyle(div);
    assert.isTrue(cs != null);

    div = document.createElement('div');
    cs = wrap(window).getComputedStyle(div);
    assert.isTrue(cs != null);

    div = document.createElement('div');
    cs = getComputedStyle(div);
    assert.isTrue(cs != null);
  });

  test('getComputedStyleShadow', function() {
    var host = document.createElement('div');
    var root = host.createShadowRoot();
    var elt = document.createElement('div');
    root.appendChild(elt);
    document.body.appendChild(host);
    elt.style.padding = '4px';
    assert.equal(getComputedStyle(elt).paddingLeft, '4px');
    document.body.removeChild(host);
  });

  test('instanceof', function() {
    var win = wrap(window);
    assert.instanceOf(win, Window);
  });

  test('constructor', function() {
    var win = wrap(window);
    assert.equal(Window, win.constructor);
  });

});
