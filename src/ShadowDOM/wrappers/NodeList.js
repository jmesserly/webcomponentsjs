// Copyright 2012 The Polymer Authors. All rights reserved.
// Use of this source code is goverened by a BSD-style
// license that can be found in the LICENSE file.

(function(scope) {
  'use strict';

  var nonEnumDescriptor = {enumerable: false};

  function nonEnum(obj, prop) {
    Object.defineProperty(obj, prop, nonEnumDescriptor);
  }

  function NodeList() {
    this.length = 0;
    nonEnum(this, 'length');
  }
  NodeList.prototype = {
    item: function(index) {
      return this[index];
    }
  };
  nonEnum(NodeList.prototype, 'item');

  scope.wrappers.NodeList = NodeList;

  // TODO(jmesserly): this is a bit sketchy. We can't create real NodeLists, so
  // we probably shouldn't be lying about ours. Probably we should move this
  // only to tests.
  window.NodeList = NodeList;

})(window.ShadowDOMPolyfill);
