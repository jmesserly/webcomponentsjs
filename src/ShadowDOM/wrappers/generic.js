// Copyright 2013 The Polymer Authors. All rights reserved.
// Use of this source code is goverened by a BSD-style
// license that can be found in the LICENSE file.

(function(scope) {
  'use strict';

  var mixin = scope.mixin;

  mixin(DocumentFragment.prototype, scope.ParentNodeInterface);
  mixin(DocumentFragment.prototype, scope.SelectorsInterface);
  mixin(DocumentFragment.prototype, scope.GetElementsByInterface);

})(window.ShadowDOMPolyfill);
