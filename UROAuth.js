import { URL } from 'url'
import { OAuth } from 'oauth'

/**
 * Token info
 * @typedef {Object} Token Token info
 * @property {string} token Token public
 * @property {string} secret Token secret
 */

/**
 * Query result
 * @typedef {Object} QueryResult Query result
 * @property {Object<String,*>} context reply context
 * @property {Object<String,*>} [items] reply items
 */

/**
 * This object allows to call API with javascript functions instead of passing call name as string.
 * For example, instead of doing `urOAuth.query('collections.getCollectionPage', { deckOnly: true })`, you can do `urOAuth.proxyClient.collections.getCollectionPage({ deckOnly: true })`
 * The parameters are the same as query parameters following the call name since the function uses proxies and bind.
 * The function still returns a promise. Please note as well that since proxies are used, you need to have an environment
 * which supports it. For node.js, you need node.js 6+. If you use it with a previous version, even with babel, it will likely fail.
 * @typedef {Object} UROAuthProxyClient Object allowing to directly call the API
 * @property {ApiCaller} characters Characters API
 * @property {ApiCaller} collections Collections API
 * @property {ApiCaller} forums Forums API
 * @property {ApiCaller} general General API
 * @property {ApiCaller} guilds Guilds API
 * @property {ApiCaller} market Market API
 * @property {ApiCaller} missions Missions API
 * @property {ApiCaller} players Players API
 */

/**
 * Object from proxyClient which allows direct API calls
 * @typedef {Object<string, ApiCallerFunction>} ApiCaller Object from proxyClient which allows direct API calls
 */

/**
 * @typedef {Function} ApiCallerFunction
 * @param {Object<String,*>} [params={}] Call params
 * @param {APIFilter} [filters={}] All filters you want on your query result
 * @param {Array<String>} [filters.itemsFilter=[]] Filter on items sent by the server
 * @param {Array<String>} [filters.contextFilter=[]] Filter on context sent by the server
 * @returns {Promise<QueryResult>} The query result
 */

/**
 * API Filters
 * @typedef {Object} APIFilter API Filters
 * @property {Array<String>} itemsFilter Filter on items sent by the server
 * @property {Array<String>} contextFilter Filter on context sent by the server
 */

/**
 * The Urban Rivals API
 * @type {UROAuth}
 * @extends {OAuth}
 */
class UROAuth extends OAuth {
  /**
   * query URL
   * @type {String}
   * @readonly
   */
  static API_URL = 'https://www.urban-rivals.com/api'

  /**
   * Authorization URL
   * @type {String}
   * @readonly
   */
  static AUTHORIZE_URL = `${this.API_URL}/auth/authorize.php`

  /**
   *
   * @param {Object} options API options
   * @param {String} options.key Application key
   * @param {String} options.secret Application secret
   * @param {String} [options.algorithm='HMAC-SHA1'] Signing method
   * @param {Function} [options.authorizeCallback=null] Callback called when authorized
   */
  constructor({
    key,
    secret,
    algorithm = 'HMAC-SHA1',
    authorizeCallback = null,
  }) {
    super(
      'https://www.urban-rivals.com/api/auth/request_token.php',
      'https://www.urban-rivals.com/api/auth/access_token.php',
      key,
      secret,
      '1.0',
      authorizeCallback,
      algorithm,
    )

    /**
     * Request token
     * @type {Token}
     */
    this.requestToken = {}

    /**
     * Access token
     * @type {Token}
     */
    this.accessToken = {}
  }

  /**
   * Get request token
   * @return {Promise<Token>}
   */
  getRequestToken() {
    return new Promise((resolve, reject) => {
      this.getOAuthRequestToken((err, token, token_secret) => {
        if (err) {
          reject(err)
        }
        else {

          const tokenObject = {
            token: token,
            secret: token_secret,
          }

          this.requestToken = tokenObject

          resolve(tokenObject)
        }
      })
    })
  }

  /**
   * Get access token from request token
   * @param {Token} [requestToken] Request token
   * @return {Promise<Token>}
   */
  getAccessToken(requestToken = this.requestToken) {
    if (typeof requestToken === 'object' && requestToken.hasOwnProperty('requestToken')) {
      requestToken = requestToken.requestToken
    }
    return new Promise((resolve, reject) => {
      this.getOAuthAccessToken(requestToken.token, requestToken.secret, (err, accessToken, accessSecret, results) => {

        if(err)
          reject(err)
        else {
          this.accessToken = {
            token: accessToken,
            secret: accessSecret,
          }

          resolve(this.token)
        }
      })
    })
  }

  /**
   * Do one or more queries on the UR API
   * @param {Object} queries All queries to do
   * @param {String} queries.call Call name
   * @param {Object} [queries.params={}] params of the query
   * @param {Array} [queries.contextFilter=[]] filter on the received context attributes
   * @param {Array} [queries.itemsFilter=[]] filter on the received items attributes
   * @returns {Promise<Object<String,QueryResult>>} The queries results, indexed by the call name
   */
  multipleQueries(...queries) {
    const queriesToDo = queries.map(({call, params = {}, contextFilter = [], itemsFilter = []}) => ({
      call,
      params,
      contextFilter,
      itemsFilter,
    }))

    const jsonEncodedQuery = JSON.stringify(queriesToDo);
    return new Promise((resolve, reject) => {
      this.post(this.constructor.API_URL, this.accessToken.token, this.accessToken.secret, {
        request: jsonEncodedQuery,
      }, 'application/x-www-form-urlencoded', (err, response, result) => {
        if (err) {
          reject(err)
        } else {
          resolve(JSON.parse(response))
        }
      })
    })
  }

  /**
   * Do one query
   * @param {String} call Call name
   * @param {Object<String,*>} [params={}] Call params
   * @param {APIFilter} [filters={}] All filters you want on your query result
   * @param {Array<String>} [filters.itemsFilter=[]] Filter on items sent by the server
   * @param {Array<String>} [filters.contextFilter=[]] Filter on context sent by the server
   * @returns {Promise<QueryResult>} The query result
   */
  async query(call, params = {}, { itemsFilter = [], contextFilter = [] } = {}) {
    return (await this.multipleQueries({
      call,
      params,
      itemsFilter,
      contextFilter,
    }))[call]
  }


  /**
   * Get the authorization URL for the player
   * @param [callbackUrl] The callback url for the query
   * @returns {string} The authorize URL
   */
  getAuthorizeUrl(callbackUrl = '') {
    const authorizeUrl = new URL(this.constructor.AUTHORIZE_URL)
    authorizeUrl.searchParams.set('oauth_token', this.requestToken.token)
    if (callbackUrl) {
      authorizeUrl.searchParams.set('oauth_callback', callbackUrl)
    }

    return authorizeUrl.toString()
  }

  /**
   * Creates a proxy client to call API with syntaxic sugar
   * @returns {UROAuthProxyClient} The UROAuth proxy client
   */
  get proxyClient() {
    return new Proxy({}, {
      get: (target, callGroup) =>
        new Proxy({}, {
          get: (target, callName) => this.query.bind(this, `${callGroup}.${callName}`),
          set: () => false,
          deleteProperty: () => false,
          ownKeys: () => [],
          has: () => true,
          defineProperty: () => false,
        }),
      set: () => false,
      deleteProperty: () => false,
      ownKeys: () => [],
      has: () => true,
      defineProperty: () => false,
    })
  }
}

export default UROAuth
