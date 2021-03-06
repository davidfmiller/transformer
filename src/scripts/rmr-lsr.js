/* global document,window,Element,module,console */

// https://developer.apple.com/tvos/human-interface-guidelines/icons-and-images/layered-images/

/*
 * lsr
 * ©2017 David Miller
 * https://readmeansrun/com
 *
 * lsr is licensed under the MIT license:
 *   http://www.opensource.org/licenses/mit-license.php
 *
 * http://designmodo.com/apple-tv-effect
 */

(function() {
  'use strict';

  const
  // VERSION = '0.0.1',

  RMR = require('rmr-util');

  /**
   * Create an LSR instance
   *
   * @param {Object} arg - object containing params
   */
  const LSR = function(arg) {
    let
    l = 0,
    imgs = [],
    listeners = {};

    const
    defaults = {
      layerNodeName: 'DIV', // layer node name under .lsr
      parallax: 0.5,
      debug: true,
      prefix: 'lsr',
      node: document.body,
      shine: true,
      scale: 1,
      shadow: true,
      rotation: {
        x: 0.05,
        y: 0.05
      }
    },
    config = RMR.Object.merge(defaults, arg) || defaults,
    supportsTouch = 'ontouchstart' in window || navigator.msMaxTouchPoints;

    if (! config.node) {
      config.node = document.body;
    }

    if (typeof config.node === 'string') {
      config.node = document.querySelector(config.node);
    }

    if (! config.node instanceof Element) {
      throw new Error('Invalid LSR ' + config.node);
    }

    if (! config.rotation.hasOwnProperty('x')) {
      config.rotation.x = defaults.rotation.x;
    }
    if (! config.rotation.hasOwnProperty('y')) {
      config.rotation.y = defaults.rotation.y;
    }

    imgs = RMR.Array.coerce(config.node.querySelectorAll('.' + config.prefix));
    if (config.node.classList.contains(config.prefix)) {
      imgs.push(config.node);
    }

    // no .lsr elements to process
    if (imgs.length === 0) {
      if (defaults.debug) {
        window.console.log('No layers');
      }
      return;
    }

    for (l = 0; l < imgs.length; l++) {

      const
      thisImg = imgs[l],
      layerElems = RMR.Array.coerce(thisImg.childNodes).filter(e => e.nodeName.toUpperCase() ===  config.layerNodeName);


      if (! thisImg.getAttribute('id')) {
        thisImg.setAttribute('id', RMR.String.guid());
      }

      if (layerElems.length <= 0) {
        continue;
      }

      while (thisImg.firstChild) {
        thisImg.removeChild(thisImg.firstChild);
      }

      const
        container = document.createElement('div'),
        shine = document.createElement('div'),
        layersHTML = document.createElement('div'),
        layers = [];

      let shadow = document.createElement('div');

      container.className = config.prefix + '-container';

      if (config.shine) {
        shine.className = config.prefix + '-shine';
        container.appendChild(shine);
      }

      if (config.shadow) {
        shadow.className = config.prefix + '-shadow';
        container.appendChild(shadow);
      } else {
        shadow = null;
      }

      layersHTML.className = config.prefix + '-layers';

      for (let i = 0; i < layerElems.length; i++) {
        const layer = document.createElement('div');

        layer.className = layerElems[i].className ? layerElems[i].className : '';

        layersHTML.appendChild(layer);
        layer.innerHTML = layerElems[i].innerHTML;

        layers.push(layer);
      }

      container.appendChild(layersHTML);

      thisImg.appendChild(container);

      const w = thisImg.clientWidth || thisImg.offsetWidth || thisImg.scrollWidth;
      thisImg.style.transform = 'perspective('+ w*3 +'px)';

      if (supportsTouch) {
        window.preventScroll = false;

        (function(_thisImg,_layers,_totalLayers,_shine) {

          const
          touchmove = function(e) {
            if (window.preventScroll) {
              e.preventDefault();
            }
            processMovement(e,_thisImg,_layers,_totalLayers,_shine);
          },
          touchstart = function() {
            window.preventScroll = true;
            processEnter(_thisImg);
          },
          touchend = function(e) {
            window.preventScroll = false;
            processExit(e,_thisImg,_layers,_totalLayers,_shine);
          };

          listeners[_thisImg.getAttribute('id')] = {
            'touchmove': touchmove,
            'touchstart': touchstart,
            'touchend': touchend
          };

          thisImg.addEventListener('touchmove', touchmove);

          thisImg.addEventListener('touchstart', touchstart);

          thisImg.addEventListener('touchend', touchend);

        })(thisImg,layers,layerElems.length,shine);
      } else {
        (function(_thisImg,_layers,_totalLayers,_shine) {

          const mousemove = function(e) {
            processMovement(e,_thisImg,_layers,_totalLayers,_shine);
          },
          focus = function() {
            processEnter(_thisImg);
            processMovement(null,_thisImg,_layers,_totalLayers,_shine);
          },
          mouseenter = function() {
            processEnter(_thisImg);
          },
          mouseleave = function() {
            processExit(_thisImg,_layers,_totalLayers,_shine);
          },
          blur = function() {
            processExit(_thisImg,_layers,_totalLayers,_shine);
          };

          listeners[_thisImg.getAttribute('id')] = {
            'mousemove': mousemove,
            'focus': focus,
            'mouseenter': mouseenter,
            'mouseleave': mouseleave,
            'blur': blur
          };

          thisImg.addEventListener('mousemove', mousemove);

          thisImg.addEventListener('focus', focus);

          thisImg.addEventListener('mouseenter', mouseenter);

          thisImg.addEventListener('mouseleave', mouseleave);

          thisImg.addEventListener('blur', blur);

        })(thisImg,layers,layerElems.length,shine);
      }
    }

    this.destroy = function() {
      for (const id in listeners) {
        if (listeners.hasOwnProperty(id)) {
          const node = document.getElementById(id);
          if (! node) {
            continue;
          }
          for (const event in listeners[id]) {
            if (listeners[id].hasOwnProperty(event)) {
              node.removeEventListener(event, listeners[id][event]);
            }
          }
        }
      }

      listeners = null;
    };

    function processMovement(event, element, layers, totalLayers, shine) {
      if (! event) {
        const region = RMR.Node.getRect(element);
        event = { pageX: region.left + region.width / 2, pageY: region.top + region.height / 2 };
      }

      const
        touchEnabled = ('ontouchstart' in window || navigator.msMaxTouchPoints) ? true : false,
        bdst = document.body.scrollTop,
        bdsl = document.body.scrollLeft,
        pageX = (touchEnabled)? event.touches[0].pageX : event.pageX,
        pageY = (touchEnabled)? event.touches[0].pageY : event.pageY,
        offsets = element.getBoundingClientRect(),
        w = element.clientWidth || element.offsetWidth || element.scrollWidth, // width
        h = element.clientHeight || element.offsetHeight || element.scrollHeight, // height
        wMultiple = 500/w,
        offsetX = 0.52 - (pageX - offsets.left - bdsl)/w, // cursor position X
        offsetY = 0.52 - (pageY - offsets.top - bdst)/h, // cursor position Y
        dy = (pageY - offsets.top - bdst) - h / 2, // @h/2 = center of container
        dx = (pageX - offsets.left - bdsl) - w / 2, // @w/2 = center of container
        yRotate = (offsetX - dx)*(config.rotation.y * wMultiple), // rotation for container Y
        xRotate = (dy - offsetY)*(config.rotation.x * wMultiple); // rotation for container X

      let
        i = 0,
        angle = Math.atan2(dy, dx) * 180 / Math.PI - 90, // convert rad in degrees
        imgCSS = 'rotateX(' + xRotate + 'deg) rotateY(' + yRotate + 'deg)'; // img transform

      // get angle between 0-360
      if (angle < 0) {
        angle = angle + 360;
      }

      if (element.firstChild.classList.contains('over')) {
        imgCSS += ' scale3d(' + config.scale + ',' + config.scale + ',' + config.scale + ')';
      }
      element.firstChild.style.transform = imgCSS;

      if (shine) {
        shine.style.background = 'linear-gradient(' + angle + 'deg, rgba(255,255,255,' + (pageY - offsets.top - bdst)/h * 0.4 + ') 0%,rgba(255,255,255,0) 80%)';
        shine.style.transform = 'translateX(' + (offsetX * totalLayers) - 0.1 + 'px) translateY(' + (offsetY * totalLayers) - 0.1 + 'px)';
      }

      let revNum = 0; // totalLayers;
      const factor = config.parallax * 100;
      for (i = 0; i < totalLayers; i++) {
//        layers[i].style.transform = 'translateX(' + (offsetX * (totalLayers - i)) * ((i * 2.5) / wMultiple) + 'px) translateY(' + (offsetY * totalLayers) * ((i * 2.5) / wMultiple) + 'px)';
        layers[i].style.transform = 'translateX(' + (offsetX * revNum) * ((i * factor) / wMultiple) + 'px) translateY(' + (offsetY * revNum) * ((i * factor) / wMultiple) + 'px)';

        revNum++;
      }
    }

    function processEnter(element) {
      element.firstChild.classList.add('over');
    }

    function processExit(element, layers, totalLayers, shine) {
      const container = element.firstChild;
      let i = 0;

      container.classList.remove('over');
      container.style.transform = '';
      shine.style.cssText = '';

      for (i = 0; i < totalLayers; i++) {
        layers[i].style.transform = '';
      }
    }
  };

  module.exports = LSR;
})();
