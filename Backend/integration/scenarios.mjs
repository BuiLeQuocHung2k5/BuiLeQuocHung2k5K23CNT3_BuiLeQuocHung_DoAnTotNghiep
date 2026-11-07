import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { loadTestConfig, openTestDatabase } from "./safety.mjs";
import { buildApp } from "../src/app-factory.js";
import { createJwtService } from "../src/utils/jwt.js";
import { transaction } from "../src/utils/catalog-db.js";

// This file is deliberately outside test/ and has no *.test.js name.
// Only the explicit integration command may execute it; no MySQL mocks are used.
const database = await openTestDatabase(loadTestConfig());

test("real MySQL: isolated auth/catalog/circulation lifecycle", { timeout: 120000 }, async t => {
    const runId = randomBytes(12).toString("hex"), prefix = `it_${runId.slice(0, 16)}`;
    const manifest = { users: [], categories: [], books: [], copies: [], borrows: [] };
    let server, failed = false, completed = false, runRegistered = false, barcodeSequence = 0, loanSequence = 0;
    const save = () => database.execute("UPDATE __libriflow_integration_runs SET manifest = ? WHERE run_id = ?", [JSON.stringify(manifest), runId]);
    t.after(async () => {
        try {
            if (runRegistered) await database.execute("UPDATE __libriflow_integration_runs SET status = ?, finished_at = UTC_TIMESTAMP(), manifest = ? WHERE run_id = ?", [completed && !failed ? "passed" : "failed", JSON.stringify(manifest), runId]);
        } finally {
            if (server) { server.closeAllConnections();await new Promise(resolve => server.close(resolve)); }
            await database.end();
        }
    });
    await database.execute("INSERT INTO __libriflow_integration_runs (run_id, status, started_at, manifest) VALUES (?, 'running', UTC_TIMESTAMP(), ?)", [runId, JSON.stringify(manifest)]);
    runRegistered = true;
    const secret = randomBytes(48).toString("base64url");
    server = buildApp({ database, tokens: createJwtService({ getSecret: () => secret }) }).listen(0, "127.0.0.1");
    await once(server, "listening");
    const base = `http://127.0.0.1:${server.address().port}`;
    async function request(path, method = "GET", body, token) {
        const response = await fetch(base + path, { method, headers: { ...(body !== undefined ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
        return { status: response.status, body: await response.json() };
    }
    const rows = async (sql, params = []) => (await database.execute(sql, params))[0];
    const scalar = async (sql, params = []) => Number(Object.values((await rows(sql, params))[0])[0]);
    async function scenario(name, work) {
        await t.test(name, async () => {
            try { await work(); } catch (error) { failed = true;throw error; }
            finally { await save(); }
        });
    }
    function expectStatus(response, status) { assert.equal(response.status, status, "Unexpected HTTP status (response deliberately not logged).");return response.body.data; }
    const password = randomBytes(24).toString("hex");
    const users = {}, tokens = {};
    let categoryId, bookId, uniqueCopy, singleLoan, batchLoan, batchCopies, racingLoan, racingCopy, privateLoan;
    const due = () => new Date(Date.now() + 7 * 86400000).toISOString().replace(/\.\d{3}Z$/, "Z");
    async function createCopy(extra = {}) {
        const barcode = `${prefix}_${++barcodeSequence}`;
        const data = expectStatus(await request("/api/book-copies", "POST", { book_id: bookId, barcode, ...extra }, tokens.staff), 201);
        assert.equal(await scalar("SELECT COUNT(*) FROM BanSaoSach WHERE copy_id = ? AND book_id = ? AND barcode = ?", [data.copy_id, bookId, barcode]), 1);
        manifest.copies.push(data.copy_id);await save();return data;
    }
    async function borrow(copyIds, user = users.readerA) {
        const note = `${prefix}_loan_${++loanSequence}`;
        const response = await request("/api/borrows", "POST", { user_id: user, copy_ids: copyIds, due_date: due(), note }, tokens.staff);
        if (response.status === 201) {
            assert.equal(await scalar("SELECT COUNT(*) FROM PhieuMuon WHERE borrow_id = ? AND user_id = ? AND note = ?", [response.body.data.borrow_id, user, note]), 1);
            manifest.borrows.push(response.body.data.borrow_id);await save();
        }
        return response;
    }
    const headersCount = () => scalar("SELECT COUNT(*) FROM PhieuMuon WHERE user_id IN (?, ?)", [users.readerA, users.readerB]);
    const detailsCount = () => scalar("SELECT COUNT(*) FROM ChiTietPhieuMuon d JOIN PhieuMuon p ON p.borrow_id = d.borrow_id WHERE p.user_id IN (?, ?)", [users.readerA, users.readerB]);

    await scenario("register and login real fixture users; passwords are hashed and never returned", async () => {
        for (const kind of ["staff", "readerA", "readerB"]) {
            const email = `${prefix}_${kind.toLowerCase()}@example.test`;
            const registered = expectStatus(await request("/api/auth/register", "POST", { name: `${prefix}_${kind}`, email, password }), 201);
            assert.equal(await scalar("SELECT COUNT(*) FROM NguoiDung WHERE user_id = ? AND email = ? AND name = ?", [registered.user_id, email, `${prefix}_${kind}`]), 1);
            users[kind] = registered.user_id;manifest.users.push(registered.user_id);await save();
            assert.ok(!Object.hasOwn(registered, "password"));
            if (kind === "staff") {
                // Only the account just created by this run gets a librarian fixture role, in the test DB.
                await database.execute("INSERT INTO NguoiDung_VaiTro (user_id, role_id) SELECT u.user_id, r.role_id FROM NguoiDung u CROSS JOIN VaiTro r WHERE u.user_id = ? AND u.email = ? AND u.name = ? AND r.name = ?", [registered.user_id, email, `${prefix}_${kind}`, "librarian"]);
            }
            const login = expectStatus(await request("/api/auth/login", "POST", { email, password }), 200);
            assert.equal(login.tokenType, "Bearer");tokens[kind] = login.accessToken;
            assert.equal(expectStatus(await request("/api/auth/me", "GET", undefined, tokens[kind]), 200).user_id, registered.user_id);
            const [stored] = await rows("SELECT password FROM NguoiDung WHERE user_id = ?", [registered.user_id]);
            assert.ok(stored.password !== password);assert.ok(await bcrypt.compare(password, stored.password));
        }
        expectStatus(await request("/api/auth/login", "POST", { email: `${prefix}_readera@example.test`, password: "wrong-fixture-password" }), 401);
        expectStatus(await request("/api/auth/register", "POST", { name: prefix, email: `${prefix}_readera@example.test`, password }), 409);
    });
    if (!tokens.staff || !tokens.readerA || !tokens.readerB) throw new Error("Integration auth prerequisites failed; dependent write scenarios stopped.");

    await scenario("health and create category/book/copy using real JWT and DB RBAC", async () => {
        expectStatus(await request("/api/health/db"), 200);
        categoryId = expectStatus(await request("/api/categories", "POST", { name: prefix }, tokens.staff), 201).category_id;manifest.categories.push(categoryId);await save();
        assert.equal(await scalar("SELECT COUNT(*) FROM DanhMuc WHERE category_id = ? AND name = ?", [categoryId, prefix]), 1);
        bookId = expectStatus(await request("/api/books", "POST", { title: `${prefix}_book`, author: "Synthetic integration fixture", category_id: categoryId }, tokens.staff), 201).book_id;manifest.books.push(bookId);await save();
        assert.equal(await scalar("SELECT COUNT(*) FROM Sach WHERE book_id = ? AND title = ?", [bookId, `${prefix}_book`]), 1);
        uniqueCopy = await createCopy({ isbn: runId.slice(0, 13) });
        assert.equal(await scalar("SELECT COUNT(*) FROM Sach WHERE book_id = ? AND category_id = ?", [bookId, categoryId]), 1);
        assert.equal(await scalar("SELECT COUNT(*) FROM BanSaoSach WHERE copy_id = ? AND book_id = ?", [uniqueCopy.copy_id, bookId]), 1);
    });
    if (!bookId || !uniqueCopy) throw new Error("Integration catalog prerequisites failed; dependent write scenarios stopped.");

    await scenario("real UNIQUE and FK constraints reject invalid inserts without persisting rows", async () => {
        expectStatus(await request("/api/categories", "POST", { name: prefix }, tokens.staff), 409);
        expectStatus(await request("/api/book-copies", "POST", { book_id: bookId, barcode: uniqueCopy.barcode }, tokens.staff), 409);
        expectStatus(await request("/api/book-copies", "POST", { book_id: bookId, barcode: `${prefix}_dup_isbn`, isbn: uniqueCopy.isbn }, tokens.staff), 409);
        assert.equal(await scalar("SELECT COUNT(*) FROM Sach WHERE book_id = ?", ["18446744073709551615"]), 0);
        expectStatus(await request("/api/book-copies", "POST", { book_id: "18446744073709551615", barcode: `${prefix}_bad_fk` }, tokens.staff), 400);
        await assert.rejects(database.execute("INSERT INTO BanSaoSach (book_id, barcode) VALUES (?, ?)", ["18446744073709551615", `${prefix}_sql_bad_fk`]), { code: "ER_NO_REFERENCED_ROW_2" });
        assert.equal(await scalar("SELECT COUNT(*) FROM BanSaoSach WHERE barcode IN (?, ?, ?)", [`${prefix}_dup_isbn`, `${prefix}_bad_fk`, `${prefix}_sql_bad_fk`]), 0);
    });

    await scenario("borrow one copy and verify committed header/detail/copy state via SELECT", async () => {
        const item = await createCopy();singleLoan = expectStatus(await borrow([item.copy_id]), 201);singleLoan.fixtureCopy = item.copy_id;
        assert.equal(await scalar("SELECT COUNT(*) FROM PhieuMuon WHERE borrow_id = ? AND status = 'borrowed'", [singleLoan.borrow_id]), 1);
        assert.equal(await scalar("SELECT COUNT(*) FROM ChiTietPhieuMuon WHERE borrow_id = ? AND copy_id = ? AND status = 'borrowed' AND returned_at IS NULL", [singleLoan.borrow_id, item.copy_id]), 1);
        assert.equal((await rows("SELECT availability_status FROM BanSaoSach WHERE copy_id = ?", [item.copy_id]))[0].availability_status, "borrowed");
    });

    await scenario("borrow multiple copies atomically and SELECT every state", async () => {
        batchCopies = [await createCopy(), await createCopy()];batchLoan = expectStatus(await borrow(batchCopies.map(item => item.copy_id).reverse()), 201);
        assert.equal(await scalar("SELECT COUNT(*) FROM ChiTietPhieuMuon WHERE borrow_id = ? AND status = 'borrowed'", [batchLoan.borrow_id]), 2);
        for (const item of batchCopies) assert.equal((await rows("SELECT availability_status FROM BanSaoSach WHERE copy_id = ?", [item.copy_id]))[0].availability_status, "borrowed");
    });

    let firstReturnedAt;
    await scenario("partial damaged return commits maintenance/detail and partially_returned header", async () => {
        expectStatus(await request(`/api/borrows/${batchLoan.borrow_id}/return`, "POST", { items: [{ copy_id: batchCopies[0].copy_id, condition_after: "damaged" }] }, tokens.staff), 200);
        assert.equal((await rows("SELECT status FROM PhieuMuon WHERE borrow_id = ?", [batchLoan.borrow_id]))[0].status, "partially_returned");
        const [detail] = await rows("SELECT status, condition_after, DATE_FORMAT(returned_at, '%Y-%m-%d %H:%i:%s') AS returned_at FROM ChiTietPhieuMuon WHERE borrow_id = ? AND copy_id = ?", [batchLoan.borrow_id, batchCopies[0].copy_id]);
        assert.equal(detail.status, "returned");assert.equal(detail.condition_after, "damaged");assert.ok(detail.returned_at);firstReturnedAt = detail.returned_at;
        assert.equal((await rows("SELECT availability_status FROM BanSaoSach WHERE copy_id = ?", [batchCopies[0].copy_id]))[0].availability_status, "maintenance");
        assert.equal((await rows("SELECT availability_status FROM BanSaoSach WHERE copy_id = ?", [batchCopies[1].copy_id]))[0].availability_status, "borrowed");
    });

    await scenario("return remaining copies preserves previous return and completes header", async () => {
        expectStatus(await request(`/api/borrows/${batchLoan.borrow_id}/return`, "POST", { return_all: true, condition_after: "good" }, tokens.staff), 200);
        assert.equal((await rows("SELECT status FROM PhieuMuon WHERE borrow_id = ?", [batchLoan.borrow_id]))[0].status, "returned");
        assert.equal(await scalar("SELECT COUNT(*) FROM ChiTietPhieuMuon WHERE borrow_id = ? AND status = 'returned' AND returned_at IS NOT NULL", [batchLoan.borrow_id]), 2);
        const [prior] = await rows("SELECT condition_after, DATE_FORMAT(returned_at, '%Y-%m-%d %H:%i:%s') AS returned_at FROM ChiTietPhieuMuon WHERE borrow_id = ? AND copy_id = ?", [batchLoan.borrow_id, batchCopies[0].copy_id]);
        assert.equal(prior.returned_at, firstReturnedAt);assert.equal(prior.condition_after, "damaged");
        assert.equal((await rows("SELECT availability_status FROM BanSaoSach WHERE copy_id = ?", [batchCopies[1].copy_id]))[0].availability_status, "available");
        expectStatus(await request(`/api/borrows/${batchLoan.borrow_id}/return`, "POST", { return_all: true, condition_after: "good" }, tokens.staff), 409);
    });

    await scenario("cannot borrow an already borrowed copy; no extra header/detail persists", async () => {
        const before = [await headersCount(), await detailsCount()];expectStatus(await borrow([singleLoan.fixtureCopy], users.readerB), 409);
        assert.deepEqual([await headersCount(), await detailsCount()], before);
    });

    await scenario("invalid member rolls back whole batch and leaves valid copy available", async () => {
        const valid = await createCopy();const before = [await headersCount(), await detailsCount()];
        expectStatus(await borrow([valid.copy_id, "18446744073709551615"]), 404);
        assert.deepEqual([await headersCount(), await detailsCount()], before);
        assert.equal((await rows("SELECT availability_status FROM BanSaoSach WHERE copy_id = ?", [valid.copy_id]))[0].availability_status, "available");
        assert.equal(await scalar("SELECT COUNT(*) FROM ChiTietPhieuMuon WHERE copy_id = ?", [valid.copy_id]), 0);
    });

    await scenario("real SQL FK failure AFTER header INSERT rolls back the shared transaction helper", async () => {
        let attemptedId;
        const before = await headersCount();
        await assert.rejects(transaction(database, async connection => {
            const [result] = await connection.execute("INSERT INTO PhieuMuon (user_id, due_date, note) VALUES (?, ?, ?)", [users.readerA, "2035-01-01 00:00:00", `${prefix}_rollback`]);attemptedId = String(result.insertId);
            await connection.execute("INSERT INTO ChiTietPhieuMuon (borrow_id, copy_id) VALUES (?, ?)", [attemptedId, "18446744073709551615"]);
        }), { code: "ER_NO_REFERENCED_ROW_2" });
        assert.equal(await headersCount(), before);assert.equal(await scalar("SELECT COUNT(*) FROM PhieuMuon WHERE borrow_id = ?", [attemptedId]), 0);
    });

    await scenario("two real concurrent HTTP borrows: exactly one succeeds, SELECT proves one open loan", async () => {
        racingCopy = await createCopy();const before = await headersCount();
        const responses = await Promise.all([borrow([racingCopy.copy_id], users.readerA), borrow([racingCopy.copy_id], users.readerB)]);
        assert.deepEqual(responses.map(response => response.status).sort(), [201, 409]);racingLoan = responses.find(response => response.status === 201).body.data;
        assert.equal(await headersCount(), before + 1);
        assert.equal(await scalar("SELECT COUNT(*) FROM ChiTietPhieuMuon WHERE copy_id = ? AND (returned_at IS NULL OR status <> 'returned')", [racingCopy.copy_id]), 1);
        assert.equal((await rows("SELECT availability_status FROM BanSaoSach WHERE copy_id = ?", [racingCopy.copy_id]))[0].availability_status, "borrowed");
    });

    await scenario("invalid return batch preserves loan and all original copy states", async () => {
        expectStatus(await request(`/api/borrows/${racingLoan.borrow_id}/return`, "POST", { items: [{ copy_id: racingCopy.copy_id, condition_after: "good" }, { copy_id: uniqueCopy.copy_id, condition_after: "good" }] }, tokens.staff), 400);
        assert.equal((await rows("SELECT status FROM PhieuMuon WHERE borrow_id = ?", [racingLoan.borrow_id]))[0].status, "borrowed");
        assert.equal(await scalar("SELECT COUNT(*) FROM ChiTietPhieuMuon WHERE borrow_id = ? AND returned_at IS NULL AND status = 'borrowed'", [racingLoan.borrow_id]), 1);
        assert.equal((await rows("SELECT availability_status FROM BanSaoSach WHERE copy_id = ?", [racingCopy.copy_id]))[0].availability_status, "borrowed");
    });

    await scenario("real reader JWT cannot read another reader's loan or write circulation", async () => {
        const item = await createCopy();privateLoan = expectStatus(await borrow([item.copy_id], users.readerB), 201);
        expectStatus(await request(`/api/borrows/${privateLoan.borrow_id}`, "GET", undefined, tokens.readerA), 404);
        expectStatus(await request(`/api/borrows/${privateLoan.borrow_id}`, "GET", undefined, tokens.readerB), 200);
        const list = expectStatus(await request("/api/borrows?limit=100", "GET", undefined, tokens.readerA), 200);
        assert.ok(list.every(loan => loan.user_id === users.readerA));
        expectStatus(await request(`/api/borrows?user_id=${users.readerB}`, "GET", undefined, tokens.readerA), 403);
        expectStatus(await request("/api/borrows", "POST", { user_id: users.readerB, copy_ids: [uniqueCopy.copy_id], due_date: due() }, tokens.readerA), 403);
        expectStatus(await request(`/api/borrows/${privateLoan.borrow_id}/return`, "POST", { return_all: true, condition_after: "good" }, tokens.readerA), 403);
    });

    await scenario("history and category FK are preserved by blocked DELETE endpoints", async () => {
        expectStatus(await request(`/api/categories/${categoryId}`, "DELETE", undefined, tokens.staff), 409);
        assert.equal(await scalar("SELECT COUNT(*) FROM Sach WHERE book_id = ? AND category_id = ?", [bookId, categoryId]), 1);
        expectStatus(await request(`/api/borrows/${singleLoan.borrow_id}/return`, "POST", { return_all: true, condition_after: "good" }, tokens.staff), 200);
        expectStatus(await request(`/api/book-copies/${singleLoan.fixtureCopy}`, "DELETE", undefined, tokens.staff), 409);
        assert.equal(await scalar("SELECT COUNT(*) FROM ChiTietPhieuMuon WHERE borrow_id = ? AND copy_id = ?", [singleLoan.borrow_id, singleLoan.fixtureCopy]), 1);
    });

    await scenario("SELECT all owned copies: never more than one open detail per copy", async () => {
        const placeholders = manifest.copies.map(() => "?").join(", ");
        const duplicates = await rows(`SELECT copy_id, COUNT(*) AS total FROM ChiTietPhieuMuon WHERE copy_id IN (${placeholders}) AND (returned_at IS NULL OR status <> 'returned') GROUP BY copy_id HAVING COUNT(*) > 1`, manifest.copies);
        assert.equal(duplicates.length, 0);
        assert.equal(await scalar("SELECT COUNT(*) FROM Phat f JOIN ChiTietPhieuMuon d ON d.borrow_detail_id=f.borrow_detail_id JOIN PhieuMuon p ON p.borrow_id=d.borrow_id WHERE p.user_id IN (?, ?)", [users.readerA, users.readerB]), 0);
    });
    completed = true;
});
