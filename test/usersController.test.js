import { expect } from "chai";
import request from "supertest";
import server from "../app.js";

// Test case placeholder for unimplemented tests
it.todo = function (title, callback) {
  return it.skip("TODO: " + title, callback);
};

let userToken = "";

describe("API Tests", () => {
  it("should successfully login with correct email and password", (done) => {
    request(server)
      .post("/api/login")
      .send({ email: "test@mail.com", password: "testpassword!" })
      .end((err, res) => {
        if (err) return done(err);
        expect(res.status).to.equal(200); // Correct status
        expect(res.headers["set-cookie"]).to.exist;
        expect(res.body).to.have.property("role"); // Check that 'role' exists
        expect(res.body.role).to.equal("user"); // Check that 'role' is 'user'
        userToken = res.headers["set-cookie"][0].split(";")[0].split("=")[1]; // Extract token from cookie
        done();
      });
  });

  it("should display 'Invalid email' message for incorrect email", (done) => {
    request(server)
      .post("/api/login")
      .send({ email: "wrong@mail.com", password: "testpassword" })
      .end((err, res) => {
        if (err) return done(err);
        expect(res.status).to.equal(401); // Unauthorized status for incorrect email
        expect(res.body).to.have.property("message", "Forkert email eller adgangskode"); // Check error message in response body
        done();
      });
  });

  it("should display 'Invalid password' message for incorrect password", (done) => {
    request(server)
      .post("/api/login")
      .send({ email: "test@mail.com", password: "wrongpassword" })
      .end((err, res) => {
        if (err) return done(err);
        expect(res.status).to.equal(401); // Unauthorized status for incorrect password
        expect(res.body).to.have.property("message", "Forkert email eller adgangskode"); // Check error message in response body
        done();
      });
  });

  it("should display 'Please fill in all fields' message for empty fields", (done) => {
    request(server)
      .post("/api/login")
      .send({ email: "", password: "" })
      .end((err, res) => {
        if (err) return done(err);
        expect(res.status).to.equal(400); // Bad request status for empty fields
        expect(res.body).to.have.property(
          "message",
          "Udfyld alle felter"
        ); // Check error message in response body
        done();
      });
  });

  it("should display 'Please fill in all fields' message for missing email", (done) => {
    request(server)
      .post("/api/login")
      .send({ password: "testpassword" })
      .end((err, res) => {
        if (err) return done(err);
        expect(res.status).to.equal(400); // Bad request status for missing email
        expect(res.body).to.have.property(
          "message",
          "Udfyld alle felter"
        ); // Check error message in response body
        done();
      });
  });

  it("should display 'Please fill in all fields' message for missing password", (done) => {
    request(server)
      .post("/api/login")
      .send({ email: "test@mail.com" })
      .end((err, res) => {
        if (err) return done(err);
        expect(res.status).to.equal(400); // Bad request status for missing password
        expect(res.body).to.have.property(
          "message",
          "Udfyld alle felter"
        ); // Check error message in response body
        done();
      });
  });

  it("should not allow password change", (done) => {
    request(server)
      .post("/auth/change-password")
      .set("Cookie", `token=${userToken}`)
      .send({ newPassword: "123", confirmPassword: "123" })
      .end((err, res) => {
        if (err) return done(err);
        expect(res.status).to.equal(403); // Forventet fejlstatus
        done();
      });
  });
  

  it.todo(
    "Should get access to change password, if password i default",
    (done) => {}
  );
  it.todo("Should test no access if on wrong IP adress", (done) => {});
});
