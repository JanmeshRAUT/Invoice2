import { Routes, Route } from "react-router-dom";
import Home from "./Home";
import App from "./App";
import Page2 from "./Page2";

export default function Router() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/invoice" element={<App />} />
      <Route path="/page2" element={<Page2 />} />
    </Routes>
  );
}
