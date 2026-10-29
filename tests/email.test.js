import { test } from "node:test";
import assert from "node:assert/strict";
import { getSmtpConfig, sendEmail } from "../src/lib/email/index.js";

test("SMTP configuration is optional when no host is configured", () => {
    assert.equal(getSmtpConfig({}), null);
});

test("Gmail SMTP defaults to Google's SSL endpoint", () => {
    const gmail = getSmtpConfig({ SMTP_USER: "store@gmail.com", SMTP_PASS: "app-password" });
    assert.equal(gmail.host, "smtp.gmail.com");
    assert.equal(gmail.port, 465);
    assert.equal(gmail.secure, true);
    assert.equal(gmail.from, "store@gmail.com");
});

test("SMTP configuration requires credentials and a valid port", () => {
    assert.throws(() => getSmtpConfig({ SMTP_HOST: "mail.example.test" }), /SMTP_USER and SMTP_PASS/);
    assert.throws(() => getSmtpConfig({ SMTP_HOST: "mail.example.test", SMTP_USER: "user", SMTP_PASS: "pass", SMTP_PORT: "70000" }), /SMTP_PORT/);
});

test("hosting SMTP uses SSL on port 465 and STARTTLS on port 587", () => {
    const ssl = getSmtpConfig({ SMTP_HOST: "mail.example.test", SMTP_PORT: "465", SMTP_USER: "mail@example.test", SMTP_PASS: "secret" });
    assert.equal(ssl.secure, true);
    assert.equal(ssl.requireTLS, false);
    assert.equal(ssl.from, "mail@example.test");

    const startTls = getSmtpConfig({ SMTP_HOST: "mail.example.test", SMTP_PORT: "587", SMTP_USER: "mail@example.test", SMTP_PASS: "secret", EMAIL_FROM: "Store <mail@example.test>" });
    assert.equal(startTls.secure, false);
    assert.equal(startTls.requireTLS, true);
    assert.equal(startTls.from, "Store <mail@example.test>");
});

test("production never reports a successful send when SMTP is not configured", async (t) => {
    const previous = {
        nodeEnv: process.env.NODE_ENV,
        smtpHost: process.env.SMTP_HOST,
        smtpPort: process.env.SMTP_PORT,
        smtpUser: process.env.SMTP_USER,
        smtpPass: process.env.SMTP_PASS,
    };
    t.after(() => {
        for (const [key, value] of Object.entries({
            NODE_ENV: previous.nodeEnv,
            SMTP_HOST: previous.smtpHost,
            SMTP_PORT: previous.smtpPort,
            SMTP_USER: previous.smtpUser,
            SMTP_PASS: previous.smtpPass,
        })) {
            if (value === undefined)
                delete process.env[key];
            else
                process.env[key] = value;
        }
    });
    process.env.NODE_ENV = "production";
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_PORT;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
    assert.deepEqual(await sendEmail("customer@example.test", "Code", "<p>123456</p>", "123456"), { ok: false });
});
