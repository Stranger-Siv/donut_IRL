import type { NextPageContext } from "next";
import Link from "next/link";

type Props = { statusCode?: number };

/**
 * Pages Router fallback error page. Next's dev server looks up `/_error` when
 * rendering a failure path; a pure `src/app` project can otherwise hit
 * "missing required error components, refreshing..." if that module isn't ready.
 * App Router `app/error.tsx` remains the main boundary for route errors.
 */
function PagesError({ statusCode }: Props) {
  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: "#09090b",
        color: "#e4e4e7",
        fontFamily: "system-ui, sans-serif",
        textAlign: "center",
      }}
    >
      <h1 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
        {statusCode ? `Error ${statusCode}` : "Error"}
      </h1>
      <p style={{ fontSize: 14, color: "#71717a", maxWidth: 400 }}>
        Something went wrong while loading the app. Try again or return home.
      </p>
      <Link
        href="/"
        style={{
          marginTop: 20,
          display: "inline-block",
          padding: "10px 16px",
          background: "#7c3aed",
          color: "#fff",
          borderRadius: 8,
          textDecoration: "none",
          fontSize: 14,
          fontWeight: 500,
        }}
      >
        Home
      </Link>
    </div>
  );
}

PagesError.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res
    ? res.statusCode
    : err
      ? (err as { statusCode?: number }).statusCode
      : 404;
  return { statusCode: statusCode ?? 404 };
};

export default PagesError;
