import { test } from "node:test";
import assert from "node:assert/strict";
import { validateUpload, sniffMatches } from "../src/lib/storage/validate";
const MB = 1024 * 1024;
test("accepts valid files per kind", () => {
    assert.deepEqual(validateUpload("VIDEO", "video/mp4", 5 * MB), { ok: true, ext: "mp4" });
    assert.deepEqual(validateUpload("VOICE", "audio/ogg; codecs=opus", MB), { ok: true, ext: "ogg" });
    assert.deepEqual(validateUpload("GUIDE", "application/pdf", MB), { ok: true, ext: "pdf" });
});
test("rejects wrong type, oversize, empty and unknown kind", () => {
    assert.equal(validateUpload("VIDEO", "video/x-matroska", MB).ok, false);
    assert.equal(validateUpload("VIDEO", "video/mp4", 17 * MB).ok, false);
    assert.equal(validateUpload("GUIDE", "application/pdf", 0).ok, false);
    assert.equal(validateUpload("OTHER", "application/pdf", 10).ok, false);
    assert.equal(validateUpload("GUIDE", "video/mp4", MB).ok, false);
});
test("sniffing checks real file signatures", () => {
    assert.ok(sniffMatches("pdf", Buffer.from("%PDF-1.7 ...")));
    assert.ok(!sniffMatches("pdf", Buffer.from("MZ\x90\x00 not a pdf")));
    assert.ok(sniffMatches("mp4", Buffer.from("\0\0\0\x18ftypmp42")));
    assert.ok(sniffMatches("ogg", Buffer.from("OggS\0\x02")));
    assert.ok(sniffMatches("mp3", Buffer.from("ID3\x04")));
    assert.ok(!sniffMatches("mp4", Buffer.from("<html>")));
});
