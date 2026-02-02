require("dotenv").config();
const crypto = require("crypto");
const { hostname, platform } = require("os");

const apiKey = process.env.API_KEY;
const projectId = process.env.PROJECT_ID;
const apiHost = normalizeHost(process.env.HOST || "https://yourapp.com");
const docsUrl = process.env.DOCS_URL || "https://yourapp.com/docs/payments";

function requireEnv() {
	if (!apiKey || !projectId) {
		console.error("Missing API key or project ID. Add them to your .env.");
		process.exit(1);
	}
}

function deviceFingerprint() {
	const raw = `${hostname()}-${platform()}`;
	return crypto.createHash("sha256").update(raw).digest("hex");
}

async function startInstall() {
	requireEnv();
	const version = process.env.npm_package_version || "0.0.0";
	console.log(`Validating install against ${apiHost}.`);
	const response = await fetch(`${apiHost}/api/install/start`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			projectId,
			apiKey,
			version,
			deviceId: deviceFingerprint(),
		}),
	});

	if (response.status === 200) {
		console.log("Install allowed.");
		return;
	}

	if (response.status === 402) {
		const payload = await response.json();
		const price = payload.payment?.price ?? "0";
		const session = payload.payment?.sessionToken ?? "n/a";
		const payUrl =
			session && apiHost
				? `${apiHost}/pay?session=${session}`
				: (docsUrl ?? "not provided");
		console.error("");
		console.error("");
		console.error("");
		console.error("");
		console.error("");
		console.error(
			"======================= PAYMENT REQUIRED ==========================================",
		);
		console.error(`Price: ${price}`);
		console.error(`Pay here: ${payUrl}`);
		console.error("After payment, rerun npm install.");
		console.error(
			"======================= END ==========================================",
		);
		console.error("");
		console.error("");
		console.error("");
		console.error("");

		process.exit(1);
	}

	const text = await response.text();
	console.error("Unexpected response:", text);
	process.exit(1);
}

startInstall().catch((error) => {
	console.error("preinstall failed:", error);
	process.exit(1);
});

function normalizeHost(host) {
	return host.replace(/[/.]+$/, "").replace(/\/+$/, "");
}
