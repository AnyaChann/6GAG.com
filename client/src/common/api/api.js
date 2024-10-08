import axios from "axios";
import { authenCache } from "../cache/authen-cache";

class API {
  constructor({ url, onErrors }) {
    this.instance = axios.create({
      baseURL: url
    });
    this.headers = {};
    this.instance.interceptors.request.use(request => {
      Object.keys(this.headers).forEach(key => {
        let val =
          typeof this.headers[key] === "function"
            ? this.headers[key]()
            : this.headers[key];
        if (val) {
          request.headers[key] = val;
        }
      });
      return request;
    });
    this.instance.interceptors.response.use(
      response => {
        // console.log(response);
        // console.log(response.message);
        return response;
      },
      error => {
        let resError = null;
        console.log(error);
        console.log(error.message);
        if (error.response) {
          if (onErrors.hasOwnProperty(error.response.data.message))
            onErrors[error.response.data.message]();
          resError = new Error(error.response.data.message);
        } else {
          resError = new Error(
            error.message
              .toString()
              .toLowerCase()
              .replace(" ", "_")
          );
        }
        return Promise.reject(resError);
      }
    );
  }

  addHeader = (key, getHeader) => {
    this.headers[key] = getHeader;
  };

  get = (url, config = null) => {
    return this.instance.get(url, config);
  };

  delete = (url, config = null) => {
    return this.instance.delete(url, config);
  };

  post = (url, data, config) => {
    return this.instance.post(url, data, config);
  };

  put = (url, data, config) => {
    return this.instance.put(url, data, config);
  };
}

export const axiosApi = new API({
  url: process.env.REACT_APP_API_URL,
  onErrors: {
    token_expired: () => {
      console.log("token_expired");
      authenCache.clearAuthen();
    },
    account_not_found: () => {
      console.log("account_not_found");
      authenCache.clearAuthen();
    },
    require_login: () => {
      console.log("require_login");
      authenCache.clearAuthen();
    }
  }
});