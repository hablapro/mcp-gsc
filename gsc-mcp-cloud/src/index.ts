import { default as apiHandler } from "./utils/apisHandler";

export default {
  fetch: apiHandler.fetch.bind(apiHandler)
};
