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

describe("GET /users", function () {
    test("Get all users", async function () {
        let response = await request(app).get("/users")
            .send({ _token: testUserToken })
        expect(response.statusCode).toBe(200)
        expect(response.body).toEqual({
            users: [{
                username: "bob",
                first_name: "Bob",
                last_name: "Smith",
                phone: "+14150000000"
            },
            {
                username: "test",
                first_name: "Test1",
                last_name: "Testy",
                phone: "+14150000000"
            }]
        })
    });
    test("unauthorized get all users", async function () {
        let response = await request(app).get("/users")
        expect(response.statusCode).toBe(401)
    });
});

describe("GET /users/:username", function () {
    test("Get user", async function () {
        let response = await request(app).get(`/users/bob`)
            .send({ _token: testUserToken })
        expect(response.statusCode).toBe(200)
        expect(response.body).toEqual({
            user: [{
                username: "bob",
                first_name: "Bob",
                last_name: "Smith",
                phone: "+14150000000",
                join_at: expect.any(String),
                last_login_at: expect.any(String)
            }]
        })
    });
    test("unauthorized get user", async function () {
        let response = await request(app).get("/users/bob")
        expect(response.statusCode).toBe(401)
    });
});

describe("GET /users/:username/to", function () {
    test("Get messages to user", async function () {
        let response = await request(app).get(`/users/bob/to`)
            .send({ _token: testUserToken })
        expect(response.statusCode).toBe(200)
        expect(response.body).toEqual({
            messages: [{
                id: msg2Id,
                body: "Hi Bob, this is Test.",
                sent_at: expect.any(String),
                read_at: null,
                from_user: {
                    username: "test",
                    first_name: "Test1",
                    last_name: "Testy",
                    phone: "+14150000000"
                }
            }]
        })
    });
    test("unauthorized get messages to user", async function () {
        let response = await request(app).get("/users/bob/to")
        expect(response.statusCode).toBe(401)
    });
});
describe("GET /users/:username/from", function () {
    test("Get messages from user", async function () {
        let response = await request(app).get(`/users/bob/from`)
            .send({ _token: testUserToken })
        expect(response.statusCode).toBe(200)
        expect(response.body).toEqual({
            messages: [{
                id: msg1Id,
                body: "Hi test, this is Bob.",
                sent_at: expect.any(String),
                read_at: null,
                to_user: {
                    username: "test",
                    first_name: "Test1",
                    last_name: "Testy",
                    phone: "+14150000000"
                }
            }]
        })
    });
    test("unauthorized get messages from user", async function () {
        let response = await request(app).get("/users/bob/from")
        expect(response.statusCode).toBe(401)
    });
});
afterAll(async function () {
    // close db connection
    await db.end();
});
