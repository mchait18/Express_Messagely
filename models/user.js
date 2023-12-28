const bcrypt = require("bcrypt");
const { BCRYPT_WORK_FACTOR, SECRET_KEY } = require("../config");
const db = require("../db");
/** User class for message.ly */



/** User of the site. */

class User {

  /** register new user -- returns
   *    {username, password, first_name, last_name, phone}
   */

  static async register({ username, password, first_name, last_name, phone }) {
    const hashedPassword = await bcrypt.hash(password, BCRYPT_WORK_FACTOR)
    const results = await db.query(`INSERT INTO users 
    (username, password, first_name, last_name, phone)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING username, password, first_name, last_name, phone`,
      [username, hashedPassword, first_name, last_name, phone])
    return results.rows[0]
  }

  /** Authenticate: is this username/password valid? Returns boolean. */

  static async authenticate(username, password) {
    const results = await db.query(`SELECT username, password
      FROM users
      WHERE username = $1`, [username])
    const user = results.rows[0]
    if (user) return await bcrypt.compare(password, user.password)
    return false
  }

  /** Update last_login_at for user */

  static async updateLoginTimestamp(username) {
    const res = await db.query(`UPDATE users 
      SET last_login_at=$1
      WHERE username = $2 RETURNING username, last_login_at`,
      [new Date(), username])
  }

  /** All: basic info on all users:
   * [{username, first_name, last_name, phone}, ...] */

  static async all() {
    const results = await db.query(`SELECT username, first_name, 
    last_name, phone FROM users`)
    return results.rows
  }

  /** Get: get user by username
   *
   * returns {username,
   *          first_name,
   *          last_name,
   *          phone,
   *          join_at,
   *          last_login_at } */

  static async get(username) {
    const result = await db.query(
      `SELECT username,
              first_name,
              last_name,
              phone,
              join_at,
              last_login_at
      FROM users WHERE username = $1`, [username])
    if (result.rows.length === 0) {
      throw new Error(`No such user: ${username}`);
    }
    return result.rows[0];
  }

  /** Return messages from this user.
   *
   * [{id, to_user, body, sent_at, read_at}]
   *
   * where to_user is
   *   {username, first_name, last_name, phone}
   */

  static async messagesFrom(username) {
    const result = await db.query(
      `SELECT m.id, m.to_username, m.body, m.sent_at, m.read_at,
      u.username, u.first_name, u.last_name, u.phone
      FROM messages AS m JOIN users AS u
      ON u.username = m.to_username  WHERE m.from_username = $1`,
      [username])

    const data = result.rows
    const messages = data.map(d => ({
      id: d.id,
      body: d.body,
      sent_at: d.sent_at,
      read_at: d.read_at,
      to_user: {
        username: d.to_username,
        first_name: d.first_name,
        last_name: d.last_name,
        phone: d.phone
      }
    }))
    return messages
  }

  /** Return messages to this user.
   *
   * [{id, from_user, body, sent_at, read_at}]
   *
   * where from_user is
   *   {username, first_name, last_name, phone}
   */

  static async messagesTo(username) {
    const result = await db.query(
      `SELECT m.id, m.from_username, m.body, m.sent_at, m.read_at,
      u.username, u.first_name, u.last_name, u.phone
      FROM messages AS m JOIN users AS u
      ON u.username = m.from_username  WHERE m.to_username = $1`,
      [username])
    const data = result.rows
    const messages = data.map(d => ({
      id: d.id,
      body: d.body,
      sent_at: d.sent_at,
      read_at: d.read_at,
      from_user: {
        username: d.from_username,
        first_name: d.first_name,
        last_name: d.last_name,
        phone: d.phone
      }
    }))
    return messages
  }
}

module.exports = User;