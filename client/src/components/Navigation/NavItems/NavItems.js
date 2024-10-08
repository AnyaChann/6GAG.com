import React from "react";
import NavItem from "../NavItems/NavItem/NavItem.js";

const navigationItems = () => (
  <ul className="secondary">
    <NavItem link="/"><span role="img" aria-label="shuffle">🔀</span> Shuffle</NavItem>
    <NavItem link="/"><span role="img" aria-label="get app">📱</span> Get App </NavItem>
    <NavItem link="/"><span role="img" aria-label="memeland">🏴‍☠️</span> Memeland</NavItem>
    <NavItem link="/"><span role="img" aria-label="vibes">💫</span> 9GAG Vibes</NavItem>
    <NavItem link="/"><span role="img" aria-label="ask">❓</span> Ask</NavItem>
  </ul>
);

export default navigationItems;
