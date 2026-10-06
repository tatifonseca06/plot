import type { Request, Response } from "express";

export function getHealth(_request: Request, response: Response) {
  response.json({ data: { status: "ok", service: "plot-api" } });
}
