import {Request, Response} from "express";
import {isNullOrUndefined} from "util";

import {verifyToken} from "../token";

export function sendResponse(response: Response, httpError: number, responseBody: any) {
    if (isNullOrUndefined(responseBody)) {
        response.status(httpError).end();
    }
    else {
        response.json(responseBody);
    }
}

export function getId(request: Request): number {
    const id = Number(request.params.id);
    if (isNullOrUndefined(request.params.id) || !Number.isInteger(id)) {
        return null;
    }
    else {
        return id;
    }
}

export function getToken(request: Request): any {
    const tokenString = request.headers["x-authorization"];
    if (tokenString === null || Array.isArray(tokenString))
        return null;

    return verifyToken(tokenString);
}