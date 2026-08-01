"use client";

import { useEffect, useState } from "react";

export function NavBar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav className={`l-nav${scrolled ? " scrolled" : ""}`}>
      <div className="l-nav-logo">
        REP<span>MAX</span>
      </div>
      <a href="#registro" className="l-nav-cta">
        Registrar mi tienda →
      </a>
    </nav>
  );
}
