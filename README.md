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

The utility only imports the export objects of the ``controllers.js``
files, so other code not to be used as a controller can reside within
separate library files for even better source organization.

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

The basic syntax for the keys is ``[HTTP methods]/url/path/:variable``, where
``[HTTP methods]`` is an optional, case-insenstive comma-separated list of
HTTP methods, and the rest of the key is a standard Express URL.

The value for a key can be a string indicating the particular controller to use,
an array of strings indicating the controllers to use and the order to use them,
or an object, following these same patterns, allowing a sub-sectioning of URLs.

When a key is holding an object, any HTTP methods you indicate are ignored, and
the given URL is prepended to the URLs of all keys within the object, so the
``social.editProfile`` controller would have a URL of ``/social/profile/edit/``
and the URL will function for both GET and POST requests.

## Usage and Recommendations

```js
var router = require("express-route-util");

router.setDefaultMethod("get");
router.registerRoutes(app, urlJSON, "/path/to/controllers/");
var href = router.getControllerUrl("social.viewProfile", { username: "dellis" });
```

Where ``app`` is the Express application object, ``urlJSON`` is the JSON
object relating paths to controllers, and ``"/path/to/controllers/"`` is
the location of the controllers for the project (can be a relative URL).

A "good" set of defaults for registerRoutes is:

```js
router.registerRoutes(app, JSON.parse(fs.readFileSync("./paths.json")), "./controllers");
```

This way, you have an overall hierarchy similar to:

    app/
        controllers/
            controllers.js
            ...
        public/
            ...
        views/
            ...
        app.js
        paths.json

And you'll probably want to attach the ``router`` to the ``global`` object,
as the ``getControllerUrl`` is most useful to the controllers to generate
the URLs to pass to the views.

## Installation

Using [NPM](http://www.npmjs.org), type:

```sh
    npm install express-route-util
```

## License (MIT)

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
