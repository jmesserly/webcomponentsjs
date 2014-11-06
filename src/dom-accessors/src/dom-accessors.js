// Copyright 2014 The Polymer Authors. All rights reserved.
// Use of this source code is goverened by a BSD-style
// license that can be found in the LICENSE file.

(function() {

  // If we aren't transformed, bail.
  if (!document.__raw$childNodes) {
    return;
  }

  var defineProperty = Object.defineProperty;
  var getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;

  var PREFIX = '__$';
  var descriptor = {
    get: undefined,
    set: undefined,
    configurable: true,
    enumerable: false
  };

  // https://dom.spec.whatwg.org/#interface-parentnode
  var ParentNodeInterface = [
    Node.prototype,
    DocumentFragment.prototype,
    Document.prototype
  ];

  var properties = Object.create(null);
  function accessor(name, proto, getter, setter) {
    var prefixedName = PREFIX + name;
    descriptor.get = getter;
    descriptor.set = setter;
    if (proto instanceof Array) {
      for (var i = 0; i < proto.length; i++) {
        defineProperty(proto[i], prefixedName, descriptor);
      }
    } else {
      defineProperty(proto, prefixedName, descriptor);
    }
    // Define a catch-all on Object.prototype, so we never get stuck with
    // a call to the prefixed name that didn't redirect.
    defineProperty(Object.prototype, prefixedName, descriptor);
    properties[name] = prefixedName;
  }

  // Properties we might want to override.
  // JS engines, in particular Safari JSC as of 7.1, are still much faster with
  // something like `this.parentNode` compared with `this['parentNode']`.
  // Here, __raw$ is a marker to tell our code transformer to turn this back
  // into a real `this.parentNode` access.
  accessor('childElementCount', ParentNodeInterface,
      function() { return this.__raw$childElementCount; },
      function(x) { this.__raw$childElementCount = x; });
  accessor('childNodes', Node.prototype,
      function() { return this.__raw$childNodes; },
      function(x) { this.__raw$childNodes = x; });
  accessor('children', ParentNodeInterface,
      function() { return this.__raw$children; },
      function(x) { this.__raw$children = x; });
  accessor('classList', Element.prototype,
      function() { return this.__raw$classList; },
      function(x) { this.__raw$classList = x; });
  accessor('className', Element.prototype,
      function() { return this.__raw$className; },
      function(x) { this.__raw$className = x; });
  accessor('clientHeight', Element.prototype,
      function() { return this.__raw$clientHeight; },
      function(x) { this.__raw$clientHeight = x; });
  accessor('clientLeft', Element.prototype,
      function() { return this.__raw$clientLeft; },
      function(x) { this.__raw$clientLeft = x; });
  accessor('clientTop', Element.prototype,
      function() { return this.__raw$clientTop; },
      function(x) { this.__raw$clientTop = x; });
  accessor('clientWidth', Element.prototype,
      function() { return this.__raw$clientWidth; },
      function(x) { this.__raw$clientWidth = x; });
  accessor('currentTarget', Event.prototype,
      function() { return this.__raw$currentTarget; },
      function(x) { this.__raw$currentTarget = x; });
  accessor('data', CharacterData.prototype,
      function() { return this.__raw$data; },
      function(x) { this.__raw$data = x; });
  accessor('eventPhase', Event.prototype,
      function() { return this.__raw$eventPhase; },
      function(x) { this.__raw$eventPhase = x; });
  accessor('firstChild', Node.prototype,
      function() { return this.__raw$firstChild; },
      function(x) { this.__raw$firstChild = x; });
  accessor('firstElementChild', ParentNodeInterface,
      function() { return this.__raw$firstElementChild; },
      function(x) { this.__raw$firstElementChild = x; });
  accessor('hidden', HTMLElement.prototype,
      function() { return this.__raw$hidden; },
      function(x) { this.__raw$hidden = x; });
  accessor('id', Element.prototype,
      function() { return this.__raw$id; },
      function(x) { this.__raw$id = x; });
  accessor('innerHTML', Element.prototype,
      function() { return this.__raw$innerHTML; },
      function(x) { this.__raw$innerHTML = x; });
  accessor('lastChild', Node.prototype,
      function() { return this.__raw$lastChild; },
      function(x) { this.__raw$lastChild = x; });
  accessor('lastElementChild', ParentNodeInterface,
      function() { return this.__raw$lastElementChild; },
      function(x) { this.__raw$lastElementChild = x; });
  accessor('nextElementSibling', Element.prototype,
      function() { return this.__raw$nextElementSibling; },
      function(x) { this.__raw$nextElementSibling = x; });
  accessor('nextSibling', Node.prototype,
      function() { return this.__raw$nextSibling; },
      function(x) { this.__raw$nextSibling = x; });
  accessor('offsetHeight', HTMLElement.prototype,
      function() { return this.__raw$offsetHeight; },
      function(x) { this.__raw$offsetHeight = x; });
  accessor('offsetLeft', HTMLElement.prototype,
      function() { return this.__raw$offsetLeft; },
      function(x) { this.__raw$offsetLeft = x; });
  accessor('offsetTop', HTMLElement.prototype,
      function() { return this.__raw$offsetTop; },
      function(x) { this.__raw$offsetTop = x; });
  accessor('offsetWidth', HTMLElement.prototype,
      function() { return this.__raw$offsetWidth; },
      function(x) { this.__raw$offsetWidth = x; });
  accessor('outerHTML', Element.prototype,
      function() { return this.__raw$outerHTML; },
      function(x) { this.__raw$outerHTML = x; });
  accessor('parentElement', Node.prototype,
      function() { return this.__raw$parentElement; },
      function(x) { this.__raw$parentElement = x; });
  accessor('parentNode', Node.prototype,
      function() { return this.__raw$parentNode; },
      function(x) { this.__raw$parentNode = x; });
  accessor('path', Event.prototype,
      function() { return this.__raw$path; },
      function(x) { this.__raw$path = x; });
  accessor('previousElementSibling', Element.prototype,
      function() { return this.__raw$previousElementSibling; },
      function(x) { this.__raw$previousElementSibling = x; });
  accessor('previousSibling', Node.prototype,
      function() { return this.__raw$previousSibling; },
      function(x) { this.__raw$previousSibling = x; });
  accessor('relatedTarget', [FocusEvent.prototype, MouseEvent.prototype],
      function() { return this.__raw$relatedTarget; },
      function(x) { this.__raw$relatedTarget = x; });
  accessor('scrollHeight', Element.prototype,
      function() { return this.__raw$scrollHeight; },
      function(x) { this.__raw$scrollHeight = x; });
  accessor('scrollLeft', Element.prototype,
      function() { return this.__raw$scrollLeft; },
      function(x) { this.__raw$scrollLeft = x; });
  accessor('scrollTop', Element.prototype,
      function() { return this.__raw$scrollTop; },
      function(x) { this.__raw$scrollTop = x; });
  accessor('scrollWidth', Element.prototype,
      function() { return this.__raw$scrollWidth; },
      function(x) { this.__raw$scrollWidth = x; });
  accessor('select', HTMLUnknownElement.prototype,
      function() { return this.__raw$select; },
      function(x) { this.__raw$select = x; });
  accessor('shadowRoot', Element.prototype,
      function() { return this.__raw$shadowRoot; },
      function(x) { this.__raw$shadowRoot = x; });
  accessor('target', Event.prototype,
      function() { return this.__raw$target; },
      function(x) { this.__raw$target = x; });
  accessor('textContent', Node.prototype,
      function() { return this.__raw$textContent; },
      function(x) { this.__raw$textContent = x; });

  Object.defineProperty = function(obj, name, desc) {
    var newName = properties[name];
    if (newName) name = newName;
    defineProperty(obj, name, desc);
  };

  Object.getOwnPropertyDescriptor = function(obj, name) {
    var newName = properties[name];
    if (newName) name = newName;
    return getOwnPropertyDescriptor(obj, name);
  };
})();
