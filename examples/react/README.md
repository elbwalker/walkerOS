# walker.js react example

Here is an example of a possible walker.js setup with React.

## Trigger page views

This example uses version 6 of react-router-dom with useLocation.
Update your Routes file with a `useEffect` on the location (./src/app.js here).

```js
const location = useLocation();
React.useEffect(() => {
  walker('walker run');
}, [location]);
```

The `walker run` command reinitializes the state but keeps all walker configurations. It's just like a new page view.

> Note when using `React.StrictMode` the initial walker run is called twice due to mounting, unmounting & remounting again. But only in dev mode.

## Events

There are the three entities `page`, `app` & `pricing` to understand their usage.
While a page can be viewed and read the app builds the main conversion goals on this page and appear on multiple sites. The pricing actions are great for a targeted remarketing, since a freelancer requires another messaging than an enterprise visitor.

We use a light [atomic design](https://bradfrost.com/blog/post/atomic-web-design/) approach to demonstrate how to setup actions automatically using appropriate atoms.

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).
