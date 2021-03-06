/*!
 * pure-dialog - v@version@
 * Pure JavaScript HTML dialog as a Web Component
 * https://github.com/john-doherty/pure-dialog
 * @author John Doherty <www.johndoherty.info>
 * @license MIT
 */
(function (base, window, document) {

    'use strict';

    /**
     * @exports pure-dialog
     * @description A custom HTML element (Web Component) that can be created using
     * document.createElement('pure-dialog') or included in a HTML page as an element.
     */

    // Create a prototype for our new element that extends HTMLElement
    var pureDialog = Object.create(base, {

        /** @property {string} pure-dialog.title - title of the dialog */
        title: {
            get: function () {
                return this.getAttribute('title') || '';
            },
            set: function (value) {
                this.setAttribute('title', value);
            }
        },

        /** @property {string} pure-dialog.buttons - comma separated list of button labels */
        buttons: {
            get: function () {
                return this.getAttribute('buttons') || '';
            },
            set: function (value) {
                this.setAttribute('buttons', value);
            }
        },

        /** @property {boolean} pure-dialog.closeButton - show or hide the dialog close icon */
        closeButton: {
            get: function () {
                return (this.getAttribute('close-button') === 'true');
            },
            set: function (value) {
                this.setAttribute('close-button', value === true);
            }
        },

        /** @property {string} pure-dialog.innerHTML - set the dialog body HTML */
        innerHTML: {
            get: function () {
                return (this._body) ? this._body.innerHTML : '';
            },
            set: function (value) {
                if (this._body) {
                    this._body.innerHTML = value;
                }
            }
        },

        /** @property {string} pure-dialog.removeOnClose - removes the dialog from the dom on close */
        removeOnClose: {
            get: function () {
                return (this.getAttribute('remove-on-close') === 'true');
            },
            set: function (value) {
                this.setAttribute('remove-on-close', value === true);
            }
        }
    });

    /**
     * Executes when created, fires attributeChangedCallback for each attribute set
     * @access private
     * @returns {void}
     */
    pureDialog.createdCallback = function () {

        var self = this;
        var attributes = Array.prototype.slice.call(self.attributes);

        renderBody.call(this);

        // ensure current attributes are set
        attributes.forEach(function(item) {
            self.attributeChangedCallback(item.name, null, item.value);
        });

        // if remove on close is set, remove it
        self.addEventListener('pure-dialog-closed', function(e) {

            if (e.target.removeOnClose) {
                e.target.remove();
            }
        });
    };

    /**
     * Executes when any pure-dialog attribute is changed
     * @access private
     * @type {Event}
     * @param {string} attrName - the name of the attribute to have changed
     * @param {string} oldVal - the old value of the attribute
     * @param {string} newVal - the new value of the attribute
     * @returns {void}
     */
    pureDialog.attributeChangedCallback = function (attrName, oldVal, newVal) {

        if (oldVal === newVal) return;

        switch (attrName) {

            case 'title': {
                renderTitle.call(this);
            } break;

            case 'buttons': {
                renderButtons.call(this);
            } break;

            case 'close-button': {
                renderCloseButton.call(this);
            } break;
        }
    };

    /**
     * Shows the dialog
     * @access public
     * @returns {void}
     */
    pureDialog.show = function() {

        var allow = this.dispatchEvent(new CustomEvent('pure-dialog-opening', { bubbles: true, cancelable: true }));

        if (allow) {
            this.setAttribute('open', 'true');
            this.dispatchEvent(new CustomEvent('pure-dialog-opened', { bubbles: true, cancelable: true }));
        }
    };

    /**
     * Shows the dialog as a modal
     * @access public
     * @returns {void}
     */
    pureDialog.showModal = function() {

        var allow = this.dispatchEvent(new CustomEvent('pure-dialog-opening', { bubbles: true, cancelable: true }));

        if (allow) {
            this.setAttribute('open', 'true');
            this.setAttribute('modal', 'true');
            this.dispatchEvent(new CustomEvent('pure-dialog-opened', { bubbles: true, cancelable: true }));
        }
    };

    /**
     * Closes/hides the dialog
     * @access public
     * @returns {void}
     */
    pureDialog.close = function() {

        var self = this;
        var allow = this.dispatchEvent(new CustomEvent('pure-dialog-closing', { bubbles: true, cancelable: true }));

        if (allow) {
            this.removeAttribute('open');
            this.removeAttribute('modal');

            var transitionEndEventName = getTransitionEndEventName();

            if (transitionEndEventName !== '') {

                // browser support animation, therefore wait for it to end
                this.addEventListener(transitionEndEventName, function() {
                    self.dispatchEvent(new CustomEvent('pure-dialog-closed', { bubbles: true, cancelable: true }));
                }, false);
            }
            else {
                self.dispatchEvent(new CustomEvent('pure-dialog-closed', { bubbles: true, cancelable: true }));
            }
        }
    };

    /**
     * Injects the dialog into the body (helps avoid stacking issues)
     * @access public
     * @returns {void}
     */
    pureDialog.appendToDOM = function() {

        if (document.body) {

            var allow = this.dispatchEvent(new CustomEvent('pure-dialog-appending', { bubbles: true, cancelable: true }));

            if (allow && !this.parentElement) {
                document.body.appendChild(this);

                // trigger element reflow after insert (we do this to ensure open is seen as a new css change)
                var reflow = this.offsetWidth;
            }
        }
        else {
            throw new Error('document does not contain a body, unable to append.');
        }
    };

    /**
     * Removes the dialog from the DOM
     * @access public
     * @returns {void}
     */
    pureDialog.remove = function() {

        var allow = this.dispatchEvent(new CustomEvent('pure-dialog-removing', { bubbles: true, cancelable: true }));

        if (allow && this.parentElement) {
            this.parentElement.removeChild(this);
        }
    };

    /*-----------------*/
    /* PRIVATE METHODS */
    /*-----------------*/

    /**
     * Render body takes care of creating the core elements and also ensuring the literal html is inserted into a wrapper
     * @access private
     * @returns {void}
     */
    function renderBody() {

        // create container
        this._container = createEl(null, 'div', { class: 'pure-dialog-container' });

        // create a body element wrapper
        this._body = createEl(this._container, 'div', { class: 'pure-dialog-body' });

        // copy all children written literally into the body of the <pure-dialog> HTML tag
        while (this.hasChildNodes()) {
            this._body.appendChild(this.removeChild(this.firstChild));
        }

        // append the new container
        this.appendChild(this._container);
    }

    /**
     * Adds/removes dialog title based on this.title value
     * @access private
     * @returns {void}
     */
    function renderTitle() {

        if (this.title !== '') {

            // either get existing title tag or create a new one
            var el = this.querySelector('.pure-dialog-title') || createEl(null, 'div', { class: 'pure-dialog-title' });

            el.textContent = this.title;

            // if its not in the DOM, append it in the correct location
            if (!el.parentElement) {
                this._container.insertBefore(el, this._body);
            }
        }
        else {
            // remove close button
            removeElementBySelector(this, '.pure-dialog-title');
        }
    }

    /**
     * Adds/removes buttons based on this.buttons value
     * @access private
     * @returns {void}
     */
    function renderButtons() {

        var self = this;

        // convert buttons to array removing empty strings
        var buttons = this.buttons.split(',').filter(Boolean);

        if (buttons.length > 0) {

            // insert button container if it does not already exist
            var buttonContainer = this._container.querySelector('.pure-dialog-buttons') || createEl(this._container, 'div', { 'class': 'pure-dialog-buttons' });

            // ensure it's empty (this could be a re-render)
            buttonContainer.innerHTML = '';

            // insert buttons
            buttons.forEach(function(item) {
                // insert button
                createEl(buttonContainer, 'input', { type: 'button', value: item.trim(), class: 'pure-dialog-button' });
            });

            // listen for button click events
            buttonContainer.onclick = function(e) {

                var el = e.target;

                if (el.tagName === 'INPUT' && el.className.indexOf('pure-dialog-button') > -1) {

                    var proceedToClose = self.dispatchEvent(new CustomEvent('pure-dialog-button-clicked', { detail: el.value, bubbles: true, cancelable: true }));

                    if (proceedToClose) {
                        self.close();
                    }
                }
            };
        }
        else {
            // remove close button
            removeElementBySelector(this, '.pure-dialog-buttons');
        }
    }

    /**
     * Adds/removes the closed button based on this.closeButton value
     * @access private
     * @returns {void}
     */
    function renderCloseButton() {

        var self = this;

        if (this.closeButton) {

            // add close button
            var closeButton = createEl(this._container, 'div', { 'class': 'pure-dialog-close' });

            // add close event
            closeButton.onclick = function(e) {
                e.preventDefault();

                var allow = this.dispatchEvent(new CustomEvent('pure-dialog-close-clicked', { bubbles: true, cancelable: true }));

                if (allow) {
                    self.close();
                }
            };
        }
        else {
            // remove close button
            removeElementBySelector(this, '.pure-dialog-close');
        }
    }


    /*------------------------*/
    /* PRIVATE HELPER METHODS */
    /*------------------------*/

    /**
     * Removes an element from the dom by CSS selector
     * @access private
     * @param {HTMLElement} parent - html element to look within
     * @param {string} selector - CSS selector
     * @returns {void}
     */
    function removeElementBySelector(parent, selector) {

        // remove container
        var el = (parent || document).querySelector(selector);

        if (el) {
            el.parentElement.removeChild(el);
        }
    }

    /**
    * Creates, configures & optionally inserts DOM elements via one function call
    * @access private
    * @param {object} parentEl HTML element to insert into, null if no insert is required
    * @param {string} tagName of the element to create
    * @param {object} attrs key : value collection of element attributes to create (if key is not a string, value is set as expando property)
    * @param {string} text to insert into element once created
    * @param {string} html to insert into element once created
    * @returns {object} newly constructed html element
    */
    function createEl(parentEl, tagName, attrs, text, html) {

        var el = document.createElement(tagName);
        var customEl = tagName.indexOf('-') > 0;

        if (attrs) {

            for (var key in attrs) {
                // assign className
                if (key === 'class') {
                    el.className = attrs[key];
                }
                // assign id
                else if (key === 'id') {
                    el.id = attrs[key];
                }
                // assign name attribute, even for customEl
                else if (key === 'name') {
                    el.setAttribute(key, attrs[key]);
                }
                // assign object properties
                else if (customEl || (key in el)) {
                    el[key] = attrs[key];
                }
                // assign regular attribute
                else {
                    el.setAttribute(key, attrs[key]);
                }
            }
        }

        if (typeof text !== 'undefined') {
            el.appendChild(document.createTextNode(text));
        }

        if (typeof html !== 'undefined') {
            el.innerHTML = '';
            stringToDOM(html, el);
        }

        if (parentEl) {
            parentEl.appendChild(el);
        }

        return el;
    }


    /**
     * Converts string containing HTML into a DOM elements - whilst removing script tags
     * @access private
     * @param {string} src - string containing HTML
     * @param {HTMLElement} [parent] - optional parent to append children into
     * @returns {DocumentFragment} fragment containing newly created elements (less script tags)
     */
    function stringToDOM(src, parent) {

        parent = parent || document.createDocumentFragment();

        var el = null;
        var tmp = document.createElement('div');

        // inject content into none live element
        tmp.innerHTML = src;

        // remove script tags
        var scripts = tmp.getElementsByTagName('script');
        for (var i = scripts.length - 1; i >= 0; i--) {
            scripts[i].parentElement.removeChild(scripts[i]);
        }

        // append elements
        while (el = tmp.firstChild) {
            parent.appendChild(el);
        }

        return parent;
    }

    /**
     * Works out the name for the 'transitionend' for current browser
     * @returns {string} transition end event name
     */
    function getTransitionEndEventName() {

        var el = document.createElement('div');

        var transitions = {
            'transition': 'transitionend',
            'OTransition': 'otransitionend',  // oTransitionEnd in very old Opera
            'MozTransition': 'transitionend',
            'WebkitTransition': 'webkitTransitionEnd'
        };

        for (var i in transitions) {
            if (transitions.hasOwnProperty(i) && el.style[i] !== undefined) {
                return transitions[i];
            }
        }

        return '';
    }

    // patch CustomEvent to allow constructor creation (IE/Chrome) - resolved once initCustomEvent no longer exists
    if ('initCustomEvent' in document.createEvent('CustomEvent')) {

        window.CustomEvent = function(event, params) {

            params = params || { bubbles: false, cancelable: false, detail: undefined };

            var evt = document.createEvent('CustomEvent');
            evt.initCustomEvent(event, params.bubbles, params.cancelable, params.detail);
            return evt;
        };

        window.CustomEvent.prototype = window.Event.prototype;
    }

    if (document.registerElement) {
        // register component with the dom
        document.registerElement('pure-dialog', { prototype: pureDialog });
    }
    else {
        throw new Error('document.registerElement does not exist. Are you missing the polyfill?');
    }

})(HTMLElement.prototype, this, document);
