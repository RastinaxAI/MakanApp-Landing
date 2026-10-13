export function GET(request: Request) {
  return Response.redirect(new URL("/brand/makan-logo.png", request.url), 308);
}
