import { expect } from "chai";
import request from "supertest";
import server from "../app.js";

// Test case placeholder for unimplemented tests
it.todo = function (title, callback) {
  return it.skip("TODO: " + title, callback);
};

let adminToken = "";

describe("Admin Tests", () => {
  it("should successfully login with admin role", (done) => {
    request(server)
      .post("/api/login")
      .send({ email: "testadmin@mail.com", password: "testadminpassword" })
      .end((err, res) => {
        if (err) return done(err);
        expect(res.status).to.equal(200); // Check login success
        expect(res.headers["set-cookie"]).to.exist;
        expect(res.body).to.have.property("role"); // Check that 'role' exists
        expect(res.body.role).to.equal("admin"); // Check that 'role' is 'user'
        adminToken = res.headers["set-cookie"][0].split(";")[0].split("=")[1]; // Extract token from cookie
        done();
      });
  });

  it("should display 'Invalid email' message for incorrect email", (done) => {
    request(server)
      .post("/api/login")
      .send({ email: "wrongadmin@mail.com", password: "testadminpassword" })
      .end((err, res) => {
        if (err) return done(err);
        expect(res.status).to.equal(401); // Unauthorized status for incorrect email
        expect(res.body).to.have.property("message", "Forkert email"); // Check error message in response body
        done();
      });
  });

  it("Should get access to all users with admin role", (done) => {
    request(server)
      .get("/auth/all-users")
      .set("Cookie", `token=${adminToken}`)
      .end((err, res) => {
        if (err) return done(err);
        expect(res.status).to.equal(200);
        done();
      });
  });
  it("Should get access to signup page with admin role", (done) => {
    request(server)
      .get("/auth/signup")
      .set("Cookie", `token=${adminToken}`)
      .end((err, res) => {
        if (err) return done(err);
        expect(res.status).to.equal(200);
        done();
      });
  });

  it("Should get access to reset password page with admin role", (done) => {
    request(server)
      .get("/auth/reset-password")
      .set("Cookie", `token=${adminToken}`)
      .end((err, res) => {
        if (err) return done(err);
        expect(res.status).to.equal(200);
        done();
      });
  });
});
