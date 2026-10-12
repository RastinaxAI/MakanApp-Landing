from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class StrictSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ErrorDetail(StrictSchema):
    field: str
    code: str
    message: str


class ErrorBody(StrictSchema):
    code: str
    message: str
    details: list[ErrorDetail] = Field(default_factory=list)


class ErrorResponse(StrictSchema):
    error: ErrorBody
    trace_id: str


class HealthResponse(StrictSchema):
    status: Literal["ok"]


class PaginationQuery(StrictSchema):
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.page_size
