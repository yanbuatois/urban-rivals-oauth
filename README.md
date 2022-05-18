# Urban Rivals OAuth
This module simplifies the connection to the Urban Rivals API, by overriding [OAuth NPM module](https://www.npmjs.com/package/oauth) class.
It provides numerous methods to help the connection to the Urban Rivals API.

## Getting started
First, login on Urban Rivals, and go on https://www.urban-rivals.com/api/developer/ to get an API key.
Once the key is enabled, keep the key and the secret.

Install the module on your project
```shell script
npm install --save urban-rivals-oauth
```

Then import the main class

```js
import UROAuth from 'urban-rivals-oauth'
```

You can now create an instance with your API Key and your API Secret

```js
const urApi = new UROAuth({
  key: 'your_api_key',
  secret: 'your_api_secret',
  algorithm: 'HMAC-SHA1', // The algorithm is HMAC-SHA1 by default, but you can override it.
  authorizeCallback: null, // Optional callback called when the token is authorized by base oauth module.
})
```

Next, you can get the request token with the `getRequestToken()` method, who defines the request token in the object.

```js
urApi.getRequestToken().then(() => {
  // Do stuff.
}).catch((err) => {
  // An error occurred when fetching the request token, you should handle it.
})
```

With `async/await`, you can directly use the result with it, since it's a Promise :
```js
try {
  await urApi.getRequestToken()
  // Do stuff.
} catch (err) {
  // An error occurred when fetching the request token, you should handle it.
}
```

But you cannot do API request with this token. You need to authorize this token, in order to have an access token.
Since it needs an approval from the player, you need to open browser page to get a verifier, which will be required.
When the user approves the application, he will be redirected to the callback URL specified in param, with the verifier
in the `oauth_token` query param (for example, if the callback URL is `http://localhost/`, the full URL on which the player will be redirected will be `http://localhost/?oauth_token=verifier`).

A method is implemented in the class, which gives the authorize URL.
```js
const url = urApi.getAuthorizeUrl('https://myauthorizepage.tld/')
```

When you have authorized the token, you can get the access token, which allows to do API queries.
To authorize this token, you can simply call the `getAccessToken` method.

```js
urApi.getAccessToken().then(() => {
  // Do stuff
}).catch((err) => {
  // An error occurred while authorizing token. You should handle it.
});
```

If everything went well, you can now do query on the UR API.

```js
// Simple query, to get all the levels of a character.
urApi.query('character.getCharacterLevels', {
  characterID: 223,
}).then(({ items, context }) => {
  // Do stuff with result, which contains items and context, for this call.
}).catch((err) => {
  // Something went wrong during call
})

// Multiple queries. We get all clans and all characters.
urApi.multipleQueries({
  call: 'urc.getCharacters',
}, {
  call: 'urc.getClans',
}).then((result) => {
  const characters = result['urc.getCharacters'].items
  const clans = result['urc.getClans'].items
  // Responses for each queries are stored in an Object, indexed by the call name.
}).catch((err) => {
  // Something went wrong during a call
})
```

Or, more simply, with `async/await` :

```js
try {
  const {items, context} = await urApi.query('characters.getCharacterLevels', {
    characterID: 223,
  })
} catch (err) {
  // An error occurred
}

try {
  const result = await urApi.multipleQueries({
    call: 'urc.getCharacters',
  }, {
    call: 'urc.getClans',
  })

  const characters = result['urc.getCharacters'].items
  const clans = result['urc.getClans'].items
} catch (err) {
  // An error occurred
}
```

Note the query and multipleQueries methods take a parameter allowing to filter context and items element sent by the server directly server-side. It's useful to lighten the payload sent by the server and improve the performances of your app.

## Call API with js-style

You can use the `proxyClient` object to call API more simply if your environment supports javascript proxies.

```js
try {
  const urApiProxyClient = urApi.proxyClient
  const { items, context } = await urApiProxyClient.characters.getCharacterLevels({
    characterID: 223,
  })
} catch (err) {
  console.error(err)
}
```

Then you can do any call you are authorized to do. You can see the complete list on the UR API documentation (https://www.urban-rivals.com/api/developer/).

You can find the complete module reference on the JSDoc available here: https://yanbuatois.github.io/urban-rivals-oauth/index.html

If you have any problem or suggestion with this module, don't hesitate to submit issue or do pull requests.
