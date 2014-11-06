/**
 * Copyright 2014 The Polymer Authors. All rights reserved.
 * Use of this source code is goverened by a BSD-style
 * license that can be found in the LICENSE file.
 */

suite('TreeScope', function() {

  var getTreeRoot = ShadowDOMPolyfill.getTreeRoot;
  var getTreeRootParent = ShadowDOMPolyfill.getTreeRootParent;
  var unwrap = ShadowDOMPolyfill.unwrap;

  test('Basic', function() {
    var div = document.createElement('div');

    var ts = getTreeRoot(div);
    assert.equal(ts, unwrap(div));

    div.innerHTML = '<a><b></b></a>';
    var a = div.firstChild;
    var b = a.firstChild;

    assert.equal(getTreeRoot(a), ts);
    assert.equal(getTreeRoot(b), ts);
  });

  test('ShadowRoot', function() {
    var div = document.createElement('div');

    var ts = getTreeRoot(div);
    assert.equal(ts, unwrap(div));

    div.innerHTML = '<a><b></b></a>';
    var a = div.firstChild;
    var b = a.firstChild;

    var sr = a.createShadowRoot();

    var srTs = getTreeRoot(sr);
    assert.equal(srTs, unwrap(sr));
    assert.equal(getTreeRootParent(srTs), ts);

    sr.innerHTML = '<c><d></d></c>';
    var c = sr.firstChild;
    var d = c.firstChild;

    assert.equal(getTreeRoot(c), srTs);
    assert.equal(getTreeRoot(d), srTs);
  });

  test('change parent in shadow', function() {
    var div = document.createElement('div');
    div.innerHTML = '<a></a>';
    var a = div.firstChild;

    var sr = a.createShadowRoot();
    sr.innerHTML = '<b></b>';
    var b = sr.firstChild;

    var sr2 = b.createShadowRoot();
    sr2.innerHTML = '<c></c>';
    var c = sr2.firstChild;

    var sr3 = a.createShadowRoot();
    sr3.innerHTML = '<d></d>';
    var d = sr3.firstChild;

    var ts1 = getTreeRoot(a);
    var ts2 = getTreeRoot(b);
    var ts3 = getTreeRoot(c);
    var ts4 = getTreeRoot(d);

    assert.equal(getTreeRootParent(ts1), null);
    assert.equal(getTreeRootParent(ts2), ts1);
    assert.equal(getTreeRootParent(ts3), ts2);
    assert.equal(getTreeRootParent(ts4), ts2);

    var div2 = document.createElement('div');
    div2.appendChild(a);

    var ts5 = getTreeRoot(a);
    assert.notEqual(ts1, ts5);
    assert.equal(getTreeRootParent(ts2), ts5);
    assert.equal(getTreeRootParent(ts3), ts2);
    assert.equal(getTreeRootParent(ts4), ts2);
  });

});
