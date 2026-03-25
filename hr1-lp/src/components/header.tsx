"use client";

import { useState, useEffect } from "react";
import { ArrowRight, Menu, X } from "lucide-react";

const SIGNUP_URL = process.env.NEXT_PUBLIC_CONSOLE_URL
  ? `${process.env.NEXT_PUBLIC_CONSOLE_URL}/signup`
  : "/signup";

const LOGIN_URL = process.env.NEXT_PUBLIC_CONSOLE_URL
  ? `${process.env.NEXT_PUBLIC_CONSOLE_URL}/login`
  : "/login";

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 right-0 left-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-white/90 shadow-sm backdrop-blur-xl" : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:h-20 lg:px-8">
        <a href="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-red-600 to-red-500 shadow-md shadow-red-600/20">
            <span className="text-sm font-bold text-white">H</span>
          </div>
          <span className="text-lg font-bold tracking-tight text-gray-900">
            HR1 <span className="font-normal text-gray-500">Studio</span>
          </span>
        </a>

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-8 md:flex">
          <a
            href="#features"
            className="text-sm font-medium text-gray-600 transition hover:text-gray-900"
          >
            機能
          </a>
          <a
            href="#benefits"
            className="text-sm font-medium text-gray-600 transition hover:text-gray-900"
          >
            導入メリット
          </a>
          <a
            href="#flow"
            className="text-sm font-medium text-gray-600 transition hover:text-gray-900"
          >
            導入の流れ
          </a>
          <a
            href={LOGIN_URL}
            className="text-sm font-medium text-gray-600 transition hover:text-gray-900"
          >
            ログイン
          </a>
          <a
            href={SIGNUP_URL}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-gradient-to-r from-red-600 to-red-500 px-6 text-sm font-semibold text-white shadow-lg shadow-red-600/25 transition-all hover:shadow-xl hover:shadow-red-600/30"
          >
            無料で始める
            <ArrowRight className="h-4 w-4" />
          </a>
        </nav>

        {/* Mobile menu button */}
        <button
          className="flex items-center justify-center md:hidden"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="メニュー"
        >
          {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Nav */}
      {menuOpen && (
        <div className="border-t border-gray-100 bg-white px-6 py-4 shadow-lg md:hidden">
          <nav className="flex flex-col gap-4">
            <a
              href="#features"
              className="text-sm font-medium text-gray-600"
              onClick={() => setMenuOpen(false)}
            >
              機能
            </a>
            <a
              href="#benefits"
              className="text-sm font-medium text-gray-600"
              onClick={() => setMenuOpen(false)}
            >
              導入メリット
            </a>
            <a
              href="#flow"
              className="text-sm font-medium text-gray-600"
              onClick={() => setMenuOpen(false)}
            >
              導入の流れ
            </a>
            <a href={LOGIN_URL} className="text-sm font-medium text-gray-600">
              ログイン
            </a>
            <a
              href={SIGNUP_URL}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-red-600 to-red-500 px-6 text-sm font-semibold text-white"
            >
              無料で始める
              <ArrowRight className="h-4 w-4" />
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
