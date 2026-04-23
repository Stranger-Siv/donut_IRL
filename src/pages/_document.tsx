import { Html, Head, Main, NextScript } from "next/document";

/** Minimal document so `src/pages/_app` + `/_error` can build in production. */
export default function Document() {
  return (
    <Html lang="en">
      <Head />
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
