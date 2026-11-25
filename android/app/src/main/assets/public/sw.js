/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-afac4cd2'], (function (workbox) { 'use strict';

  self.skipWaiting();
  workbox.clientsClaim();
  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "pwa-maskable-512x512.png",
    "revision": "e6b8625c9ddf57d71428c08d137de0d6"
  }, {
    "url": "pwa-512x512.png",
    "revision": "e7925b7382bd7cdbb21e2ab3022834f6"
  }, {
    "url": "pwa-192x192.png",
    "revision": "bc328baec45ad1053f45c42684e38392"
  }, {
    "url": "magbot.html",
    "revision": "988fd15416856a8fe4d3e1475d62b361"
  }, {
    "url": "index.html",
    "revision": "82f49bb65bf5f51788fccdb594f229e1"
  }, {
    "url": "icon.svg",
    "revision": "528d05d0d59485d55bdd80fc841d2eb2"
  }, {
    "url": "icon-maskable.svg",
    "revision": "bfb36166a2b9961a114a4f81e46f8130"
  }, {
    "url": "apple-touch-icon.png",
    "revision": "104dee17c41a49969b179e1355ef9b93"
  }, {
    "url": "assets/worldScene-DquV0v_U.js",
    "revision": null
  }, {
    "url": "assets/workbox-window.prod.es5-Bd17z0YL.js",
    "revision": null
  }, {
    "url": "assets/three-BmicrjSf.js",
    "revision": null
  }, {
    "url": "assets/rolldown-runtime-WkwZ5CU-.js",
    "revision": null
  }, {
    "url": "assets/react-CZpv5F5o.js",
    "revision": null
  }, {
    "url": "assets/lucide-CHQPXrlW.js",
    "revision": null
  }, {
    "url": "assets/index-IPpo_vJS.js",
    "revision": null
  }, {
    "url": "assets/index-CGpNqPLF.css",
    "revision": null
  }, {
    "url": "assets/TrophyShelfModal-CXRMKlEC.js",
    "revision": null
  }, {
    "url": "assets/SandboxCreatorModal-DwcDE1en.js",
    "revision": null
  }, {
    "url": "assets/ParentDashboardModal-Qs3IjR-u.js",
    "revision": null
  }, {
    "url": "assets/GameRoomModal-DLwDz6DX.js",
    "revision": null
  }, {
    "url": "assets/ClassroomCodeModal-C9apUW4v.js",
    "revision": null
  }, {
    "url": "assets/aistudio/image_fe5fe67a.png",
    "revision": null
  }, {
    "url": "assets/aistudio/image_c344c9a5.png",
    "revision": null
  }, {
    "url": "assets/aistudio/image_c2567250.png",
    "revision": null
  }, {
    "url": "assets/aistudio/image_abb9114d.png",
    "revision": null
  }, {
    "url": "assets/aistudio/image_94069a90.png",
    "revision": null
  }, {
    "url": "assets/aistudio/image_7fdf8a7b.png",
    "revision": null
  }, {
    "url": "assets/aistudio/image_72948eb9.png",
    "revision": null
  }, {
    "url": "assets/aistudio/image_542ffeb1.png",
    "revision": null
  }, {
    "url": "assets/aistudio/image_20e53d96.png",
    "revision": null
  }, {
    "url": "assets/aistudio/IMG_2224_ae50c268.jpeg",
    "revision": null
  }, {
    "url": "apple-touch-icon.png",
    "revision": "104dee17c41a49969b179e1355ef9b93"
  }, {
    "url": "icon-maskable.svg",
    "revision": "bfb36166a2b9961a114a4f81e46f8130"
  }, {
    "url": "icon.svg",
    "revision": "528d05d0d59485d55bdd80fc841d2eb2"
  }, {
    "url": "pwa-192x192.png",
    "revision": "bc328baec45ad1053f45c42684e38392"
  }, {
    "url": "pwa-512x512.png",
    "revision": "e7925b7382bd7cdbb21e2ab3022834f6"
  }, {
    "url": "pwa-maskable-512x512.png",
    "revision": "e6b8625c9ddf57d71428c08d137de0d6"
  }, {
    "url": "manifest.webmanifest",
    "revision": "1e9ebd5d30fd384a19ff3632a4d9b064"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("index.html")));
  workbox.registerRoute(/^https:\/\/fonts\.googleapis\.com\/.*/i, new workbox.CacheFirst({
    "cacheName": "google-fonts-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 10,
      maxAgeSeconds: 31536000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');
  workbox.registerRoute(/^https:\/\/fonts\.gstatic\.com\/.*/i, new workbox.CacheFirst({
    "cacheName": "gstatic-fonts-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 10,
      maxAgeSeconds: 31536000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');

}));
