const http = require("http");

const HOST = "127.0.0.1";
const PORT = 5000;
const RUNS = 5;

const request = (method, path, body, token) =>
  new Promise((resolve) => {
    const headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = "Bearer " + token;

    const start = process.hrtime.bigint();

    const req = http.request(
      { hostname: HOST, port: PORT, path, method, headers },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          const end = process.hrtime.bigint();
          const ms = Number(end - start) / 1e6;
          resolve({
            statusCode: res.statusCode,
            responseTimeMs: parseFloat(ms.toFixed(2)),
            body: data,
          });
        });
      }
    );

    req.on("error", (err) => {
      const end = process.hrtime.bigint();
      const ms = Number(end - start) / 1e6;
      resolve({
        statusCode: 0,
        responseTimeMs: parseFloat(ms.toFixed(2)),
        error: err.message,
      });
    });

    if (body) req.write(JSON.stringify(body));
    req.end();
  });

const runBenchmark = async (label, method, path, body, token) => {
  const results = [];

  for (let i = 0; i < RUNS; i++) {
    const result = await request(method, path, body, token);
    results.push(result);
  }

  const avgMs =
    results.reduce((sum, r) => sum + r.responseTimeMs, 0) / results.length;
  const minMs = Math.min(...results.map((r) => r.responseTimeMs));
  const maxMs = Math.max(...results.map((r) => r.responseTimeMs));
  const statuses = results.map((r) => r.statusCode);
  const allOk = statuses.every((s) => s >= 200 && s < 300);

  return {
    endpoint: `${method} ${path}`,
    avgMs: parseFloat(avgMs.toFixed(2)),
    minMs: parseFloat(minMs.toFixed(2)),
    maxMs: parseFloat(maxMs.toFixed(2)),
    statusCodes: statuses.join(", "),
    allOk,
  };
};

const formatTable = (rows) => {
  const headers = [
    "Endpoint",
    "Avg (ms)",
    "Min (ms)",
    "Max (ms)",
    "Status Codes",
    "OK?",
  ];

  const colWidths = headers.map((h, i) => {
    const maxDataLen = Math.max(...rows.map((r) => String(r[Object.keys(r)[i]]).length));
    return Math.max(h.length, maxDataLen) + 2;
  });

  const separator = "+" + colWidths.map((w) => "-".repeat(w)).join("+") + "+";

  const pad = (str, width) => (" " + String(str)).padEnd(width - 1) + " ";

  const headerLine =
    "|" + headers.map((h, i) => pad(h, colWidths[i])).join("|") + "|";

  const dataLines = rows.map((row) => {
    const vals = [
      row.endpoint,
      row.avgMs,
      row.minMs,
      row.maxMs,
      row.statusCodes,
      row.allOk ? "Yes" : "No",
    ];
    return "|" + vals.map((v, i) => pad(v, colWidths[i])).join("|") + "|";
  });

  return [separator, headerLine, separator, ...dataLines, separator].join("\n");
};

(async () => {
  console.log("=".repeat(70));
  console.log("  Urban Farming API — Benchmark");
  console.log("  Server: http://" + HOST + ":" + PORT);
  console.log("  Runs per endpoint: " + RUNS);
  console.log("=".repeat(70));

  // Step 1: Login to get token
  console.log("\nAuthenticating...");
  const loginRes = await request("POST", "/api/v1/auth/login", {
    email: "customer1@urbanfarm.com",
    password: "Customer@1234",
  });

  if (loginRes.statusCode !== 200) {
    console.error("Login failed:", loginRes.statusCode, loginRes.body);
    console.error("Make sure the server is running and the database is seeded.");
    process.exit(1);
  }

  const token = JSON.parse(loginRes.body).data.token;
  console.log("Authenticated as customer1@urbanfarm.com\n");

  // Step 2: Run benchmarks
  const benchmarks = [
    () => runBenchmark("Login", "POST", "/api/v1/auth/login", {
      email: "customer1@urbanfarm.com",
      password: "Customer@1234",
    }),
    () => runBenchmark("Produce List", "GET", "/api/v1/produce"),
    () => runBenchmark("Rental Spaces", "GET", "/api/v1/rentals"),
    () => runBenchmark("Forum Posts", "GET", "/api/v1/forum"),
    () => runBenchmark("My Orders", "GET", "/api/v1/orders/my", null, token),
  ];

  const rows = [];
  for (const bench of benchmarks) {
    const result = await bench();
    rows.push(result);
    process.stdout.write(".");
  }

  // Summary
  const overallAvg =
    rows.reduce((sum, r) => sum + r.avgMs, 0) / rows.length;

  console.log("\n\n" + formatTable(rows));
  console.log("\n  Overall average response time: " + overallAvg.toFixed(2) + " ms");
  console.log("  All endpoints healthy: " + (rows.every((r) => r.allOk) ? "Yes" : "No"));
  console.log();
})();
