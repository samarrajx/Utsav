/**
 * mock-dom.js - Lightweight DOM polyfill for node --test
 *
 * Provides minimal Document, Element, and DOMParser implementations
 * for unit testing view rendering functions in pure Node.js.
 */

export class MockNode {}

export class MockClassList {
  constructor(element) {
    this.element = element;
    this._classes = new Set();
  }

  add(...tokens) {
    tokens.forEach((t) => this._classes.add(t));
    this.element.attributes.set("class", Array.from(this._classes).join(" "));
  }

  remove(...tokens) {
    tokens.forEach((t) => this._classes.delete(t));
    this.element.attributes.set("class", Array.from(this._classes).join(" "));
  }

  contains(token) {
    return this._classes.has(token);
  }
}

export class MockElement extends MockNode {
  constructor(tagName) {
    super();
    this.tagName = tagName.toUpperCase();
    this.attributes = new Map();
    this.childNodes = [];
    this.style = {};
    this.dataset = {};
    this.classList = new MockClassList(this);
    this.listeners = new Map();
    this._value = "";
    this._checked = false;
  }

  get children() {
    return this.childNodes.filter((n) => n instanceof MockElement);
  }

  get firstChild() {
    return this.childNodes[0] || null;
  }

  get textContent() {
    return this.childNodes
      .map((c) => (c instanceof MockElement ? c.textContent : (c?.textContent ?? String(c))))
      .join("");
  }

  set textContent(val) {
    this.childNodes = [new MockTextNode(String(val))];
  }

  get value() {
    return this._value;
  }

  set value(val) {
    this._value = String(val);
  }

  get checked() {
    return this._checked;
  }

  set checked(val) {
    this._checked = !!val;
  }

  get className() {
    return this.attributes.get("class") || "";
  }

  set className(val) {
    this.attributes.set("class", String(val));
    this.classList._classes = new Set(String(val).split(/\s+/).filter(Boolean));
  }

  setAttribute(key, val) {
    this.attributes.set(key, String(val));
    if (key === "class") {
      this.classList._classes = new Set(String(val).split(/\s+/).filter(Boolean));
    }
    if (key === "value") {
      this._value = String(val);
    }
  }

  getAttribute(key) {
    return this.attributes.get(key) || null;
  }

  removeAttribute(key) {
    this.attributes.delete(key);
  }

  appendChild(child) {
    this.childNodes.push(child);
    return child;
  }

  removeChild(child) {
    const idx = this.childNodes.indexOf(child);
    if (idx >= 0) {
      this.childNodes.splice(idx, 1);
    }
    return child;
  }

  replaceChildren(...children) {
    this.childNodes = [];
    children.forEach((c) => {
      if (c) this.appendChild(c);
    });
  }

  append(...children) {
    children.forEach((c) => {
      if (c) this.appendChild(c);
    });
  }

  addEventListener(event, handler) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(handler);
  }

  dispatchEvent(event) {
    const handlers = this.listeners.get(event.type) || [];
    handlers.forEach((h) => h(event));
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] || null;
  }

  querySelectorAll(selector) {
    const matches = [];

    const walk = (node) => {
      if (node instanceof MockElement) {
        if (matchesSelector(node, selector)) {
          matches.push(node);
        }
        node.children.forEach(walk);
      }
    };

    this.children.forEach(walk);
    return matches;
  }
}

export class MockTextNode extends MockNode {
  constructor(text) {
    super();
    this.nodeValue = String(text);
  }

  get textContent() {
    return this.nodeValue;
  }

  toString() {
    return this.nodeValue;
  }
}

function matchesSelector(element, selector) {
  const parts = selector.trim().split(/\s+/);
  const target = parts[parts.length - 1]; // Support simple or descendent selectors

  if (target.startsWith("#")) {
    return element.getAttribute("id") === target.slice(1);
  }
  if (target.startsWith(".")) {
    const classNames = target.split(".").filter(Boolean);
    return classNames.every((cls) => element.classList.contains(cls));
  }
  if (target.includes("=")) {
    const [attr, val] = target.replace(/[[\]"]/g, "").split("=");
    return element.getAttribute(attr) === val;
  }
  return element.tagName.toLowerCase() === target.toLowerCase();
}

export class MockDOMParser {
  parseFromString(xmlString, _mimeType) {
    const svgElem = new MockElement("svg");
    return {
      querySelector: () => svgElem
    };
  }
}

export function setupMockDOM() {
  const originalDocument = globalThis.document;
  const originalDOMParser = globalThis.DOMParser;
  const originalNode = globalThis.Node;

  globalThis.Node = MockNode;
  globalThis.MockElement = MockElement;
  globalThis.MockTextNode = MockTextNode;

  globalThis.document = {
    createElement(tag) {
      return new MockElement(tag);
    },
    createElementNS(_ns, tag) {
      return new MockElement(tag);
    },
    createTextNode(text) {
      return new MockTextNode(text);
    },
    importNode(node) {
      return node;
    },
    getElementById(_id) {
      return null;
    }
  };

  globalThis.DOMParser = MockDOMParser;

  return () => {
    globalThis.document = originalDocument;
    globalThis.DOMParser = originalDOMParser;
    globalThis.Node = originalNode;
    delete globalThis.MockElement;
    delete globalThis.MockTextNode;
  };
}
