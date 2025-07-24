import { PassThrough } from "stream";
import { renderToPipeableStream } from "react-dom/server";
import { RemixServer } from "@remix-run/react";
import { createReadableStreamFromReadable } from "@remix-run/node";
import { isbot } from "isbot";
import { addDocumentResponseHeaders } from "./shopify.server";

export const streamTimeout = 15000; // Increased for Cloudflare tunnel stability

export default async function handleRequest(
  request,
  responseStatusCode,
  responseHeaders,
  remixContext,
) {
  addDocumentResponseHeaders(request, responseHeaders);
  const userAgent = request.headers.get("user-agent");
  const callbackName = isbot(userAgent ?? "") ? "onAllReady" : "onShellReady";

  return new Promise((resolve, reject) => {
    const { pipe, abort } = renderToPipeableStream(
      <RemixServer context={remixContext} url={request.url} />,
      {
        [callbackName]: () => {
          const body = new PassThrough();
          const stream = createReadableStreamFromReadable(body);

          responseHeaders.set("Content-Type", "text/html");
          resolve(
            new Response(stream, {
              headers: responseHeaders,
              status: responseStatusCode,
            }),
          );
          pipe(body);
        },
        onShellError(error) {
          console.error("Shell rendering error:", error);
          reject(error);
        },
        onError(error) {
          responseStatusCode = 500;
          console.error("Server rendering error:", error);
          // Log additional context for Cloudflare tunnel debugging
          console.error("Request URL:", request.url);
          console.error("User Agent:", request.headers.get("user-agent"));
        },
      },
    );

    // Automatically timeout the React renderer after extended time for Cloudflare tunnel
    // React has enough time to flush down the rejected boundary contents
    setTimeout(() => {
      console.error("Stream timeout reached, aborting render");
      abort();
    }, streamTimeout + 3000);
  });
}
