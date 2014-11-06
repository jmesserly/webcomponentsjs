// Copyright 2013 The Polymer Authors. All rights reserved.
// Use of this source code is goverened by a BSD-style
// license that can be found in the LICENSE file.

(function(scope) {
  'use strict';

  var HTMLElement = window.HTMLElement;
  var Element = window.Element;
  var mixin = scope.mixin;

  var HTMLContentElement = window.HTMLContentElement || window.HTMLUnknownElement;
  var HTMLShadowElement = window.HTMLShadowElement || window.HTMLUnknownElement;

  mixin(HTMLContentElement.prototype, {
    constructor: HTMLContentElement,

    get select() {
      return this.getAttribute('select');
    },
    set select(value) {
      this.setAttribute('select', value);
    },

    setAttribute: function(n, v) {
      Element.prototype.setAttribute.call(this, n, v);
      if (String(n).toLowerCase() === 'select') {
        this.invalidateShadowRenderer_();
      }
    }

    // getDistributedNodes is added in ShadowRenderer
  });

  // TODO(jmesserly): we could add these to window, but it feels wrong, because
  // any HTMLUnknownElement would be instanceof HTMLContentElement.
  // TemplateBinding does more sophisticated treatment of these; perhaps we
  // should too.
  scope.HTMLContentElement = HTMLContentElement;
  scope.HTMLShadowElement = HTMLShadowElement;
})(window.ShadowDOMPolyfill);
