process.env.NODE_ENV = "test";

const request = require("supertest");

const app = require("../app");
const db = require("../db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { SECRET_KEY } = require("../config");
const User = require("../models/user");
const Message = require("../models/message");

// use small value here so tests are fast
const BCRYPT_WORK_FACTOR = 1;

let testUserToken;
let msg1Id;
let msg2Id;

beforeEach(async function () {
    await db.query("DELETE FROM messages");
    await db.query("DELETE FROM users");

    let u1 = await User.register({
        username: "bob",
        password: "secret",
        first_name: "Bob",
        last_name: "Smith",
        phone: "+14150000000"
    });
    let u12 = await User.register({
        username: "test",
        password: "password",
        first_name: "Test1",
        last_name: "Testy",
        phone: "+14150000000"
    });

    let m1 = await Message.create({
        from_username: "bob",
        to_username: "test",
        body: "Hi test, this is Bob."
    })
    msg1Id = m1.id

    let m2 = await Message.create({
        from_username: "test",
        to_username: "bob",
        body: "Hi Bob, this is Test."
    })
    msg2Id = m2.id
    // we'll need tokens for future requests
    const testUser = { username: "bob" };
    testUserToken = jwt.sign(testUser, SECRET_KEY);
});
// end

describe("GET /messages/:id", function () {
    test("Get message detail", async function () {
        let response = await request(app).get(`/messages/${msg1Id}`)
            .send({ _token: testUserToken })
        expect(response.statusCode).toBe(200)
        expect(response.body).toEqual({
            message: {
                id: msg1Id,
                body: "Hi test, this is Bob.",
                sent_at: expect.any(String),
                read_at: null,
                from_user: {
                    username: "bob",
                    first_name: "Bob",
                    last_name: "Smith",
                    phone: "+14150000000"
                },
                to_user: {
                    username: "test",
                    first_name: "Test1",
                    last_name: "Testy",
                    phone: "+14150000000"
                }
            }
        })
    })

    test("unauthorized get message", async function () {
        let response = await request(app).get(`/messages/${msg1Id}`)
        expect(response.statusCode).toBe(401)
    });
});

describe("POST /messages", function () {
    test("Post message ", async function () {
        let response = await request(app).post(`/messages/`)
            .send({
                to_username: "test",
                body: "Hi Test",
                _token: testUserToken
            })
        expect(response.statusCode).toBe(200)
        expect(response.body).toEqual({
            message: {
                id: expect.any(Number),
                from_username: "bob",
                to_username: "test",
                body: "Hi Test",
                sent_at: expect.any(String),
            }
        })
    })

    test("unauthorized post message", async function () {
        let response = await request(app).post(`/messages/`)
        expect(response.statusCode).toBe(401)
    });
});

describe("POST /messages/:id/read", function () {
    test("Mark message as read ", async function () {
        let response = await request(app).post(`/messages/${msg2Id}/read`)
            .send({ _token: testUserToken })
        expect(response.statusCode).toBe(200)
        expect(response.body).toEqual({
            message: {
                id: msg2Id,
                read_at: expect.any(String)
            }
        })
    })

    test("unauthorized post message", async function () {
        let response = await request(app).post(`/messages/${msg1Id}/read`)
        expect(response.statusCode).toBe(401)
    });
});


afterAll(async function () {
    // close db connection
    await db.end();
});
