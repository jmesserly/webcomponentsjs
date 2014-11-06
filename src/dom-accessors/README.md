DOM Accessors Polyfill
======================

This polyfill enables DOM accessors to be used in with EcmaScript functions
[Object.defineProperty][defineProp] and [Object.getOwnPropertyDescriptor][getProp].
It's [specified in WebIDL][webidl] but broken in [Chrome][crbug] and [Safari][sfbug] as of 2014-09-22.

It is not possible to work around the issue purely in code. Instead, this needs
a rename step that will replace calls such as `obj.parentNode` with
`obj.__$parentNode`. The latter can be redefined correctly, and the original
getter/setter can becalled by the polyfill using the original name.
 
[defineProp]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperty
[getProp]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/getOwnPropertyDescriptor
[webidl]: http://heycam.github.io/webidl/#indexed-and-named-properties
[crbug]: https://code.google.com/p/chromium/issues/detail?id=43394
[sfbug]: https://bugs.webkit.org/show_bug.cgi?id=49739
