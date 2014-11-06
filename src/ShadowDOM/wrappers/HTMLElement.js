// Copyright 2013 The Polymer Authors. All rights reserved.
// Use of this source code is goverened by a BSD-style
// license that can be found in the LICENSE file.

(function(scope) {
  'use strict';

  var Element = scope.wrappers.Element;
  var HTMLTemplateElement = window.HTMLTemplateElement;
  var defineGetter = scope.defineGetter;
  var getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
  var mixin = scope.mixin;
  var nodesWereRemoved = scope.nodesWereRemoved;
  var snapshotNodeList = scope.snapshotNodeList;
  var wrappers = scope.wrappers;

  /////////////////////////////////////////////////////////////////////////////
  // innerHTML and outerHTML

  // http://www.whatwg.org/specs/web-apps/current-work/multipage/the-end.html#escapingString
  var escapeAttrRegExp = /[&\u00A0"]/g;
  var escapeDataRegExp = /[&\u00A0<>]/g;

  function escapeReplace(c) {
    switch (c) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;'
      case '\u00A0':
        return '&nbsp;';
    }
  }

  function escapeAttr(s) {
    return s.replace(escapeAttrRegExp, escapeReplace);
  }

  function escapeData(s) {
    return s.replace(escapeDataRegExp, escapeReplace);
  }

  function makeSet(arr) {
    var set = {};
    for (var i = 0; i < arr.length; i++) {
      set[arr[i]] = true;
    }
    return set;
  }

  // http://www.whatwg.org/specs/web-apps/current-work/#void-elements
  var voidElements = makeSet([
    'area',
    'base',
    'br',
    'col',
    'command',
    'embed',
    'hr',
    'img',
    'input',
    'keygen',
    'link',
    'meta',
    'param',
    'source',
    'track',
    'wbr'
  ]);

  var plaintextParents = makeSet([
    'style',
    'script',
    'xmp',
    'iframe',
    'noembed',
    'noframes',
    'plaintext',
    'noscript'
  ]);

  function getOuterHTML(node, parentNode) {
    switch (node.nodeType) {
      case Node.ELEMENT_NODE:
        var tagName = node.tagName.toLowerCase();
        var s = '<' + tagName;
        var attrs = node.attributes;
        for (var i = 0, attr; attr = attrs[i]; i++) {
          s += ' ' + attr.name + '="' + escapeAttr(attr.value) + '"';
        }
        s += '>';
        if (voidElements[tagName])
          return s;

        return s + getInnerHTML(node) + '</' + tagName + '>';

      case Node.TEXT_NODE:
        var data = node.data;
        if (parentNode && plaintextParents[parentNode.localName])
          return data;
        return escapeData(data);

      case Node.COMMENT_NODE:
        return '<!--' + node.data + '-->';

      default:
        console.error(node);
        throw new Error('not implemented node type: ' + node.nodeType);
    }
  }

  function getInnerHTML(node) {
    // TODO(jmesserly): ideally we could use `instanceof HTMLTemplateElement`
    if (node.localName == 'template')
      node = node.content;

    var s = '';
    for (var child = node.firstChild; child; child = child.nextSibling) {
      s += getOuterHTML(child, node);
    }
    return s;
  }

  function setInnerHTML(node, value, opt_tagName) {
    var tagName = opt_tagName || 'div';
    node.textContent = '';
    var tempElement = node.ownerDocument.createElement(tagName);
    tempElement.visualInnerHTML_ = value;
    var firstChild;
    while (firstChild = tempElement.visualFirstChild_) {
      node.appendChild(firstChild);
    }
  }

  // IE11 does not have MSIE in the user agent string.
  var oldIe = /MSIE/.test(navigator.userAgent);

  var HTMLElement = window.HTMLElement;
  var Element = window.Element;

  // Note: check both HTMLElement and Element because the properties are moving.
  function copyElementProperty(oldName, newName) {
    var proto = Element.prototype;
    var property = Object.getOwnPropertyDescriptor(proto, oldName);
    if (!property) {
      proto = HTMLElement.prototype;
      property = Object.getOwnPropertyDescriptor(proto, oldName);
    }

    Object.defineProperty(proto, newName, property);
  }

  copyElementProperty('innerHTML', 'visualInnerHTML_');
  copyElementProperty('outerHTML', 'visualOuterHTML_');
  copyElementProperty('className', 'originalClassName_');

  mixin(HTMLElement.prototype, {
    
    get className() {
      return this.originalClassName_;
    },

    set className(v) {
      this.setAttribute('class', v);
    },

    get innerHTML() {
      return getInnerHTML(this);
    },
    set innerHTML(value) {
      // IE9 does not handle set innerHTML correctly on plaintextParents. It
      // creates element children. For example
      //
      //   scriptElement.innerHTML = '<a>test</a>'
      //
      // Creates a single HTMLAnchorElement child.
      if (oldIe && plaintextParents[this.localName]) {
        this.textContent = value;
        return;
      }

      var root = this.ownerShadowRoot_;
      var removedNodes;
      if (root) removedNodes = snapshotNodeList(this.childNodes);

      if (this.invalidateShadowRenderer_()) {
        if (this.localName == 'template')
          setInnerHTML(this.content, value);
        else
          setInnerHTML(this, value, this.tagName);

      // If we have a non native template element we need to handle this
      // manually since setting impl.innerHTML would add the html as direct
      // children and not be moved over to the content fragment.
      } else if (!HTMLTemplateElement && this.localName == 'template') {
        setInnerHTML(this.content, value);
      } else {
        this.visualInnerHTML_ = value;
      }

      if (root) {
        nodesWereRemoved(removedNodes);
        root.nodesWereAdded_(this.childNodes);
      }
    },

    get outerHTML() {
      return getOuterHTML(this, this.parentNode);
    },
    set outerHTML(value) {
      var p = this.parentNode;
      if (p) {
        p.invalidateShadowRenderer_();
        var df = frag(p, value);
        p.replaceChild(df, this);
      }
    },

    insertAdjacentHTML: function(position, text) {
      var contextElement, refNode;
      switch (String(position).toLowerCase()) {
        case 'beforebegin':
          contextElement = this.parentNode;
          refNode = this;
          break;
        case 'afterend':
          contextElement = this.parentNode;
          refNode = this.nextSibling;
          break;
        case 'afterbegin':
          contextElement = this;
          refNode = this.firstChild;
          break;
        case 'beforeend':
          contextElement = this;
          refNode = null;
          break;
        default:
          return;
      }

      var df = frag(contextElement, text);
      contextElement.insertBefore(df, refNode);
    },

    get hidden() {
      return this.hasAttribute('hidden');
    },
    set hidden(v) {
      if (v) {
        this.setAttribute('hidden', '');
      } else {
        this.removeAttribute('hidden');
      }
    }
  });

  function frag(contextElement, html) {
    // TODO(arv): This does not work with SVG and other non HTML elements.
    var p = contextElement.cloneNode(false);
    p.visualInnerHTML_ = html;
    var df = document.createDocumentFragment();
    var c;
    while (c = p.visualFirstChild_) {
      df.visualAppendChild_(c);
    }
    return df;
  }

  function getter(original) {
    return function() {
      scope.renderAllPending();
      return original.call(this);
    };
  }

  function setter(original) {
    return function(v) {
      scope.renderAllPending();
      original.call(this, v);
    };
  }

  function getterRequiresRendering(name) {
    var original = getOwnPropertyDescriptor(HTMLElement.prototype, name) ||
        getOwnPropertyDescriptor(Element.prototype, name);
    defineGetter(HTMLElement, name, getter(original.get));
  }

  [
    'clientHeight',
    'clientLeft',
    'clientTop',
    'clientWidth',
    'offsetHeight',
    'offsetLeft',
    'offsetTop',
    'offsetWidth',
    'scrollHeight',
    'scrollWidth',
  ].forEach(getterRequiresRendering);

  function getterAndSetterRequiresRendering(name) {
    var original = getOwnPropertyDescriptor(HTMLElement.prototype, name) ||
        getOwnPropertyDescriptor(Element.prototype, name);
    original.get = getter(original.get);
    original.set = setter(original.set);
    Object.defineProperty(HTMLElement.prototype, name, original);
  }

  [
    'scrollLeft',
    'scrollTop',
  ].forEach(getterAndSetterRequiresRendering);

  function methodRequiresRendering(name) {
    var originalMethod = HTMLElement.prototype[name] ||
        Element.prototype[name];
    Object.defineProperty(HTMLElement.prototype, name, {
      value: function() {
        scope.renderAllPending();
        return originalMethod.apply(this, arguments);
      },
      configurable: true,
      enumerable: true
    });
  }

  [
    'getBoundingClientRect',
    'getClientRects',
    'scrollIntoView'
  ].forEach(methodRequiresRendering);

  // TODO: Find a better way to share these two with WrapperShadowRoot.
  scope.getInnerHTML = getInnerHTML;
  scope.setInnerHTML = setInnerHTML
})(window.ShadowDOMPolyfill);
