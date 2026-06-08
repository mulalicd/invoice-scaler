import { describe, it, expect } from "vitest";
import { maskEmail, redactString, redactValue } from "@/lib/redact";

describe("redact", () => {
  it("masks emails", () => {
    expect(maskEmail("john.doe@example.com")).toBe("j***@example.com");
  });
  it("redacts JWT tokens", () => {
    const jwt = "eyJabc.def-_123.xyz_456";
    expect(redactString(`Authorization: Bearer ${jwt}`)).toContain("[REDACTED_AUTH]");
    expect(redactString(jwt)).toBe("[REDACTED_JWT]");
  });
  it("redacts api key in url", () => {
    expect(redactString("https://x/y?apikey=secret123&foo=bar")).toContain("apikey=[REDACTED]");
  });
  it("redacts secret-shaped object keys", () => {
    const out = redactValue({ password: "p", token: "t", nested: { api_key: "k", ok: "ok" } });
    expect(out.password).toBe("[REDACTED]");
    expect(out.token).toBe("[REDACTED]");
    expect(out.nested.api_key).toBe("[REDACTED]");
    expect(out.nested.ok).toBe("ok");
  });
  it("masks email inside object string values", () => {
    const out = redactValue({ note: "kontakt: alice@idss.ba" });
    expect(out.note).toBe("kontakt: a***@idss.ba");
  });
});
