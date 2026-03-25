"use client";

import { useState, useEffect } from "react";
import { ArrowRight, Menu, X } from "lucide-react";

const SIGNUP_URL = process.env.NEXT_PUBLIC_CONSOLE_URL
  ? `${process.env.NEXT_PUBLIC_CONSOLE_URL}/signup`
  : "/signup";

const LOGIN_URL = process.env.NEXT_PUBLIC_CONSOLE_URL
  ? `${process.env.NEXT_PUBLIC_CONSOLE_URL}/login`
  : "/login";

const NAV_LINKS = [
  { href: "#features", label: "機能" },
  { href: "#benefits", label: "導入メリット" },
  { href: "#pricing", label: "料金" },
  { href: "#flow", label: "導入の流れ" },
  { href: "#faq", label: "FAQ" },
];

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 right-0 left-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-white/80 shadow-[0_1px_0_rgba(0,0,0,0.04)] backdrop-blur-2xl"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:h-18 lg:px-8">
        <a href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br from-red-600 to-red-500">
            <span className="text-xs font-extrabold text-white">H</span>
          </div>
          <span className="text-base font-bold tracking-tight text-gray-900">
            HR1
          </span>
        </a>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-lg px-3.5 py-2 text-[13px] font-medium text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-900"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <a
            href={LOGIN_URL}
            className="rounded-lg px-4 py-2 text-[13px] font-medium text-gray-600 transition-colors hover:text-gray-900"
          >
            ログイン
          </a>
          <a
            href={SIGNUP_URL}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-gray-900 px-4 text-[13px] font-medium text-white transition-all hover:bg-gray-800"
          >
            無料で始める
            <ArrowRight className="h-3.5 w-3.5" />
          </a>
        </div>

        <button
          className="flex items-center justify-center rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-50 md:hidden"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="メニュー"
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {menuOpen && (
        <div className="border-t border-gray-100/80 bg-white/95 px-4 py-4 backdrop-blur-2xl sm:px-6 sm:py-5 md:hidden">
          <nav className="flex flex-col gap-0.5">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-lg px-3 py-3 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <div className="mt-3 border-t border-gray-100 pt-3">
              <a
                href={LOGIN_URL}
                className="block rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600"
              >
                ログイン
              </a>
              <a
                href={SIGNUP_URL}
                className="mt-2 flex h-12 items-center justify-center gap-2 rounded-lg bg-gray-900 text-sm font-medium text-white"
              >
                無料で始める
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
