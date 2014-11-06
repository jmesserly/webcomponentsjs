// Copyright 2013 The Polymer Authors. All rights reserved.
// Use of this source code is goverened by a BSD-style
// license that can be found in the LICENSE file.

(function(scope) {
  'use strict';

  var DOMTokenList = scope.wrappers.DOMTokenList;
  var mixin = scope.mixin;
  var oneOf = scope.oneOf;

  var matchesNames = [
    'matches',  // needs to come first.
    'mozMatchesSelector',
    'msMatchesSelector',
    'webkitMatchesSelector',
  ].filter(function(name) {
    return Element.prototype[name];
  });

  var matchesName = matchesNames[0];

  function invalidateRendererBasedOnAttribute(element, name) {
    // Only invalidate if parent node is a shadow host.
    var p = element.parentNode;
    if (!p || !p.shadowRoot)
      return;

    var renderer = scope.getRendererForHost(p);
    if (renderer.dependsOnAttribute(name))
      renderer.invalidate();
  }

  // Note: check HTMLElement because IE has them there
  function overrideProperty(oldName, newName, newProps) {
    var proto = Element.prototype;
    var property = Object.getOwnPropertyDescriptor(proto, oldName);
    if (!property) {
      proto = HTMLElement.prototype;
      property = Object.getOwnPropertyDescriptor(proto, oldName);
    }

    Object.defineProperty(proto, newName, property);
    mixin(proto, newProps);
  }

  overrideProperty('classList', 'originalClassList_', {
    get classList() {
      var list = classListTable.get(this);
      if (!list) {
        classListTable.set(this,
            list = new DOMTokenList(this.originalClassList_, this));
      }
      return list;
    }
  });

  overrideProperty('id', 'originalId_', {
    get id() {
      return this.originalId_;
    },

    set id(v) {
      this.setAttribute('id', v);
    },
  });

  mixin(Element.prototype, scope.ChildNodeInterface);
  mixin(Element.prototype, scope.GetElementsByInterface);
  mixin(Element.prototype, scope.ParentNodeInterface);
  mixin(Element.prototype, scope.SelectorsInterface);

  var classListTable = new WeakMap();

  mixin(Element.prototype, {
    originalGetAttribute_: Element.prototype.getAttribute,
    originalSetAttribute_: Element.prototype.setAttribute,
    originalRemoveAttribute_: Element.prototype.removeAttribute,
    originalMatches_: Element.prototype[matchesName],
    
    setAttribute: function(name, value) {
      this.originalSetAttribute_(name, value);
      invalidateRendererBasedOnAttribute(this, name);
    },

    removeAttribute: function(name) {
      this.originalRemoveAttribute_(name);
      invalidateRendererBasedOnAttribute(this, name);
    },

    createShadowRoot: function() {
      var newShadowRoot = scope.createShadowRoot(this);
      this.polymerShadowRoot_ = newShadowRoot;

      scope.getRendererForHost(this).invalidate();

      return newShadowRoot;
    },

    get shadowRoot() {
      return this.polymerShadowRoot_ || null;
    },

    // Note: this just standarizes the name.
    // TODO(jmesserly): don't redefine this if the name was already correct.
    matches: function(selector) {
      return this.originalMatches_(selector);
    },

  });

  // Handle a things IE puts on HTMLElement instead of Element
  // 
  // TODO(jmesserly): are we better off deleting these or copying them down?
  function copyDown(name) {
    Object.defineProperty(HTMLElement.prototype, name,
        Object.getOwnPropertyDescriptor(Element.prototype, name));
  }

  ['getElementsByClassName', 'children'].forEach(copyDown);

  matchesNames.forEach(function(name) {
    if (name !== 'matches') {
      Element.prototype[name] = function(selector) {
        return this.matches(selector);
      };
    }
  });

  if (Element.prototype.webkitCreateShadowRoot) {
    Element.prototype.webkitCreateShadowRoot =
        Element.prototype.createShadowRoot;
  }

  scope.invalidateRendererBasedOnAttribute = invalidateRendererBasedOnAttribute;
  scope.matchesNames = matchesNames;
})(window.ShadowDOMPolyfill);
