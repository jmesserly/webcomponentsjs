// Copyright 2012 The Polymer Authors. All rights reserved.
// Use of this source code is goverened by a BSD-style
// license that can be found in the LICENSE file.

window.ShadowDOMPolyfill = {};

(function(scope) {
  'use strict';
  var wrappers = Object.create(null);

  function assert(b) {
    if (!b) {
      throw new Error('Assertion failed');
    }
  };

  var defineProperty = Object.defineProperty;
  var getOwnPropertyNames = Object.getOwnPropertyNames;
  var getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;

  function mixin(to, from) {
    var names = getOwnPropertyNames(from);
    for (var i = 0; i < names.length; i++) {
      var name = names[i];
      defineProperty(to, name, getOwnPropertyDescriptor(from, name));
    }
    return to;
  };

  function oneOf(object, propertyNames) {
    for (var i = 0; i < propertyNames.length; i++) {
      if (propertyNames[i] in object)
        return propertyNames[i];
    }
  }

  // Mozilla's old DOM bindings are bretty busted:
  // https://bugzilla.mozilla.org/show_bug.cgi?id=855844
  // Make sure they are create before we start modifying things.
  getOwnPropertyNames(window);

  function isEventHandlerName(name) {
    return /^on[a-z]+$/.test(name);
  }

  function isIdentifierName(name) {
    return /^\w[a-zA-Z_0-9]*$/.test(name);
  }

  // TODO(jmesserly): remove all of these ... perhaps move them into tests.
  function isWrapper(object) {
    return false;
  }

  function isNative(object) {
    return true;
  }

  /**
   * Wraps a node in a WrapperNode. If there already exists a wrapper for the
   * |node| that wrapper is returned instead.
   * @param {Node} node
   * @return {WrapperNode}
   */
  function wrap(impl) {
    return impl;
  }

  /**
   * Unwraps a wrapper and returns the node it is wrapping.
   * @param {WrapperNode} wrapper
   * @return {Node}
   */
  function unwrap(wrapper) {
    return wrapper;
  }

  function unsafeUnwrap(wrapper) {
    return wrapper;
  }

  function setWrapper(impl, wrapper) {
  }

  function rewrap(impl, wrapper) {
  }

  /**
   * Unwraps object if it is a wrapper.
   * @param {Object} object
   * @return {Object} The native implementation object.
   */
  function unwrapIfNeeded(object) {
    return object;
  }

  /**
   * Wraps object if it is not a wrapper.
   * @param {Object} object
   * @return {Object} The wrapper for object.
   */
  function wrapIfNeeded(object) {
    return object;
  }

  var getterDescriptor = {
    get: undefined,
    configurable: true,
    enumerable: true
  };

  function defineGetter(constructor, name, getter) {
    getterDescriptor.get = getter;
    defineProperty(constructor.prototype, name, getterDescriptor);
  }

  function copyProperty(ctor, oldName, newName) {
    Object.defineProperty(ctor.prototype, newName,
        Object.getOwnPropertyDescriptor(ctor.prototype, oldName));
  }

  function getTreeRoot(node) {
    var root = node.ownerShadowRoot_;
    if (root) return root;

    // TODO(jmesserly): ideally we could return node.ownerDocument, but that
    // doesn't work for disconnected trees.
    var parent;
    while (parent = node.parentNode) {
      node = parent;
    }
    return node;
  }

  function getTreeRootParent(node) {
    var root = node.ownerShadowRoot_;

    // Only ShadowRoots have a parent tree scope.
    // (Documents and disconnected trees do not.)
    if (!root) return null;

    var old = root.olderShadowRoot;
    return old ? old : getTreeRoot(root.host);
  }

  function isInsertionPoint(node) {
    return node.localName == 'content' || node.localName == 'shadow';
  }

  scope.assert = assert;
  scope.copyProperty = copyProperty;
  scope.defineGetter = defineGetter;
  scope.getTreeRoot = getTreeRoot;
  scope.getTreeRootParent = getTreeRootParent;
  scope.isInsertionPoint = isInsertionPoint;
  scope.isWrapper = isWrapper;
  scope.mixin = mixin;
  scope.oneOf = oneOf;
  scope.rewrap = rewrap;
  scope.setWrapper = setWrapper;
  scope.unsafeUnwrap = unsafeUnwrap;
  scope.unwrap = unwrap;
  scope.unwrapIfNeeded = unwrapIfNeeded;
  scope.wrap = wrap;
  scope.wrapIfNeeded = wrapIfNeeded;
  scope.wrappers = wrappers;

})(window.ShadowDOMPolyfill);
