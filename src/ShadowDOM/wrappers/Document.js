// Copyright 2013 The Polymer Authors. All rights reserved.
// Use of this source code is goverened by a BSD-style
// license that can be found in the LICENSE file.

(function(scope) {
  'use strict';

  var ShadowRoot = scope.ShadowRoot;
  var cloneNode = scope.cloneNode;
  var elementFromPoint = scope.elementFromPoint;
  var matchesNames = scope.matchesNames;
  var mixin = scope.mixin;
  var renderAllPending = scope.renderAllPending;

  var implementationTable = new WeakMap();

  var Document = window.Document;

  var originalAdoptNode = document.adoptNode;

  function adoptNodeNoRemove(node, doc) {
    originalAdoptNode.call(doc, node);
    adoptSubtree(node, doc);
  }

  function adoptSubtree(node, doc) {
    if (node.shadowRoot)
      doc.adoptNode(node.shadowRoot);
    if (node instanceof ShadowRoot)
      adoptOlderShadowRoots(node, doc);
    for (var child = node.firstChild; child; child = child.nextSibling) {
      adoptSubtree(child, doc);
    }
  }

  function adoptOlderShadowRoots(shadowRoot, doc) {
    var oldShadowRoot = shadowRoot.olderShadowRoot;
    if (oldShadowRoot)
      doc.adoptNode(oldShadowRoot);
  }

  var originalGetSelection = document.getSelection;

  mixin(Document.prototype, {
    adoptNode: function(node) {
      if (node.parentNode)
        node.parentNode.removeChild(node);
      adoptNodeNoRemove(node, this);
      return node;
    },
    elementFromPoint: function(x, y) {
      return elementFromPoint(this, this, x, y);
    },
    importNode: function(node, deep) {
      return cloneNode(node, deep, this);
    },
    getSelection: function() {
      renderAllPending();
      return originalGetSelection.call(this);
    },
  });
  mixin(Document.prototype, scope.GetElementsByInterface);
  mixin(Document.prototype, scope.ParentNodeInterface);
  mixin(Document.prototype, scope.SelectorsInterface);

  var proto = Document.prototype.getElementsByName ?
      Document.prototype : HTMLDocument.prototype;
  proto.getElementsByName = function(name) {
    return scope.SelectorsInterface.querySelectorAll.call(this,
        '[name=' + JSON.stringify(String(name)) + ']');
  };

  scope.adoptNodeNoRemove = adoptNodeNoRemove;

})(window.ShadowDOMPolyfill);
