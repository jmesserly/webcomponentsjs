// Copyright 2013 The Polymer Authors. All rights reserved.
// Use of this source code is goverened by a BSD-style
// license that can be found in the LICENSE file.

(function(scope) {
  'use strict';

  var copyProperty = scope.copyProperty;
  var enqueueMutation = scope.enqueueMutation;
  var mixin = scope.mixin;

  mixin(CharacterData.prototype, scope.ChildNodeInterface);

  copyProperty(CharacterData, 'data', 'textContent');

})(window.ShadowDOMPolyfill);
