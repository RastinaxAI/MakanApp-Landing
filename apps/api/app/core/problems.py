class ApiProblem(Exception):
    def __init__(self, status: int, code: str, message: str, retry_after: int | None = None):
        self.status = status
        self.code = code
        self.message = message
        self.retry_after = retry_after


def unauthorized() -> ApiProblem:
    return ApiProblem(401, "UNAUTHORIZED", "ورود معتبر نیست. ایمیل، رمز و کد ورود را بررسی کنید.")
