import { NextRequest, NextResponse } from "next/server";

const backendUrl = (process.env.BACKEND_URL ?? "http://127.0.0.1:8000").replace(
    /\/$/,
    "",
);

async function proxyRequest(request: NextRequest, pathSegments: string[]) {
    const path = pathSegments.join("/");
    const url = `${backendUrl}/api/v1/${path}${request.nextUrl.search}`;

    const headers = new Headers();
    const contentType = request.headers.get("content-type");
    if (contentType) {
        headers.set("content-type", contentType);
    }

    const cookie = request.headers.get("cookie");
    if (cookie) {
        headers.set("cookie", cookie);
    }

    const authorization = request.headers.get("authorization");
    if (authorization) {
        headers.set("authorization", authorization);
    }

    const userAgent = request.headers.get("user-agent");
    if (userAgent) {
        headers.set("user-agent", userAgent);
    }

    const hasBody = !["GET", "HEAD"].includes(request.method);
    const body = hasBody ? await request.text() : undefined;

    const response = await fetch(url, {
        method: request.method,
        headers,
        body,
    });

    const nextResponse = new NextResponse(response.body, {
        status: response.status,
        statusText: response.statusText,
    });

    const passthroughHeaders = ["content-type", "cache-control"];
    for (const header of passthroughHeaders) {
        const value = response.headers.get(header);
        if (value) {
            nextResponse.headers.set(header, value);
        }
    }

    const setCookies =
        typeof response.headers.getSetCookie === "function"
            ? response.headers.getSetCookie()
            : [];

    if (setCookies.length > 0) {
        for (const value of setCookies) {
            nextResponse.headers.append("set-cookie", value);
        }
    } else {
        const single = response.headers.get("set-cookie");
        if (single) {
            nextResponse.headers.append("set-cookie", single);
        }
    }

    return nextResponse;
}

type RouteContext = {
    params: Promise<{ path: string[] }>;
};

async function handle(request: NextRequest, context: RouteContext) {
    const { path } = await context.params;
    return proxyRequest(request, path);
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
