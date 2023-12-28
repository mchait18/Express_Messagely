const express = require("express");
const router = new express.Router();
const ExpressError = require("../expressError");
const User = require("../models/user")
const Message = require("../models/message")
const { SECRET_KEY } = require("../config");
const jwt = require("jsonwebtoken");

/** POST /login - login: {username, password} => {token}
 *
 * Make sure to update their last-login!
 *
 **/
router.post('/login', async (req, res, next) => {
    try {
        const { username, password } = req.body;
        if (!username || !password)
            throw new ExpressError("Username and Password required", 400)
        if (await User.authenticate(username, password)) {
            await User.updateLoginTimestamp(username)
            const token = jwt.sign({ username }, SECRET_KEY)
            req.body._token = token
            return res.json({ token })
        }
        throw new ExpressError("Invalid username/password", 400)
    } catch (e) {
        return next(e)
    }
})


/** POST /register - register user: registers, logs in, and returns token.
 *
 * {username, password, first_name, last_name, phone} => {token}.
 *
 *  Make sure to update their last-login!
 */
router.post('/register', async (req, res, next) => {
    try {
        const { username, password, first_name, last_name, phone } = req.body;
        if (!username || !password || !first_name || !last_name || !phone)
            throw new ExpressError("Username, password, first name, last name and phone required", 400)
        await User.register({ username, password, first_name, last_name, phone })
        await User.updateLoginTimestamp(username)
        const token = jwt.sign({ username }, SECRET_KEY)
        req.body._token = token
        return res.json({ token })
    } catch (e) {
        if (e.code === "23505")
            return next(new ExpressError("Username taken. Please pick another!", 400))
        return next(e)
    }
})
module.exports = router;