// Copyright 2013 The Polymer Authors. All rights reserved.
// Use of this source code is goverened by a BSD-style
// license that can be found in the LICENSE file.

(function(scope) {
  'use strict';

  var copyProperty = scope.copyProperty;
  var getTreeRoot = scope.getTreeRoot;
  var getTreeRootParent = scope.getTreeRootParent;
  var mixin = scope.mixin;
  var wrappers = scope.wrappers;

  var wrappedFuns = new WeakMap();
  var listenersTable = new WeakMap();
  var handledEventsTable = new WeakMap();
  var currentlyDispatchingEvents = new WeakMap();
  var targetTable = new WeakMap();
  var currentTargetTable = new WeakMap();
  var relatedTargetTable = new WeakMap();
  var eventPhaseTable = new WeakMap();
  var stopPropagationTable = new WeakMap();
  var stopImmediatePropagationTable = new WeakMap();
  var eventHandlersTable = new WeakMap();
  var eventPathTable = new WeakMap();

  function isShadowRoot(node) {
    return node instanceof scope.ShadowRoot;
  }

  // http://w3c.github.io/webcomponents/spec/shadow/#event-paths
  function getEventPath(node, event) {
    var path = [];
    var current = node;
    path.push(current);
    while (current) {
      // 4.1.
      var destinationInsertionPoints = getDestinationInsertionPoints(current);
      if (destinationInsertionPoints && destinationInsertionPoints.length > 0) {
        // 4.1.1
        for (var i = 0; i < destinationInsertionPoints.length; i++) {
          var insertionPoint = destinationInsertionPoints[i];
          // 4.1.1.1
          if (isShadowInsertionPoint(insertionPoint)) {
            var shadowRoot = insertionPoint.ownerShadowRoot_;
            // 4.1.1.1.2
            var olderShadowRoot = shadowRoot.olderShadowRoot;
            if (olderShadowRoot)
              path.push(olderShadowRoot);
          }

          // 4.1.1.2
          path.push(insertionPoint);
        }

        // 4.1.2
        current = destinationInsertionPoints[
            destinationInsertionPoints.length - 1];

      // 4.2
      } else {
        if (isShadowRoot(current)) {
          if (inSameTree(node, current) && eventMustBeStopped(event)) {
            // Stop this algorithm
            break;
          }
          current = current.host;
          path.push(current);

        // 4.2.2
        } else {
          current = current.parentNode;
          if (current)
            path.push(current);
        }
      }
    }

    return path;
  }

  // http://w3c.github.io/webcomponents/spec/shadow/#dfn-events-always-stopped
  function eventMustBeStopped(event) {
    if (!event)
      return false;

    switch (event.type) {
      case 'abort':
      case 'error':
      case 'select':
      case 'change':
      case 'load':
      case 'reset':
      case 'resize':
      case 'scroll':
      case 'selectstart':
        return true;
    }
    return false;
  }

  // http://w3c.github.io/webcomponents/spec/shadow/#dfn-shadow-insertion-point
  function isShadowInsertionPoint(node) {
    return node.localName == 'shadow';
    // and make sure that there are no shadow precing this?
    // and that there is no content ancestor?
  }

  function getDestinationInsertionPoints(node) {
    return scope.getDestinationInsertionPoints(node);
  }

  // http://w3c.github.io/webcomponents/spec/shadow/#event-retargeting
  function eventRetargetting(path, currentTarget) {
    if (path.length === 0)
      return currentTarget;

    // The currentTarget might be the window object. Use its document for the
    // purpose of finding the retargetted node.
    if (currentTarget instanceof scope.Window)
      currentTarget = currentTarget.document;

    var currentTargetTree = getTreeRoot(currentTarget);
    var originalTarget = path[0];
    var originalTargetTree = getTreeRoot(originalTarget);
    var relativeTargetTree =
        lowestCommonInclusiveAncestor(currentTargetTree, originalTargetTree);

    for (var i = 0; i < path.length; i++) {
      var node = path[i];
      if (getTreeRoot(node) === relativeTargetTree)
        return node;
    }

    return path[path.length - 1];
  }

  function getTreeRootAncestors(treeScope) {
    var ancestors = [];
    for (;treeScope; treeScope = getTreeRootParent(treeScope)) {
      ancestors.push(treeScope);
    }
    return ancestors;
  }

  function lowestCommonInclusiveAncestor(tsA, tsB) {
    var ancestorsA = getTreeRootAncestors(tsA);
    var ancestorsB = getTreeRootAncestors(tsB);

    var result = null;
    while (ancestorsA.length > 0 && ancestorsB.length > 0) {
      var a = ancestorsA.pop();
      var b = ancestorsB.pop();
      if (a === b)
        result = a;
      else
        break;
    }
    return result;
  }

  function relatedTargetResolution(event, currentTarget, relatedTarget) {
    // In case the current target is a window use its document for the purpose
    // of retargetting the related target.
    if (currentTarget instanceof scope.Window)
      currentTarget = currentTarget.document;

    var currentTargetTree = getTreeRoot(currentTarget);
    var relatedTargetTree = getTreeRoot(relatedTarget);

    var relatedTargetEventPath = getEventPath(relatedTarget, event);

    var lowestCommonAncestorTree;

    // 4
    var lowestCommonAncestorTree =
        lowestCommonInclusiveAncestor(currentTargetTree, relatedTargetTree);

    // 5
    if (!lowestCommonAncestorTree)
      lowestCommonAncestorTree = relatedTargetTree;

    // 6
    for (var commonAncestorTree = lowestCommonAncestorTree;
         commonAncestorTree;
         commonAncestorTree = getTreeRootParent(commonAncestorTree)) {
      // 6.1
      var adjustedRelatedTarget;
      for (var i = 0; i < relatedTargetEventPath.length; i++) {
        var node = relatedTargetEventPath[i];
        if (getTreeRoot(node) === commonAncestorTree)
          return node;
      }
    }

    return null;
  }

  function inSameTree(a, b) {
    return getTreeRoot(a) === getTreeRoot(b);
  }

  var NONE = 0;
  var CAPTURING_PHASE = 1;
  var AT_TARGET = 2;
  var BUBBLING_PHASE = 3;

  // pendingError is used to rethrow the first error we got during an event
  // dispatch. The browser actually reports all errors but to do that we would
  // need to rethrow the error asynchronously.
  var pendingError;

  function dispatchOriginalEvent(originalEvent) {
    // Make sure this event is only dispatched once.
    if (handledEventsTable.get(originalEvent))
      return;
    handledEventsTable.set(originalEvent, true);
    dispatchEvent(originalEvent, originalEvent.visualTarget_);
    if (pendingError) {
      var err = pendingError;
      pendingError = null;
      throw err;
    }
  }

  function isLoadLikeEvent(event) {
    switch (event.type) {
      // http://www.whatwg.org/specs/web-apps/current-work/multipage/webappapis.html#events-and-the-window-object
      case 'load':
      // http://www.whatwg.org/specs/web-apps/current-work/multipage/browsers.html#unloading-documents
      case 'beforeunload':
      case 'unload':
        return true;
    }
    return false;
  }

  function dispatchEvent(event, originalTarget) {
    if (currentlyDispatchingEvents.get(event))
      throw new Error('InvalidStateError');

    currentlyDispatchingEvents.set(event, true);

    // Render to ensure that the event path is correct.
    scope.renderAllPending();
    var eventPath;

    // http://www.whatwg.org/specs/web-apps/current-work/multipage/webappapis.html#events-and-the-window-object
    // All events dispatched on Nodes with a default view, except load events,
    // should propagate to the Window.

    // http://www.whatwg.org/specs/web-apps/current-work/multipage/the-end.html#the-end
    var overrideTarget;
    var win;

    // Should really be not cancelable too but since Firefox has a bug there
    // we skip that check.
    // https://bugzilla.mozilla.org/show_bug.cgi?id=999456
    if (isLoadLikeEvent(event) && !event.bubbles) {
      var doc = originalTarget;
      if (doc instanceof Document && (win = doc.defaultView)) {
        overrideTarget = doc;
        eventPath = [];
      }
    }

    if (!eventPath) {
      if (originalTarget instanceof scope.Window) {
        win = originalTarget;
        eventPath = [];
      } else {
        eventPath = getEventPath(originalTarget, event);

        if (!isLoadLikeEvent(event)) {
          var doc = eventPath[eventPath.length - 1];
          if (doc instanceof Document)
            win = doc.defaultView;
        }
      }
    }

    eventPathTable.set(event, eventPath);

    if (dispatchCapturing(event, eventPath, win, overrideTarget)) {
      if (dispatchAtTarget(event, eventPath, win, overrideTarget)) {
        dispatchBubbling(event, eventPath, win, overrideTarget);
      }
    }

    eventPhaseTable.set(event, NONE);
    currentTargetTable.delete(event, null);
    currentlyDispatchingEvents.delete(event);

    return event.defaultPrevented;
  }

  function dispatchCapturing(event, eventPath, win, overrideTarget) {
    var phase = CAPTURING_PHASE;

    if (win) {
      if (!invoke(win, event, phase, eventPath, overrideTarget))
        return false;
    }

    for (var i = eventPath.length - 1; i > 0; i--) {
      if (!invoke(eventPath[i], event, phase, eventPath, overrideTarget))
        return false;
    }

    return true;
  }

  function dispatchAtTarget(event, eventPath, win, overrideTarget) {
    var phase = AT_TARGET;
    var currentTarget = eventPath[0] || win;
    return invoke(currentTarget, event, phase, eventPath, overrideTarget);
  }

  function dispatchBubbling(event, eventPath, win, overrideTarget) {
    var phase = BUBBLING_PHASE;
    for (var i = 1; i < eventPath.length; i++) {
      if (!invoke(eventPath[i], event, phase, eventPath, overrideTarget))
        return;
    }

    if (win && eventPath.length > 0) {
      invoke(win, event, phase, eventPath, overrideTarget);
    }
  }

  var functionCall = Function.prototype.call;

  function invoke(currentTarget, event, phase, eventPath, overrideTarget) {
    var listeners = listenersTable.get(currentTarget);
    if (!listeners)
      return true;

    var target = overrideTarget || eventRetargetting(eventPath, currentTarget);

    if (target === currentTarget) {
      if (phase === CAPTURING_PHASE)
        return true;

      if (phase === BUBBLING_PHASE)
         phase = AT_TARGET;

    } else if (phase === BUBBLING_PHASE && !event.bubbles) {
      return true;
    }

    if ('visualRelatedTarget_' in event) {
      var relatedTarget = event.visualRelatedTarget_;

      // X-Tag sets relatedTarget on a CustomEvent. If they do that there is no
      // way to have relatedTarget return the adjusted target but worse is that
      // the originalEvent might not have a relatedTarget so we hit an assert
      // when we try to wrap it.
      if (relatedTarget) {
        // In IE we can get objects that are not EventTargets at this point.
        // Safari does not have an EventTarget interface so revert to checking
        // for addEventListener as an approximation.
        if (relatedTarget instanceof Object &&
            relatedTarget.addEventListener) {

          var adjusted =
              relatedTargetResolution(event, currentTarget, relatedTarget);
          if (adjusted === target)
            return true;
        } else {
          adjusted = null;
        }
        relatedTargetTable.set(event, adjusted);
      }
    }

    eventPhaseTable.set(event, phase);
    var type = event.type;

    var anyRemoved = false;
    targetTable.set(event, target);
    currentTargetTable.set(event, currentTarget);

    // Keep track of the invoke depth so that we only clean up the removed
    // listeners if we are in the outermost invoke.
    listeners.depth++;

    for (var i = 0, len = listeners.length; i < len; i++) {
      var listener = listeners[i];
      if (listener.removed) {
        anyRemoved = true;
        continue;
      }

      if (listener.type !== type ||
          !listener.capture && phase === CAPTURING_PHASE ||
          listener.capture && phase === BUBBLING_PHASE) {
        continue;
      }

      try {
        if (typeof listener.handler === 'function') {
          // Use Function.prototype.call explicitly to avoid the "Permission
          // denied to access property 'call'" error in cross frame situations.
          functionCall.call(listener.handler, currentTarget, event);
        } else {
          listener.handler.handleEvent(event);
        }

        if (stopImmediatePropagationTable.get(event))
          return false;

      } catch (ex) {
        if (!pendingError)
          pendingError = ex;
      }
    }

    listeners.depth--;

    if (anyRemoved && listeners.depth === 0) {
      var copy = listeners.slice();
      listeners.length = 0;
      for (var i = 0; i < copy.length; i++) {
        if (!copy[i].removed)
          listeners.push(copy[i]);
      }
    }

    return !stopPropagationTable.get(event);
  }

  function Listener(type, handler, capture) {
    this.type = type;
    this.handler = handler;
    this.capture = Boolean(capture);
  }
  Listener.prototype = {
    equals: function(that) {
      return this.handler === that.handler && this.type === that.type &&
          this.capture === that.capture;
    },
    get removed() {
      return this.handler === null;
    },
    remove: function() {
      this.handler = null;
    }
  };

  var Event = window.Event;
  Event.prototype.polymerBlackList_ = {
    returnValue: true,
    // TODO(arv): keyLocation is part of KeyboardEvent but Firefox does not
    // support constructable KeyboardEvent so we keep it here for now.
    keyLocation: true
  };

  copyProperty(Event, 'target', 'visualTarget_');

  mixin(Event.prototype, {
    get target() {
      return targetTable.get(this);
    },
    get currentTarget() {
      return currentTargetTable.get(this);
    },
    get eventPhase() {
      return eventPhaseTable.get(this);
    },
    get path() {
      var eventPath = eventPathTable.get(this);
      if (!eventPath)
        return [];
      // TODO(arv): Event path should contain window.
      return eventPath.slice();
    },
    stopPropagation: function() {
      stopPropagationTable.set(this, true);
    },
    stopImmediatePropagation: function() {
      stopPropagationTable.set(this, true);
      stopImmediatePropagationTable.set(this, true);
    }
  });

  var relatedTargetProto = {
    get relatedTarget() {
      var relatedTarget = relatedTargetTable.get(this);
      // relatedTarget can be null.
      if (relatedTarget !== undefined)
        return relatedTarget;
      return this.visualRelatedTarget_;
    }
  };

  copyProperty(FocusEvent, 'relatedTarget', 'visualRelatedTarget_');
  copyProperty(MouseEvent, 'relatedTarget', 'visualRelatedTarget_');
  mixin(FocusEvent.prototype, relatedTargetProto);
  mixin(MouseEvent.prototype, relatedTargetProto);

  // In case the browser does not support event constructors we polyfill that
  // by calling `createEvent('Foo')` and `initFooEvent` where the arguments to
  // `initFooEvent` are derived from the registered default event init dict.
  var defaultInitDicts = Object.create(null);

  var supportsEventConstructors = (function() {
    try {
      new FocusEvent('focus');
    } catch (ex) {
      return false;
    }
    return true;
  })();

  /**
   * Constructs a new native event.
   */
  function constructEvent(Event, name, type, options) {
    if (supportsEventConstructors)
      return new Event(type, options);

    // Create the arguments from the default dictionary.
    var event = document.createEvent(name);
    var defaultDict = defaultInitDicts[name];
    var args = [type];
    Object.keys(defaultDict).forEach(function(key) {
      var v = options != null && key in options ?
          options[key] : defaultDict[key];
      args.push(v);
    });
    event['init' + name].apply(event, args);
    return event;
  }

  if (!supportsEventConstructors) {
    var configureEventConstructor = function(name, initDict, superName) {
      if (superName) {
        var superDict = defaultInitDicts[superName];
        initDict = mixin(mixin({}, superDict), initDict);
      }

      defaultInitDicts[name] = initDict;
    };

    // The order of the default event init dictionary keys is important, the
    // arguments to initFooEvent is derived from that.
    configureEventConstructor('Event', {bubbles: false, cancelable: false});
    configureEventConstructor('CustomEvent', {detail: null}, 'Event');
    configureEventConstructor('UIEvent', {view: null, detail: 0}, 'Event');
    configureEventConstructor('MouseEvent', {
      screenX: 0,
      screenY: 0,
      clientX: 0,
      clientY: 0,
      ctrlKey: false,
      altKey: false,
      shiftKey: false,
      metaKey: false,
      button: 0,
      relatedTarget: null
    }, 'UIEvent');
    configureEventConstructor('FocusEvent', {relatedTarget: null}, 'UIEvent');
  }

  function isValidListener(fun) {
    if (typeof fun === 'function')
      return true;
    return fun && fun.handleEvent;
  }

  function isMutationEvent(type) {
    switch (type) {
      case 'DOMAttrModified':
      case 'DOMAttributeNameChanged':
      case 'DOMCharacterDataModified':
      case 'DOMElementNameChanged':
      case 'DOMNodeInserted':
      case 'DOMNodeInsertedIntoDocument':
      case 'DOMNodeRemoved':
      case 'DOMNodeRemovedFromDocument':
      case 'DOMSubtreeModified':
        return true;
    }
    return false;
  }


  // Node and Window have different internal type checks in WebKit so we cannot
  // use the same method as the original function.
  var methodNames = [
    'addEventListener',
    'removeEventListener',
    'dispatchEvent'
  ];

  [Node, Window].forEach(function(constructor) {
    var p = constructor.prototype;
    methodNames.forEach(function(name) {
      Object.defineProperty(p, name + '_', {value: p[name]});
    });
  });

  function getTargetToListenAt(node) {
    if (node instanceof scope.ShadowRoot)
      node = node.host;
    return node;
  }

  var eventTargetProto = {
    addEventListener: function(type, fun, capture) {
      var self = this || window;
      if (!isValidListener(fun) || isMutationEvent(type))
        return;

      var listener = new Listener(type, fun, capture);
      var listeners = listenersTable.get(self);
      if (!listeners) {
        listeners = [];
        listeners.depth = 0;
        listenersTable.set(self, listeners);
      } else {
        // Might have a duplicate.
        for (var i = 0; i < listeners.length; i++) {
          if (listener.equals(listeners[i]))
            return;
        }
      }

      listeners.push(listener);

      var target = getTargetToListenAt(self);
      target.addEventListener_(type, dispatchOriginalEvent, true);
    },
    removeEventListener: function(type, fun, capture) {
      var self = this || window;
      capture = Boolean(capture);
      var listeners = listenersTable.get(self);
      if (!listeners)
        return;
      var count = 0, found = false;
      for (var i = 0; i < listeners.length; i++) {
        if (listeners[i].type === type && listeners[i].capture === capture) {
          count++;
          if (listeners[i].handler === fun) {
            found = true;
            listeners[i].remove();
          }
        }
      }

      if (found && count === 1) {
        var target = getTargetToListenAt(self);
        target.removeEventListener_(type, dispatchOriginalEvent, true);
      }
    },
    dispatchEvent: function(event) {
      var self = this || window;
      // We want to use the native dispatchEvent because it triggers the default
      // actions (like checking a checkbox). However, if there are no listeners
      // in the composed tree then there are no events that will trigger and
      // listeners in the non composed tree that are part of the event path are
      // not notified.
      //
      // If we find out that there are no listeners in the composed tree we add
      // a temporary listener to the target which makes us get called back even
      // in that case.
      var eventType = event.type;

      // Allow dispatching the same event again. This is safe because if user
      // code calls self during an existing dispatch of the same event the
      // native dispatchEvent throws (that is required by the spec).
      handledEventsTable.set(event, false);

      // Force rendering since we prefer native dispatch and that works on the
      // composed tree.
      scope.renderAllPending();

      var tempListener;
      if (!hasListenerInAncestors(self, eventType)) {
        tempListener = function() {};
        self.addEventListener(eventType, tempListener, true);
      }

      try {
        return self.dispatchEvent_(event);
      } finally {
        if (tempListener)
          self.removeEventListener(eventType, tempListener, true);
      }
    }
  };
  mixin(Node.prototype, eventTargetProto);
  mixin(Window.prototype, eventTargetProto);

  function hasListener(node, type) {
    var listeners = listenersTable.get(node);
    if (listeners) {
      for (var i = 0; i < listeners.length; i++) {
        if (!listeners[i].removed && listeners[i].type === type)
          return true;
      }
    }
    return false;
  }

  function hasListenerInAncestors(target, type) {
    for (var node = target; node; node = node.visualParentNode_) {
      if (hasListener(node, type))
        return true;
    }
    return false;
  }

  var originalElementFromPoint = document.elementFromPoint;

  function elementFromPoint(self, document, x, y) {
    scope.renderAllPending();

    var element = originalElementFromPoint.call(document, x, y);
    if (!element)
      return null;
    var path = getEventPath(element, null);

    // scope the path to this tree root
    var idx = path.lastIndexOf(self);
    if (idx == -1)
      return null;
    else
      path = path.slice(0, idx);

    // TODO(dfreedm): pass idx to eventRetargetting to avoid array copy
    return eventRetargetting(path, self);
  }

  /**
   * Returns a function that is to be used as a getter for `onfoo` properties.
   * @param {string} name
   * @return {Function}
   */
  function getEventHandlerGetter(name) {
    return function() {
      var inlineEventHandlers = eventHandlersTable.get(this);
      return inlineEventHandlers && inlineEventHandlers[name] &&
          inlineEventHandlers[name].value || null;
     };
  }

  /**
   * Returns a function that is to be used as a setter for `onfoo` properties.
   * @param {string} name
   * @return {Function}
   */
  function getEventHandlerSetter(name) {
    var eventType = name.slice(2);
    return function(value) {
      var inlineEventHandlers = eventHandlersTable.get(this);
      if (!inlineEventHandlers) {
        inlineEventHandlers = Object.create(null);
        eventHandlersTable.set(this, inlineEventHandlers);
      }

      var old = inlineEventHandlers[name];
      if (old)
        this.removeEventListener(eventType, old.wrapped, false);

      if (typeof value === 'function') {
        var wrapped = function(e) {
          var rv = value.call(this, e);
          if (rv === false)
            e.preventDefault();
          else if (name === 'onbeforeunload' && typeof rv === 'string')
            e.returnValue = rv;
          // mouseover uses true for preventDefault but preventDefault for
          // mouseover is ignored by browsers these day.
        };

        this.addEventListener(eventType, wrapped, false);
        inlineEventHandlers[name] = {
          value: value,
          wrapped: wrapped
        };
      }
    };
  }

  scope.elementFromPoint = elementFromPoint;
  scope.getEventHandlerGetter = getEventHandlerGetter;
  scope.getEventHandlerSetter = getEventHandlerSetter;

})(window.ShadowDOMPolyfill);
