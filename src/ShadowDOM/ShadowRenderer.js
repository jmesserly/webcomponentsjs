// Copyright 2013 The Polymer Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

(function(scope) {
  'use strict';

  var HTMLContentElement = scope.HTMLContentElement;
  var HTMLShadowElement = scope.HTMLShadowElement;
  var Node = window.Node;
  var ShadowRoot = window.ShadowRoot;
  var assert = scope.assert;
  var isInsertionPoint = scope.isInsertionPoint;
  var mixin = scope.mixin;
  var oneOf = scope.oneOf;
  var ArraySplice = scope.ArraySplice;

  /**
   * Updates the fields of a wrapper to a snapshot of the logical DOM as needed.
   * Up means parentNode
   * Sideways means previous and next sibling.
   * @param {!Node} wrapper
   */
  function updateVirtualUpAndSideways(node) {
    node.previousSibling_ = node.previousSibling;
    node.nextSibling_ = node.nextSibling;
    node.parentNode_ = node.parentNode;
  }

  function insertBefore(parentNode, newChild, refChild) {

    remove(newChild);
    updateVirtualUpAndSideways(newChild);

    if (!refChild) {
      parentNode.lastChild_ = parentNode.lastChild;
      if (parentNode.lastChild === parentNode.firstChild)
        parentNode.firstChild_ = parentNode.firstChild;

      var lastChild = parentNode.visualLastChild_;
      if (lastChild)
        lastChild.nextSibling_ = lastChild.nextSibling;
    } else {
      if (parentNode.firstChild === refChild)
        parentNode.firstChild_ = refChild;

      refChild.previousSibling_ = refChild.previousSibling;
    }

    parentNode.visualInsertBefore_(newChild, refChild);
  }

  function remove(node) {
    var parentNode = node.visualParentNode_;
    if (!parentNode)
      return;

    updateVirtualUpAndSideways(node);

    if (node.previousSibling)
      node.previousSibling.nextSibling_ = node;
    if (node.nextSibling)
      node.nextSibling.previousSibling_ = node;

    if (parentNode.lastChild === node)
      parentNode.lastChild_ = node;
    if (parentNode.firstChild === node)
      parentNode.firstChild_ = node;

    parentNode.visualRemoveChild_(node);
  }

  var distributedNodesTable = new WeakMap();
  var destinationInsertionPointsTable = new WeakMap();
  var rendererForHostTable = new WeakMap();

  function resetDistributedNodes(insertionPoint) {
    distributedNodesTable.set(insertionPoint, []);
  }

  function getDistributedNodes(insertionPoint) {
    var rv = distributedNodesTable.get(insertionPoint);
    if (!rv)
      distributedNodesTable.set(insertionPoint, rv = []);
    return rv;
  }

  function getVisualChildNodesSnapshot(node) {
    var result = [], i = 0;
    for (var child = node.visualFirstChild_; child;
        child = child.visualNextSibling_) {
      result[i++] = child;
    }
    return result;
  }

  var request = oneOf(window, [
    'requestAnimationFrame',
    'mozRequestAnimationFrame',
    'webkitRequestAnimationFrame',
    'setTimeout'
  ]);

  var pendingDirtyRenderers = [];
  var renderTimer;

  function renderAllPending() {
    // TODO(arv): Order these in document order. That way we do not have to
    // render something twice.
    for (var i = 0; i < pendingDirtyRenderers.length; i++) {
      var renderer = pendingDirtyRenderers[i];
      var parentRenderer = renderer.parentRenderer;
      if (parentRenderer && parentRenderer.dirty)
        continue;
      renderer.render();
    }

    pendingDirtyRenderers = [];
  }

  function handleRequestAnimationFrame() {
    renderTimer = null;
    renderAllPending();
  }

  /**
   * Returns existing shadow renderer for a host or creates it if it is needed.
   * @params {!Element} host
   * @return {!ShadowRenderer}
   */
  function getRendererForHost(host) {
    var renderer = rendererForHostTable.get(host);
    if (!renderer) {
      renderer = new ShadowRenderer(host);
      rendererForHostTable.set(host, renderer);
    }
    return renderer;
  }

  var spliceDiff = new ArraySplice();
  spliceDiff.equals = function(renderNode, rawNode) {
    return renderNode.node === rawNode;
  };

  /**
   * RenderNode is used as an in memory "render tree". When we render the
   * composed tree we create a tree of RenderNodes, then we diff this against
   * the real DOM tree and make minimal changes as needed.
   */
  function RenderNode(node) {
    this.skip = false;
    this.node = node;
    this.childNodes = [];
  }

  RenderNode.prototype = {
    append: function(node) {
      var rv = new RenderNode(node);
      this.childNodes.push(rv);
      return rv;
    },

    sync: function(opt_added) {
      if (this.skip)
        return;

      var node = this.node;
      // plain array of RenderNodes
      var newChildren = this.childNodes;
      // plain array of real nodes.
      var oldChildren = getVisualChildNodesSnapshot(node);
      var added = opt_added || new WeakMap();

      var splices = spliceDiff.calculateSplices(newChildren, oldChildren);

      var newIndex = 0, oldIndex = 0;
      var lastIndex = 0;
      for (var i = 0; i < splices.length; i++) {
        var splice = splices[i];
        for (; lastIndex < splice.index; lastIndex++) {
          oldIndex++;
          newChildren[newIndex++].sync(added);
        }

        var removedCount = splice.removed.length;
        for (var j = 0; j < removedCount; j++) {
          var oldChild = oldChildren[oldIndex++];
          if (!added.get(oldChild))
            remove(oldChild);
        }

        var addedCount = splice.addedCount;
        var refNode = oldChildren[oldIndex];
        for (var j = 0; j < addedCount; j++) {
          var newChildRenderNode = newChildren[newIndex++];
          var newChild = newChildRenderNode.node;
          insertBefore(node, newChild, refNode);

          // Keep track of added so that we do not remove the node after it
          // has been added.
          added.set(newChild, true);

          newChildRenderNode.sync(added);
        }

        lastIndex += addedCount;
      }

      for (var i = lastIndex; i < newChildren.length; i++) {
        newChildren[i].sync(added);
      }
    }
  };

  function ShadowRenderer(host) {
    this.host = host;
    this.dirty = false;
    this.invalidateAttributes();
    this.associateNode(host);
  }

  ShadowRenderer.prototype = {

    // http://dvcs.w3.org/hg/webcomponents/raw-file/tip/spec/shadow/index.html#rendering-shadow-trees
    render: function(opt_renderNode) {
      if (!this.dirty)
        return;

      this.invalidateAttributes();

      var host = this.host;

      this.distribution(host);
      var renderNode = opt_renderNode || new RenderNode(host);
      this.buildRenderTree(renderNode, host);

      var topMostRenderer = !opt_renderNode;
      if (topMostRenderer)
        renderNode.sync();

      this.dirty = false;
    },

    get parentRenderer() {
      var root = this.host.ownerShadowRoot_;
      return root ? scope.getRendererForHost(root.host) : null;
    },

    invalidate: function() {
      if (!this.dirty) {
        this.dirty = true;
        var parentRenderer = this.parentRenderer;
        if (parentRenderer)
          parentRenderer.invalidate();
        pendingDirtyRenderers.push(this);
        if (renderTimer)
          return;
        renderTimer = window[request](handleRequestAnimationFrame, 0);
      }
    },

    // http://w3c.github.io/webcomponents/spec/shadow/#distribution-algorithms
    distribution: function(root) {
      this.resetAllSubtrees(root);
      this.distributionResolution(root);
    },

    resetAll: function(node) {
      if (isInsertionPoint(node))
        resetDistributedNodes(node);
      else
        resetDestinationInsertionPoints(node);

      this.resetAllSubtrees(node);
    },

    resetAllSubtrees: function(node) {
      for (var child = node.firstChild; child; child = child.nextSibling) {
        this.resetAll(child);
      }

      if (node.shadowRoot)
        this.resetAll(node.shadowRoot);

      if (node.olderShadowRoot)
        this.resetAll(node.olderShadowRoot);
    },

    // http://w3c.github.io/webcomponents/spec/shadow/#distribution-results
    distributionResolution: function(node) {
      if (isShadowHost(node)) {
        var shadowHost = node;
        // 1.1
        var pool = poolPopulation(shadowHost);

        var shadowTrees = getShadowTrees(shadowHost);

        // 1.2
        for (var i = 0; i < shadowTrees.length; i++) {
          // 1.2.1
          this.poolDistribution(shadowTrees[i], pool);
        }

        // 1.3
        for (var i = shadowTrees.length - 1; i >= 0; i--) {
          var shadowTree = shadowTrees[i];

          // 1.3.1
          // TODO(arv): We should keep the shadow insertion points on the
          // shadow root (or renderer) so we don't have to search the tree
          // every time.
          var shadow = getShadowInsertionPoint(shadowTree);

          // 1.3.2
          if (shadow) {

            // 1.3.2.1
            var olderShadowRoot = shadowTree.olderShadowRoot;
            if (olderShadowRoot) {
              // 1.3.2.1.1
              pool = poolPopulation(olderShadowRoot);
            }

            // 1.3.2.2
            for (var j = 0; j < pool.length; j++) {
              // 1.3.2.2.1
              distributeNodeInto(pool[j], shadow);
            }
          }

          // 1.3.3
          this.distributionResolution(shadowTree);
        }
      }

      for (var child = node.firstChild; child; child = child.nextSibling) {
        this.distributionResolution(child);
      }
    },

    // http://w3c.github.io/webcomponents/spec/shadow/#dfn-pool-distribution-algorithm
    poolDistribution: function (node, pool) {
      if (node.localName == 'shadow')
        return;

      if (node.localName == 'content') {
        var content = node;
        this.updateDependentAttributes(content.getAttribute('select'));

        var anyDistributed = false;

        // 1.1
        for (var i = 0; i < pool.length; i++) {
          var node = pool[i];
          if (!node)
            continue;
          if (matches(node, content)) {
            distributeNodeInto(node, content);
            pool[i] = undefined;
            anyDistributed = true;
          }
        }

        // 1.2
        // Fallback content
        if (!anyDistributed) {
          for (var child = content.firstChild;
               child;
               child = child.nextSibling) {
            distributeNodeInto(child, content);
          }
        }

        return;
      }

      for (var child = node.firstChild; child; child = child.nextSibling) {
        this.poolDistribution(child, pool);
      }
    },

    buildRenderTree: function(renderNode, node) {
      var children = this.compose(node);
      for (var i = 0; i < children.length; i++) {
        var child = children[i];
        var childRenderNode = renderNode.append(child);
        this.buildRenderTree(childRenderNode, child);
      }

      if (isShadowHost(node)) {
        var renderer = getRendererForHost(node);
        renderer.dirty = false;
      }

    },

    compose: function(node) {
      var children = [];
      var p = node.shadowRoot || node;
      for (var child = p.firstChild; child; child = child.nextSibling) {
        if (isInsertionPoint(child)) {
          this.associateNode(p);
          var distributedNodes = getDistributedNodes(child);
          for (var j = 0; j < distributedNodes.length; j++) {
            var distributedNode = distributedNodes[j];
            if (isFinalDestination(child, distributedNode))
              children.push(distributedNode);
          }
        } else {
          children.push(child);
        }
      }
      return children;
    },

    /**
     * Invalidates the attributes used to keep track of which attributes may
     * cause the renderer to be invalidated.
     */
    invalidateAttributes: function() {
      this.attributes = Object.create(null);
    },

    /**
     * Parses the selector and makes this renderer dependent on the attribute
     * being used in the selector.
     * @param {string} selector
     */
    updateDependentAttributes: function(selector) {
      if (!selector)
        return;

      var attributes = this.attributes;

      // .class
      if (/\.\w+/.test(selector))
        attributes['class'] = true;

      // #id
      if (/#\w+/.test(selector))
        attributes['id'] = true;

      selector.replace(/\[\s*([^\s=\|~\]]+)/g, function(_, name) {
        attributes[name] = true;
      });

      // Pseudo selectors have been removed from the spec.
    },

    dependsOnAttribute: function(name) {
      return this.attributes[name];
    },

    associateNode: function(node) {
      node.polymerShadowRenderer_ = this;
    }
  };

  // http://w3c.github.io/webcomponents/spec/shadow/#dfn-pool-population-algorithm
  function poolPopulation(node) {
    var pool = [];
    for (var child = node.firstChild; child; child = child.nextSibling) {
      if (isInsertionPoint(child)) {
        pool.push.apply(pool, getDistributedNodes(child));
      } else {
        pool.push(child);
      }
    }
    return pool;
  }

  function getShadowInsertionPoint(node) {
    if (node.localName == 'shadow')
      return node;
    if (node.localName == 'content')
      return null;
    for (var child = node.firstChild; child; child = child.nextSibling) {
      var res = getShadowInsertionPoint(child);
      if (res)
        return res;
    }
    return null;
  }

  function distributeNodeInto(child, insertionPoint) {
    getDistributedNodes(insertionPoint).push(child);
    var points = destinationInsertionPointsTable.get(child);
    if (!points)
      destinationInsertionPointsTable.set(child, [insertionPoint]);
    else
      points.push(insertionPoint);
  }

  function getDestinationInsertionPoints(node) {
    return destinationInsertionPointsTable.get(node);
  }

  function resetDestinationInsertionPoints(node) {
    // IE11 crashes when delete is used.
    destinationInsertionPointsTable.set(node, undefined);
  }

  // AllowedSelectors :
  //   TypeSelector
  //   *
  //   ClassSelector
  //   IDSelector
  //   AttributeSelector
  //   negation
  var selectorStartCharRe = /^(:not\()?[*.#[a-zA-Z_|]/;

  function matches(node, contentElement) {
    var select = contentElement.getAttribute('select');
    if (!select)
      return true;

    // Here we know the select attribute is a non empty string.
    select = select.trim();
    if (!select)
      return true;

    if (!(node instanceof Element))
      return false;

    if (!selectorStartCharRe.test(select))
      return false;

    try {
      return node.matches(select);
    } catch (ex) {
      // Invalid selector.
      return false;
    }
  }

  function isFinalDestination(insertionPoint, node) {
    var points = getDestinationInsertionPoints(node);
    return points && points[points.length - 1] === insertionPoint;
  }

  function isShadowHost(shadowHost) {
    return shadowHost.shadowRoot;
  }

  // Returns the shadow trees as an array, with the youngest tree at the
  // beginning of the array.
  function getShadowTrees(host) {
    var trees = [];

    for (var tree = host.shadowRoot; tree; tree = tree.olderShadowRoot) {
      trees.push(tree);
    }
    return trees;
  }

  // Need to rerender shadow host when:
  //
  // - a direct child to the ShadowRoot is added or removed
  // - a direct child to the host is added or removed
  // - a new shadow root is created
  // - a direct child to a content/shadow element is added or removed
  // - a sibling to a content/shadow element is added or removed
  // - content[select] is changed
  // - an attribute in a direct child to a host is modified

  /**
   * This gets called when a node was added or removed to it.
   */
  Node.prototype.invalidateShadowRenderer_ = function() {
    var renderer = this.polymerShadowRenderer_;
    if (renderer) {
      renderer.invalidate();
      return true;
    }

    return false;
  };

  HTMLContentElement.prototype.getDistributedNodes =
  HTMLShadowElement.prototype.getDistributedNodes = function() {
    if (!isInsertionPoint(this)) {
      throw new TypeError(
          'getDistributedNodes only supported on content or shadow');
    }

    // TODO(arv): We should only rerender the dirty ancestor renderers (from
    // the root and down).
    renderAllPending();
    return getDistributedNodes(this);
  };


  Element.prototype.getDestinationInsertionPoints = function() {
    renderAllPending();
    return getDestinationInsertionPoints(this) || [];
  };

  scope.getRendererForHost = getRendererForHost;
  scope.getShadowTrees = getShadowTrees;
  scope.renderAllPending = renderAllPending;

  scope.getDestinationInsertionPoints = getDestinationInsertionPoints;

  // Exposed for testing
  scope.visual = {
    insertBefore: insertBefore,
    remove: remove,
  };

})(window.ShadowDOMPolyfill);
