const url = require('url');
const { OAuth } = require('oauth');

/**
 * The Urban Rivals API
 * @type {UROAuth}
 * @extends {OAuth}
 */
class UROAuth extends OAuth {
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
      'http://www.urban-rivals.com/api/auth/access_token.php',
      key,
      secret,
      '1.0',
      authorizeCallback,
      algorithm,
    );

    /**
     * query URL
     * @type {String}
     * @private
     */
    this._apiUrl = 'https://www.urban-rivals.com/api/';

    /**
     * Authorization URL
     * @type {String}
     * @private
     */
    this._authorizeUrl = 'https://www.urban-rivals.com/api/auth/authorize.php';

    /**
     * Request token
     * @type {Token}
     */
    this.requestToken = {};

    /**
     * Access token
     * @type {Token}
     */
    this.accessToken = {};
  }

  /**
   * Get request token
   * @return {Promise<Token>}
   */
  getRequestToken() {
    return new Promise((resolve, reject) => {
      this.getOAuthRequestToken((err, token, token_secret) => {
        if (err) {
          reject(err);
        }
        else {

          const tokenObject = {
            token: token,
            secret: token_secret
          };

          this.requestToken = tokenObject;

          resolve(tokenObject);
        }
      });
    });
  }

  /**
   * Get access token from request token
   * @param {Token} [requestToken] Request token
   * @return {Promise<Token>}
   */
  getAccessToken(requestToken = this.requestToken) {
    if (typeof requestToken === 'object' && requestToken.hasOwnProperty('requestToken')) {
      requestToken = requestToken.requestToken;
    }
    return new Promise((resolve, reject) => {
      this.getOAuthAccessToken(requestToken.token, requestToken.secret, (err, accessToken, accessSecret, results) => {

        if(err)
          reject(err);
        else {
          this.accessToken = {
            token: accessToken,
            secret: accessSecret
          };

          resolve(this.token);
        }
      })
    });
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
    const queriesToDo = queries.map(({call, params = {}, contextFilter = [], itemsFilter = []}) => {
      return {
        call,
        params,
        contextFilter,
        itemsFilter,
      };
    });

    const jsonEncodedQuery = JSON.stringify(queriesToDo);
    return new Promise((resolve, reject) => {
      this.post(this._apiUrl, this.accessToken.token, this.accessToken.secret, {
        "request": jsonEncodedQuery,
      }, 'application/x-www-form-urlencoded', (err, response, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(JSON.parse(response));
        }
      });
    });
  }

  /**
   * Do one query
   * @param {String} call Call name
   * @param {Object<String,*>} [params={}] Call params
   * @param {Object} [filters={}] All filters you want on your query result
   * @param {Array<String>} [filters.itemsFilter=[]] Filter on items sent by the server
   * @param {Array<String>} [filters.contextFilter=[]] Filter on context sent by the server
   * @returns {Promise<QueryResult>} The query result
   */
  async query(call, params = {}, { itemsFilter = [], contextFilter = [] }) {
    return (await this.multipleQueries({
      call,
      params,
      itemsFilter,
      contextFilter,
    }))[call];
  }


  /**
   * Get the authorization URL for the player
   * @param [callbackUrl] The callback url for the query
   * @returns {string} The authorize URL
   */
  getAuthorizeUrl(callbackUrl = '') {
    const authorizeUrl = url.parse(this._authorizeUrl);
    authorizeUrl.query = {
      'oauth_token': this.requestToken.token,
    };
    if (callbackUrl) {
      authorizeUrl.query['oauth_callback'] = callbackUrl;
    }

    return url.format(authorizeUrl);
  }
}

module.exports = UROAuth;
