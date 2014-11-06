// Copyright 2013 The Polymer Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

(function(scope) {
  'use strict';

  var HTMLCollection = scope.wrappers.HTMLCollection;
  var NodeList = scope.wrappers.NodeList;

  var originalDocumentQuerySelector = document.querySelector;
  var originalElementQuerySelector = document.documentElement.querySelector;

  var originalDocumentQuerySelectorAll = document.querySelectorAll;
  var originalElementQuerySelectorAll = document.documentElement.querySelectorAll;

  var originalDocumentGetElementsByTagName = document.getElementsByTagName;
  var originalElementGetElementsByTagName = document.documentElement.getElementsByTagName;

  var originalDocumentGetElementsByTagNameNS = document.getElementsByTagNameNS;
  var originalElementGetElementsByTagNameNS = document.documentElement.getElementsByTagNameNS;

  var Document = window.HTMLDocument || window.Document;

  function filterNodeList(list, index, result, deep) {
    var item = null;
    for (var i = 0, length = list.length; i < length; i++) {
      item = list[i];
      if (!deep && item.ownerShadowRoot_) {
        continue;
      }
      result[index++] = item;
    }

    return index;
  }

  function shimSelector(selector) {
    return String(selector).replace(/\/deep\//g, ' ');
  }

  function findOne(node, selector) {
    var m, el = node.firstElementChild;
    while (el) {
      if (el.matches(selector))
        return el;
      m = findOne(el, selector);
      if (m)
        return m;
      el = el.nextElementSibling;
    }
    return null;
  }

  function matchesSelector(el, selector) {
    return el.matches(selector);
  }

  var XHTML_NS = 'http://www.w3.org/1999/xhtml';

  function matchesTagName(el, localName, localNameLowerCase) {
    var ln = el.localName;
    return ln === localName ||
        ln === localNameLowerCase && el.namespaceURI === XHTML_NS;
  }

  function matchesEveryThing() {
    return true;
  }

  function matchesLocalNameOnly(el, ns, localName) {
    return el.localName === localName;
  }

  function matchesNameSpace(el, ns) {
    return el.namespaceURI === ns;
  }

  function matchesLocalNameNS(el, ns, localName) {
    return el.namespaceURI === ns && el.localName === localName;
  }

  function findElements(node, index, result, p, arg0, arg1) {
    var el = node.firstElementChild;
    while (el) {
      if (p(el, arg0, arg1))
        result[index++] = el;
      index = findElements(el, index, result, p, arg0, arg1);
      el = el.nextElementSibling;
    }
    return index;
  }

  // find and findAll will only match Simple Selectors,
  // Structural Pseudo Classes are not guarenteed to be correct
  // http://www.w3.org/TR/css3-selectors/#simple-selectors

  // TODO(jmesserly): we can avoid all of the `this instanceof` type checks by
  // patching the appropriate method onto the appropriate prototype.

  function querySelectorAllFiltered(p, index, result, selector, deep) {
    var list;
    if (this.ownerShadowRoot_) {
      // We are in the shadow tree and the logical tree is
      // going to be disconnected so we do a manual tree traversal
      return findElements(this, index, result, p, selector, null);
    } else if (this instanceof Element) {
      list = originalElementQuerySelectorAll.call(this, selector);
    } else if (this instanceof Document) {
      list = originalDocumentQuerySelectorAll.call(this, selector);
    } else {
      // When we get a ShadowRoot the logical tree is going to be disconnected
      // so we do a manual tree traversal
      return findElements(this, index, result, p, selector, null);
    }

    return filterNodeList(list, index, result, deep);
  }

  var SelectorsInterface = {
    querySelector: function(selector) {
      var shimmed = shimSelector(selector);
      var deep = shimmed !== selector;
      selector = shimmed;
      var item;
      if (this.ownerShadowRoot_) {
        // We are in the shadow tree and the logical tree is
        // going to be disconnected so we do a manual tree traversal
        return findOne(this, selector);
      } else if (this instanceof Element) {
        item = originalElementQuerySelector.call(this, selector);
      } else if (this instanceof Document) {
        item = originalDocumentQuerySelector.call(this, selector);
      } else {
        // When we get a ShadowRoot the logical tree is going to be disconnected
        // so we do a manual tree traversal
        return findOne(this, selector);
      }

      if (!item) {
        // When the original query returns nothing
        // we return nothing (to be consistent with the other wrapped calls)
        return item;
      } else if (!deep && item.ownerShadowRoot_) {
        // When the original query returns an element in the ShadowDOM
        // we must do a manual tree traversal
        return findOne(this, selector);
      }

      return item;
    },
    querySelectorAll: function(selector) {
      var shimmed = shimSelector(selector);
      var deep = shimmed !== selector;
      selector = shimmed;

      var result = new NodeList();

      result.length = querySelectorAllFiltered.call(this,
          matchesSelector,
          0,
          result,
          selector,
          deep);

      return result;
    }
  };

  function getElementsByTagNameFiltered(p, index, result, localName,
                                        lowercase) {
    var list;
    if (this.ownerShadowRoot_) {
      // We are in the shadow tree and the logical tree is
      // going to be disconnected so we do a manual tree traversal
      return findElements(this, index, result, p, localName, lowercase);
    } else if (this instanceof Element) {
      list = originalElementGetElementsByTagName.call(this, localName,
                                                      lowercase);
    } else if (this instanceof Document) {
      list = originalDocumentGetElementsByTagName.call(this, localName,
                                                       lowercase);
    } else {
      // When we get a ShadowRoot the logical tree is going to be disconnected
      // so we do a manual tree traversal
      return findElements(this, index, result, p, localName, lowercase);
    }

    return filterNodeList(list, index, result, false);
  }

  function getElementsByTagNameNSFiltered(p, index, result, ns, localName) {
    var list;
    if (this.ownerShadowRoot_) {
      // We are in the shadow tree and the logical tree is
      // going to be disconnected so we do a manual tree traversal
      return findElements(this, index, result, p, ns, localName);
    } else if (this instanceof Element) {
      list = originalElementGetElementsByTagNameNS.call(this, ns, localName);
    } else if (this instanceof Document) {
      list = originalDocumentGetElementsByTagNameNS.call(this, ns, localName);
    } else {
      // When we get a ShadowRoot the logical tree is going to be disconnected
      // so we do a manual tree traversal
      return findElements(this, index, result, p, ns, localName);
    }

    return filterNodeList(list, index, result, false);
  }

  var GetElementsByInterface = {
    getElementsByTagName: function(localName) {
      var result = new HTMLCollection();
      var match = localName === '*' ? matchesEveryThing : matchesTagName;

      result.length = getElementsByTagNameFiltered.call(this,
          match,
          0,
          result,
          localName,
          localName.toLowerCase());

      return result;
    },

    getElementsByClassName: function(className) {
      // TODO(arv): Check className?
      return this.querySelectorAll('.' + className);
    },

    getElementsByTagNameNS: function(ns, localName) {
      var result = new HTMLCollection();
      var match = null;

      if (ns === '*') {
        match = localName === '*' ? matchesEveryThing : matchesLocalNameOnly;
      } else {
        match = localName === '*' ? matchesNameSpace : matchesLocalNameNS;
      }

      result.length = getElementsByTagNameNSFiltered.call(this,
          match,
          0,
          result,
          ns || null,
          localName);

      return result;
    }
  };

  scope.GetElementsByInterface = GetElementsByInterface;
  scope.SelectorsInterface = SelectorsInterface;

})(window.ShadowDOMPolyfill);
