export function GET(request: Request) {
  return Response.redirect(new URL("/favicon-placeholder.svg", request.url), 308);
}
