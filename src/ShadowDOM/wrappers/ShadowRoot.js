// Copyright 2013 The Polymer Authors. All rights reserved.
// Use of this source code is goverened by a BSD-style
// license that can be found in the LICENSE file.

(function(scope) {
  'use strict';

  var elementFromPoint = scope.elementFromPoint;
  var getInnerHTML = scope.getInnerHTML;
  var isInsertionPoint = scope.isInsertionPoint;
  var mixin = scope.mixin;
  var setInnerHTML = scope.setInnerHTML;

  var shadowHostTable = new WeakMap();
  var nextOlderShadowTreeTable = new WeakMap();

  var spaceCharRe = /[ \t\n\r\f]/;

  function createShadowRoot(host) {
    var self = host.ownerDocument.createDocumentFragment();
    // TODO(jmesserly): can we avoid setting proto here? Should we just leave
    // ShadowRoot as a wrapper around a DocumentFragment?
    self.__proto__ = ShadowRoot.prototype;

    var oldShadowRoot = host.shadowRoot;
    nextOlderShadowTreeTable.set(self, oldShadowRoot);

    self.ownerShadowRoot_ = self;

    shadowHostTable.set(self, host);
    return self;
  }

  function ShadowRoot() {
    throw TypeError('illegal constructor');
  }
  ShadowRoot.prototype = Object.create(DocumentFragment.prototype);
  mixin(ShadowRoot.prototype, {
    constructor: ShadowRoot,

    get innerHTML() {
      return getInnerHTML(this);
    },
    set innerHTML(value) {
      setInnerHTML(this, value);
      this.invalidateShadowRenderer_();
    },

    get olderShadowRoot() {
      return nextOlderShadowTreeTable.get(this) || null;
    },

    get host() {
      return shadowHostTable.get(this) || null;
    },

    elementFromPoint: function(x, y) {
      return elementFromPoint(this, this.ownerDocument, x, y);
    },

    getElementById: function(id) {
      if (spaceCharRe.test(id))
        return null;
      return this.querySelector('[id="' + id + '"]');
    },

    /**
     * Called after nodes are inserted.
     * @private
     */
    nodesWereAdded_: function(nodes) {
      for (var i = 0; i < nodes.length; i++) {
        this.nodeWasAdded_(nodes[i]);
      }
    },

    nodeWasAdded_: function(node) {
      node.ownerShadowRoot_ = this;

      var name = node.localName;
      if (name == 'content' || name == 'shadow') {
        // Invalidate old renderer if any.
        node.invalidateShadowRenderer_();

        var renderer = scope.getRendererForHost(this.host);
        node.polymerShadowRenderer_ = renderer;
        renderer.invalidate();
      }

      for (var c = node.firstChild; c; c = c.nextSibling) {
        this.nodeWasAdded_(c);
      }
    }
  });

  scope.createShadowRoot = createShadowRoot;
  scope.ShadowRoot = ShadowRoot;
  window.ShadowRoot = ShadowRoot;

})(window.ShadowDOMPolyfill);
