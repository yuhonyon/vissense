    /**
 * @license
 * Vissense <http://vissense.com/>
 * Copyright 2014 tbk <theborakompanioni+vissense@gmail.com>
 * Available under MIT license <http://opensource.org/licenses/MIT>
 */
;(function(window, Visibility, undefined) {
  'use strict';

    function _window(element) {
        var doc = element && element.ownerDocument;
        return doc ? doc.defaultView || doc.parentWindow : window;
	}

    /**
    * Returns a function that invokes callback only if call to when() is true
    */
    function fireIf(when, callback) {
      return function() {
        return when() ? callback() : undefined;
      };
    }

    var VisSenseUtils = {
        _window : _window,
        fireIf: fireIf
    };

      function extend(dest, source, callback) {
        var index = -1,
            props = Object.keys(source),
            length = props.length;

        while (++index < length) {
          var key = props[index];
          dest[key] = callback ? callback(dest[key], source[key], key, dest, source) : source[key];
        }

        return dest;
      }

      function noop() {
      }

      function identity(i) {
        return i;
      }

      function now() {
          return new Date().getTime();
      }

      function defer(callback) {
          return window.setTimeout(function() {
              callback();
          }, 0 /*1*/);
      }

      function isObject(obj) {
        return obj === Object(obj);
      }

      function defaults(dest, source) {
        if (!isObject(dest)) {
            return source;
        }
        var keys = Object.keys(source);
        for (var i = 0, n = keys.length; i < n; i++) {
          var prop = keys[i];
          if (dest[prop] === void 0) {
            dest[prop] = source[prop];
          }
        }
        return dest;
      }

      VisSenseUtils = extend(VisSenseUtils, {
        noop:noop,
        identity:identity,
        isObject:isObject,
        defaults:defaults,
        extend:extend,
        now:now,
        defer:defer
      });

    /********************************************************** element-position */

	function _getBoundingClientRect(element) {
		var r = element.getBoundingClientRect();
		// height and width are not standard elements - so lets add them
		if(r.height === undefined || r.width === undefined) {
			// copying object because attributes cannot be added to 'r'
			return extend({
				height: element.clientHeight,
				width: element.clientWidth
			}, r);
		}
		return r;
	}

	/**
	* return the viewport (does *not* subtract scrollbar size)
	*/
    function viewport(element) {
        var w = element ? VisSenseUtils._window(element) : window;
        if(w.innerWidth === undefined) {
            return {
                height: w.document.documentElement.clientHeight,
                width: w.document.documentElement.clientWidth
            };
        }
		return {
		    height: w.innerHeight,
		    width: w.innerWidth
		};
	}

	function isFullyInViewport(element) {
		var r = _getBoundingClientRect(element);
		if(!r || (r.width <= 0 || r.height <= 0)) {
			return false;
		}
		var view = viewport(element);

		return r.top >= 0 &&
			r.left >= 0 &&
			r.bottom <= view.height &&
			r.right <= view.width;
	}

	function isInViewport(element) {
		var r = _getBoundingClientRect(element);
		if(!r || (r.width <= 0 || r.height <= 0)) {
			return false;
		}
		var view = viewport(element);
		return r.bottom > 0 &&
			r.right > 0 &&
			r.top < view.height &&
			r.left < view.width;
	}

    VisSenseUtils.viewport = viewport;
    VisSenseUtils.isFullyInViewport = isFullyInViewport;
    VisSenseUtils.isInViewport = isInViewport;
    VisSenseUtils._getBoundingClientRect = _getBoundingClientRect;


    /********************************************************** element-position end */

    /********************************************************** element-styling */

    function _isVisibleByOffsetParentCheck(element) {
        // https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement.offsetParent
        if(!element.offsetParent) {
            var position = _findEffectiveStyleProperty(element, 'position');
            if(position !== 'fixed') {
                return false;
            }
        }
        return true;
    }

	function _findEffectiveStyle(element) {
		var w = VisSenseUtils._window(element);

		if (typeof element.style === 'undefined') {
			return undefined; // not a styled element
		}
		if (w.getComputedStyle) {
			// DOM-Level-2-CSS
			return w.getComputedStyle(element, null);
		}
		if (element.currentStyle) {
			// non-standard IE alternative
			return element.currentStyle;
			// TODO: this won't really work in a general sense, as
			//   currentStyle is not identical to getComputedStyle()
			//   ... but it's good enough for "visibility"
		}

		throw new Error('cannot determine effective stylesheet in this browser');
	}

	function _findEffectiveStyleProperty(element, property) {
		var effectiveStyle = _findEffectiveStyle(element);
		if(!effectiveStyle) {
		    return undefined;
		}
		var propertyValue = effectiveStyle[property];
		if (propertyValue === 'inherit' && element.parentNode.style) {
			return _findEffectiveStyleProperty(element.parentNode, property);
		}
		return propertyValue;
	}

	function _isDisplayed(element) {
		var display = _findEffectiveStyleProperty(element, 'display');
		if (display === 'none') {
			return false;
		}
		if (element.parentNode && element.parentNode.style) {
			return _isDisplayed(element.parentNode);
		}
		return true;
	}

    function isVisibleByStyling(element) {
        if (element === VisSenseUtils._window(element).document) {
            return true;
        }

        if (!element || !element.parentNode){
            return false;
        }

        if(!_isVisibleByOffsetParentCheck(element)) {
            return false;
        }

        var displayed = _isDisplayed(element);
        if(displayed !== true) {
            return false;
        }

        var visibility = _findEffectiveStyleProperty(element, 'visibility');
        if(visibility === 'hidden' || visibility === 'collapse') {
            return false;
        }

        return true;
    }

    VisSenseUtils._isDisplayed = _isDisplayed;
    VisSenseUtils._findEffectiveStyle = _findEffectiveStyle;
    VisSenseUtils.isVisibleByStyling = isVisibleByStyling;

    /********************************************************** element-styling end */

    /********************************************************** element visibility */

    function percentage(element) {
  		if(!VisSenseUtils.isInViewport(element) || !VisSenseUtils.isVisibleByStyling(element) || !VisSenseUtils.isPageVisible()) {
  			return 0;
  		}
  		// r's height and width are greater than 0 because element is in viewport
  		var r = VisSenseUtils._getBoundingClientRect(element);

  		var vh = 0; // visible height
  		var vw = 0; // visible width
  		var viewport = VisSenseUtils.viewport(element);

  		if(r.top >= 0) {
  			vh = Math.min(r.height, viewport.height - r.top);
  		} else if(r.bottom > 0) {
  			vh = Math.min(viewport.height, r.bottom);
  		} /* otherwise {
  			this path cannot be taken otherwise element would not be in viewport
  		} */

  		if(r.left >= 0) {
  			vw = Math.min(r.width, viewport.width - r.left);
  		} else if(r.right > 0) {
  			vw = Math.min(viewport.width, r.right);
  		} /* otherwise {
  			 this path cannot be taken otherwise element would not be in viewport
  		} */

  		var area = (vh * vw) / (r.height * r.width);

  		return Math.max(area, 0);
  	}

  	function isFullyVisible(element) {
  		return VisSenseUtils.isPageVisible() &&
  		VisSenseUtils.isFullyInViewport(element) &&
  		VisSenseUtils.isVisibleByStyling(element);
  	}

      function isVisible(element) {
          return VisSenseUtils.isPageVisible() &&
          VisSenseUtils.isInViewport(element) &&
          VisSenseUtils.isVisibleByStyling(element);
      }

      function isHidden(element) {
          return !isVisible(element);
      }

      VisSenseUtils.percentage = percentage;
      VisSenseUtils.isFullyVisible = isFullyVisible;
      VisSenseUtils.isVisible = isVisible;
      VisSenseUtils.isHidden = isHidden;


    /********************************************************** element visibility end */

    /********************************************************** page visibility */
    var PageVisibilityAPIAvailable = !!Visibility && !!Visibility.change && !!Visibility.isSupported && Visibility.isSupported();

    function isPageVisibilityAPIAvailable() {
      return !!PageVisibilityAPIAvailable;
    }

    function isPageVisible() {
      return PageVisibilityAPIAvailable ? !Visibility.hidden() : true;
    }

    function onPageVisibilityChange(callback) {
        if(PageVisibilityAPIAvailable) {
            Visibility.change(callback);
        }
    }

    VisSenseUtils.isPageVisibilityAPIAvailable = isPageVisibilityAPIAvailable;
    VisSenseUtils.isPageVisible = isPageVisible;
    VisSenseUtils.onPageVisibilityChange = onPageVisibilityChange;

    /********************************************************** page visibility end */



    window.VisSenseUtils = VisSenseUtils;

}.call(this, window, window.Visibility || null));