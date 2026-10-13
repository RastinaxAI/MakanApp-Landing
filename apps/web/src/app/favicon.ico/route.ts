export function GET(request: Request) {
  return Response.redirect(new URL("/brand/makan-icon.svg", request.url), 308);
}
