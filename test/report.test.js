import { expect } from "chai";
import request from "supertest";
import server from "../app.js";

// Test case placeholder for unimplemented tests
it.todo = function (title, callback) {
  return it.skip("TODO: " + title, callback);
};

let userToken = "";

describe("Reports API Tests", () => {
  // Login for at få token
  before((done) => {
    request(server)
      .post("/login")
      .send({ email: "test@mail.com", password: "testpassword" })
      .end((err, res) => {
        if (err) return done(err);
        userToken = res.headers["set-cookie"][0].split(";")[0].split("=")[1]; // Extract token from cookie
        done();
      });
  });

  it.todo("Should test no access if on wrong IP address", (done) => {});
  it.todo(
    "Should get access to change report fields if conditions met",
    (done) => {}
  );
});
