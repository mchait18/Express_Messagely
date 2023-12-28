const express = require("express");
const router = new express.Router();
const Message = require("../models/message");
const { ensureLoggedIn } = require("../middleware/auth");

/** GET /:id - get detail of message.
 *
 * => {message: {id,
 *               body,
 *               sent_at,
 *               read_at,
 *               from_user: {username, first_name, last_name, phone},
 *               to_user: {username, first_name, last_name, phone}}
 *
 * Make sure that the currently-logged-in users is either the to or from user.
 *
 **/
router.get("/:id", async (req, res, next) => {
    let message = await Message.get(req.params.id);
    if (req.user && (req.user.username === message.from_user.username
        || req.user.username === message.to_user.username))
        return res.json({ message });

    return next({ status: 401, message: "Unauthorized" });
})


/** POST / - post message.
 *
 * {to_username, body} =>
 *   {message: {id, from_username, to_username, body, sent_at}}
 *
 **/
router.post("/",
    ensureLoggedIn,
    async (req, res, next) => {
        const { to_username, body } = req.body;
        const message = await Message.create({
            from_username: req.user.username, to_username, body
        });
        return res.json(message);
    })

/** POST/:id/read - mark message as read:
 *
 *  => {message: {id, read_at}}
 *
 * Make sure that the only the intended recipient can mark as read.
 *
 **/

router.post("/:id/read", async (req, res, next) => {
    const { id } = req.params
    const message = await Message.get(id);
    if (!req.user || req.user.username !== message.to_user.username) {
        return next({ status: 401, message: "Unauthorized" });
    } else {
        const readMessage = await Message.markRead(id)
        return res.json({ message: readMessage })
    }

})
module.exports = router;