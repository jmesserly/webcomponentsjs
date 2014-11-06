// Copyright 2013 The Polymer Authors. All rights reserved.
// Use of this source code is goverened by a BSD-style
// license that can be found in the LICENSE file.

(function(scope) {
  'use strict';

  var EventTarget = scope.wrappers.EventTarget;
  var mixin = scope.mixin;
  var renderAllPending = scope.renderAllPending;

  var Window = window.Window;
  var originalGetComputedStyle = window.getComputedStyle;
  var originalGetDefaultComputedStyle = window.getDefaultComputedStyle;
  var originalGetSelection = window.getSelection;

  Window.prototype.getComputedStyle = function(el, pseudo) {
    renderAllPending();
    return originalGetComputedStyle.call(this, el, pseudo);
  };

  Window.prototype.getSelection = function() {
    renderAllPending();
    return originalGetSelection.call(this);
  };

  // Work around for https://bugzilla.mozilla.org/show_bug.cgi?id=943065
  delete window.getComputedStyle;
  delete window.getDefaultComputedStyle;
  delete window.getSelection;

  scope.Window = Window;

})(window.ShadowDOMPolyfill);
