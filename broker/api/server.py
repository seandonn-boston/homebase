"""
API Server — HTTP interface for the broker platform.

Uses only the Python standard library (http.server) to keep this
dependency-free. In production you'd use FastAPI or similar.
"""

from __future__ import annotations

import json
from http.server import HTTPServer, BaseHTTPRequestHandler
from typing import Any
from urllib.parse import urlparse, parse_qs

from broker.services.bootstrap import bootstrap, Platform


class BrokerHandler(BaseHTTPRequestHandler):
    """Minimal REST-ish API handler."""

    platform: Platform  # set at class level before serving

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        path = parsed.path.rstrip("/")
        params = parse_qs(parsed.query)

        routes: dict[str, Any] = {
            "/services": self._list_services,
            "/services/status": self._service_status,
            "/billing/user": self._user_bill,
            "/billing/platform": self._platform_summary,
            "/sessions/active": self._active_sessions,
        }

        handler = routes.get(path)
        if handler:
            handler(params)
        else:
            self._json_response(404, {"error": "not_found"})

    def do_POST(self) -> None:
        parsed = urlparse(self.path)
        path = parsed.path.rstrip("/")
        body = self._read_body()

        routes: dict[str, Any] = {
            "/sessions/start": self._start_session,
            "/sessions/end": self._end_session,
            "/admin/enforce-limits": self._enforce_limits,
        }

        handler = routes.get(path)
        if handler:
            handler(body)
        else:
            self._json_response(404, {"error": "not_found"})

    # --- Route handlers -----------------------------------------------------

    def _list_services(self, params: dict) -> None:
        services = self.platform.store.list_services()
        result = []
        for svc in services:
            status = self.platform.broker.service_status(svc.service_id)
            result.append(status)
        self._json_response(200, {"services": result})

    def _service_status(self, params: dict) -> None:
        service_id = params.get("id", [None])[0]
        if not service_id:
            self._json_response(400, {"error": "missing id parameter"})
            return
        try:
            status = self.platform.broker.service_status(service_id)
            self._json_response(200, status)
        except ValueError as e:
            self._json_response(404, {"error": str(e)})

    def _user_bill(self, params: dict) -> None:
        user_id = params.get("user_id", [None])[0]
        if not user_id:
            self._json_response(400, {"error": "missing user_id parameter"})
            return
        bill = self.platform.billing.user_bill(user_id)
        self._json_response(200, {
            "user_id": bill.user_id,
            "total_seconds": bill.total_seconds,
            "total_cost_cents": round(bill.total_cost_cents, 2),
            "total_cost_dollars": round(bill.total_cost_dollars, 4),
            "sessions": len(bill.breakdown),
        })

    def _platform_summary(self, params: dict) -> None:
        summary = self.platform.billing.platform_summary()
        self._json_response(200, summary)

    def _active_sessions(self, params: dict) -> None:
        user_id = params.get("user_id", [None])[0]
        if not user_id:
            self._json_response(400, {"error": "missing user_id parameter"})
            return
        sessions = self.platform.store.active_sessions_for_user(user_id)
        self._json_response(200, {
            "user_id": user_id,
            "active_sessions": [
                {
                    "session_id": s.session_id,
                    "service_id": s.service_id,
                    "started_at": s.started_at,
                    "duration_seconds": s.duration_seconds,
                }
                for s in sessions
            ],
        })

    def _start_session(self, body: dict) -> None:
        user_id = body.get("user_id")
        service_id = body.get("service_id")
        if not user_id or not service_id:
            self._json_response(400, {"error": "missing user_id or service_id"})
            return
        try:
            session = self.platform.broker.request_session(user_id, service_id)
            self._json_response(200, {
                "session_id": session.session_id,
                "state": session.state.value,
                "credential_id": session.credential_id or None,
                "queue_position": self.platform.broker.get_queue_position(session.session_id),
            })
        except ValueError as e:
            self._json_response(404, {"error": str(e)})

    def _end_session(self, body: dict) -> None:
        session_id = body.get("session_id")
        if not session_id:
            self._json_response(400, {"error": "missing session_id"})
            return
        record = self.platform.broker.end_session(session_id)
        if record:
            self._json_response(200, {
                "session_id": session_id,
                "duration_seconds": round(record.duration_seconds, 2),
                "cost_cents": round(record.cost_cents, 4),
            })
        else:
            self._json_response(404, {"error": "session not found or already ended"})

    def _enforce_limits(self, body: dict) -> None:
        expired = self.platform.broker.enforce_max_duration()
        self._json_response(200, {"expired_sessions": expired})

    # --- Helpers ------------------------------------------------------------

    def _read_body(self) -> dict:
        length = int(self.headers.get("Content-Length", 0))
        if length == 0:
            return {}
        raw = self.rfile.read(length)
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            return {}

    def _json_response(self, status: int, data: Any) -> None:
        body = json.dumps(data, indent=2).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format: str, *args: Any) -> None:
        # Quiet during normal operation; uncomment for debug
        pass


def run(host: str = "127.0.0.1", port: int = 8099) -> None:
    """Start the broker API server."""
    platform = bootstrap()
    BrokerHandler.platform = platform
    server = HTTPServer((host, port), BrokerHandler)
    print(f"Broker API running on http://{host}:{port}")
    print("Endpoints:")
    print("  GET  /services              — list all services + availability")
    print("  GET  /services/status?id=X  — single service status")
    print("  POST /sessions/start        — {user_id, service_id}")
    print("  POST /sessions/end          — {session_id}")
    print("  GET  /sessions/active?user_id=X")
    print("  GET  /billing/user?user_id=X")
    print("  GET  /billing/platform")
    print("  POST /admin/enforce-limits")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down.")
        server.shutdown()


if __name__ == "__main__":
    run()
