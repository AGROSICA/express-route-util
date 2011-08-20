# The *Express Routing Utility*
is a helper module for Express to provide a Django-inspired controller
hierarchy (separated from the view hierarchy and URL hierarchy), and a
URL generation method to be used by the controllers. The controllers are
defined to use a directory hierarchy like so:

    controllers/
      controllers.js
      social/
        controllers.js
        helper_lib.js

The URL hierarchy is defined by the user in a simple JSON tree such as:

```js
    {
        '/': 'index',
        'get,post/login': 'login',
        'post/logout': ['common.requireLogin', 'logout'],
        '/social' : {
            '/': 'social.index',
            '/profile': {
                '/:username': 'social.viewProfile',
                'get,post/edit': ['common.requireLogin', 'social.editProfile']
            }
        }
    }
```

URLs are assembled relative to their location in the tree, so the
``social.editProfile`` controller would have a URL of ``/social/profile/edit/``

## Usage:

```js
    var router = require("express-route-util");
    
    router.setDefaultMethod("get");
    router.registerRoutes(app, urlJSON, "/path/to/controllers/");
    var href = router.getControllerUrl("social.viewProfile", {
        username: "dellis"
    });
```

Where ``app`` is the Express application object, ``urlJSON`` is the JSON
object relating paths to controllers, and ``"/path/to/controllers/"`` is
the location of the controllers for the project (can be a relative URL).

## Installation:

Using [NPM](http://www.npmjs.org), type:

```sh
    npm install express-route-utility
```

## License (MIT):

Copyright (C) 2011 by Agrosica, Inc.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
