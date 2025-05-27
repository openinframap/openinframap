# Web Frontend

The web frontend for Open Infrastructure Map, written in Typescript and built with Vite.

Develop using:

```bash
    npm install
    npm start
```

This should load a development website instance at [http://localhost:5173](http://localhost:5173).

By default, this will use the production backend services from openinframap.org, so it's easier to
get started.

## Testing

Code style is checked using [Prettier](https://prettier.io/) and [ESLint](https://eslint.org/). To
run the linting checks, use `npm run lint`.

There is currently a minimal test suite using [Vitest](https://vitest.dev/) which is run using
`npm test`. This requires the development server to be running.

## Translation

Translation is handled using [i18next](https://www.i18next.com/). If you add a translation string,
you also need to add it to the [locales/en/translation.json](./locales/en/translation.json) file in
order for it to be picked up by Weblate.
