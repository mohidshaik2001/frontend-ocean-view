import { conf } from "../conf.js";
import axios from "axios";
export class AuthService {
  constructor() {
    this.api = `${conf.api_url}/api/v1/user`;
  }

  async registerUser({ email, password, fullName }) {
    try {
      const user = await axios
        .post(
          `${this.api}/register`,
          { email, password, fullName },
          {
            headers: {
              "Content-Type": "application/json",
            },
            withCredentials: "include",
          }
        )
        .then((res) => {
          return res.data.data;
        });
      if (user) {
        return user;
      } else {
        return null;
      }
    } catch (error) {
      console.log(error);
    }
  }

  async loginUser({ email, password }) {
    try {
      const user = await axios
        .post(
          `${this.api}/login`,
          { email, password },
          {
            withCredentials: "include",
          }
        )
        .then((res) => {
          return res.data.data;
        });
      console.log("user", user);
      if (user) {
        return user;
      } else {
        return null;
      }
    } catch (error) {
      console.log(error);
    }
  }
  async logoutUser() {
    try {
      const code = await axios
        .get(`${this.api}/logout`, {
          withCredentials: "include",
        })
        .then((res) => {
          return res.data.statusCode;
        });
      if (code == 200) {
        return code;
      }
    } catch (error) {
      console.log(error);
    }
  }
  async getCurrentUser() {
    try {
      return {
        fullName: "test",
        username: "test",
        email: "test",
        _id: "test",
      };
      // const user = await axios
      //   .get(`${this.api}/current-user`, {
      //     withCredentials: "include",
      //   })
      //   .then((res) => {
      //     return res.data.data;
      //   });
      // if (user) {
      //   return user;
      // } else {
      //   return null;
      // }
    } catch (error) {
      console.log(error);
    }
  }
  async refreshAccessToken() {
    try {
      const code = await axios
        .get(`${this.api}/refresh`, {
          withCredentials: "include",
        })
        .then((res) => {
          return res.data.data;
        });
      if (code == 200) {
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.log(error);
    }
  }
}

const authService = new AuthService();
export default authService;
