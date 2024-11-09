import connection from "../config/db.js";

class User {
  static async create(newUser) {
    try {
      const [result] = await connection.query(
        "INSERT INTO users SET ?",
        newUser
      );
      return result;
    } catch (error) {
      throw new Error(error);
    }
  }

  static async updateRole(userId, role) {
    try {
      const [result] = await connection.query(
        "UPDATE users SET role = ? WHERE id = ?",
        [role, userId]
      );
      return result.affectedRows;
    } catch (error) {
      throw new Error(error);
    }
  }

  static async deleteUser(userId) {
    try {
      const [result] = await connection.query(
        "DELETE FROM users WHERE id = ?",
        userId
      );
      return result.affectedRows;
    } catch (error) {
      throw new Error(error);
    }
  }

  static async findByEmail(email) {
    try {
      const [rows] = await connection.query(
        "SELECT * FROM users WHERE email = ?",
        [email]
      );
      return rows[0];
    } catch (error) {
      throw new Error(error);
    }
  }

  static async findById(userId) {
    try {
      const [rows] = await connection.query(
        "SELECT * FROM users WHERE id = ?",
        [userId]
      );
      return rows[0];
    } catch (error) {
      throw new Error(error);
    }
  }

  static async findAll() {
    try {
      const [rows] = await connection.query(
        "SELECT * FROM users ORDER BY role ASC, firstname ASC, lastname ASC"
      );
      return rows;
    } catch (error) {
      throw new Error(error);
    }
  }

  static async updatePassword(userId, newPassword) {
    try {
      const [result] = await connection.query(
        "UPDATE users SET password = ? WHERE id = ?",
        [newPassword, userId]
      );
      return result.affectedRows;
    } catch (error) {
      throw new Error(error);
    }
  }
}

export default User;
