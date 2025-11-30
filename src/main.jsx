import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import {
  initStore
} from "./store";
initStore().then(store => {
  if(store) {
    ReactDOM.createRoot(document.getElementById("root")).render(<App />)
  } else {
    alert("Failed to initialize store");
  }
}).catch((e) => {
  alert(JSON.stringify(e));
});

